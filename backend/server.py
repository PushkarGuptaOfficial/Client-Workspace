from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File, Depends, status
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import json
import bcrypt
import jwt
from jwt.exceptions import InvalidTokenError
import aiofiles
import shutil

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Secret
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-super-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"

# File upload directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class VisitorCreate(BaseModel):
    name: Optional[str] = None
    source: Optional[str] = "whatsapp"

class Visitor(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: Optional[str] = None
    source: str = "whatsapp"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    last_active: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class AgentCreate(BaseModel):
    email: str
    password: str
    name: str
    role: str = "agent"

class AgentLogin(BaseModel):
    email: str
    password: str

class Agent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    role: str = "agent"
    is_online: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class AgentResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    is_online: bool

class ChatSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    visitor_id: str
    visitor_name: Optional[str] = None
    assigned_agent_id: Optional[str] = None
    status: str = "waiting"  # waiting, active, closed
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    last_message: Optional[str] = None
    unread_count: int = 0

class Message(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    sender_type: str  # visitor, agent
    sender_id: str
    sender_name: Optional[str] = None
    content: str
    message_type: str = "text"  # text, image, file
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    is_read: bool = False

class MessageCreate(BaseModel):
    content: str
    message_type: str = "text"
    file_url: Optional[str] = None
    file_name: Optional[str] = None

class AssignAgent(BaseModel):
    agent_id: str

# ==================== CONNECTION MANAGER ====================

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {
            "visitors": {},
            "agents": {}
        }
    
    async def connect_visitor(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections["visitors"][session_id] = websocket
        logger.info(f"Visitor connected: {session_id}")
    
    async def connect_agent(self, agent_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections["agents"][agent_id] = websocket
        logger.info(f"Agent connected: {agent_id}")
        # Update agent online status
        await db.agents.update_one(
            {"id": agent_id},
            {"$set": {"is_online": True}}
        )
    
    def disconnect_visitor(self, session_id: str):
        if session_id in self.active_connections["visitors"]:
            del self.active_connections["visitors"][session_id]
            logger.info(f"Visitor disconnected: {session_id}")
    
    async def disconnect_agent(self, agent_id: str):
        if agent_id in self.active_connections["agents"]:
            del self.active_connections["agents"][agent_id]
            logger.info(f"Agent disconnected: {agent_id}")
            # Update agent offline status
            await db.agents.update_one(
                {"id": agent_id},
                {"$set": {"is_online": False}}
            )
    
    async def send_to_visitor(self, session_id: str, message: dict):
        if session_id in self.active_connections["visitors"]:
            try:
                await self.active_connections["visitors"][session_id].send_json(message)
            except Exception as e:
                logger.error(f"Error sending to visitor {session_id}: {e}")
    
    async def send_to_agent(self, agent_id: str, message: dict):
        if agent_id in self.active_connections["agents"]:
            try:
                await self.active_connections["agents"][agent_id].send_json(message)
            except Exception as e:
                logger.error(f"Error sending to agent {agent_id}: {e}")
    
    async def broadcast_to_agents(self, message: dict):
        for agent_id, websocket in self.active_connections["agents"].items():
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to agent {agent_id}: {e}")

manager = ConnectionManager()

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(agent_id: str, email: str) -> str:
    payload = {
        "agent_id": agent_id,
        "email": email,
        "exp": datetime.now(timezone.utc).timestamp() + 86400 * 7  # 7 days
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_agent(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        agent = await db.agents.find_one({"id": payload["agent_id"]}, {"_id": 0, "password_hash": 0})
        return agent
    except InvalidTokenError:
        return None

# ==================== VISITOR ENDPOINTS ====================

@api_router.post("/visitors", response_model=Visitor)
async def create_visitor(visitor_data: VisitorCreate):
    visitor = Visitor(
        name=visitor_data.name,
        source=visitor_data.source or "whatsapp"
    )
    doc = visitor.model_dump()
    await db.visitors.insert_one(doc)
    return visitor

@api_router.get("/visitors/{visitor_id}", response_model=Visitor)
async def get_visitor(visitor_id: str):
    visitor = await db.visitors.find_one({"id": visitor_id}, {"_id": 0})
    if not visitor:
        raise HTTPException(status_code=404, detail="Visitor not found")
    return visitor

# ==================== CHAT SESSION ENDPOINTS ====================

@api_router.post("/sessions", response_model=ChatSession)
async def create_session(visitor_id: str, visitor_name: Optional[str] = None):
    # Check if visitor has an active session
    existing = await db.chat_sessions.find_one(
        {"visitor_id": visitor_id, "status": {"$in": ["waiting", "active"]}},
        {"_id": 0}
    )
    if existing:
        return ChatSession(**existing)
    
    session = ChatSession(
        visitor_id=visitor_id,
        visitor_name=visitor_name,
        status="waiting"
    )
    doc = session.model_dump()
    await db.chat_sessions.insert_one(doc)
    
    # Notify all agents about new session
    await manager.broadcast_to_agents({
        "type": "new_session",
        "session": doc
    })
    
    return session

@api_router.get("/sessions/{session_id}", response_model=ChatSession)
async def get_session(session_id: str):
    session = await db.chat_sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@api_router.get("/sessions", response_model=List[ChatSession])
async def get_all_sessions(status: Optional[str] = None, agent_id: Optional[str] = None):
    query = {}
    if status:
        query["status"] = status
    if agent_id:
        query["assigned_agent_id"] = agent_id
    
    sessions = await db.chat_sessions.find(query, {"_id": 0}).sort("updated_at", -1).to_list(100)
    return sessions

@api_router.put("/sessions/{session_id}/assign", response_model=ChatSession)
async def assign_session(session_id: str, assign_data: AssignAgent):
    agent = await db.agents.find_one({"id": assign_data.agent_id}, {"_id": 0})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    result = await db.chat_sessions.update_one(
        {"id": session_id},
        {"$set": {
            "assigned_agent_id": assign_data.agent_id,
            "status": "active",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = await db.chat_sessions.find_one({"id": session_id}, {"_id": 0})
    
    # Notify visitor that agent joined
    await manager.send_to_visitor(session_id, {
        "type": "agent_joined",
        "agent_name": agent.get("name", "Agent"),
        "session": session
    })
    
    # Notify all agents about session update
    await manager.broadcast_to_agents({
        "type": "session_updated",
        "session": session
    })
    
    return ChatSession(**session)

@api_router.put("/sessions/{session_id}/close", response_model=ChatSession)
async def close_session(session_id: str):
    result = await db.chat_sessions.update_one(
        {"id": session_id},
        {"$set": {
            "status": "closed",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = await db.chat_sessions.find_one({"id": session_id}, {"_id": 0})
    
    # Notify visitor
    await manager.send_to_visitor(session_id, {
        "type": "session_closed",
        "session": session
    })
    
    # Notify agents
    await manager.broadcast_to_agents({
        "type": "session_closed",
        "session": session
    })
    
    return ChatSession(**session)

# ==================== MESSAGE ENDPOINTS ====================

@api_router.get("/sessions/{session_id}/messages", response_model=List[Message])
async def get_messages(session_id: str, limit: int = 50):
    messages = await db.messages.find(
        {"session_id": session_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(limit)
    return messages

@api_router.post("/sessions/{session_id}/messages", response_model=Message)
async def create_message(
    session_id: str,
    message_data: MessageCreate,
    sender_type: str,
    sender_id: str,
    sender_name: Optional[str] = None
):
    session = await db.chat_sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    message = Message(
        session_id=session_id,
        sender_type=sender_type,
        sender_id=sender_id,
        sender_name=sender_name,
        content=message_data.content,
        message_type=message_data.message_type,
        file_url=message_data.file_url,
        file_name=message_data.file_name
    )
    
    doc = message.model_dump()
    await db.messages.insert_one(doc)
    
    # Update session
    await db.chat_sessions.update_one(
        {"id": session_id},
        {"$set": {
            "last_message": message_data.content[:100],
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        "$inc": {"unread_count": 1 if sender_type == "visitor" else 0}}
    )
    
    return message

@api_router.put("/sessions/{session_id}/read")
async def mark_messages_read(session_id: str):
    await db.messages.update_many(
        {"session_id": session_id, "is_read": False},
        {"$set": {"is_read": True}}
    )
    await db.chat_sessions.update_one(
        {"id": session_id},
        {"$set": {"unread_count": 0}}
    )
    return {"status": "ok"}

# ==================== AGENT ENDPOINTS ====================

@api_router.post("/agents/register", response_model=AgentResponse)
async def register_agent(agent_data: AgentCreate):
    # Check if email exists
    existing = await db.agents.find_one({"email": agent_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    agent = Agent(
        email=agent_data.email,
        name=agent_data.name,
        role=agent_data.role
    )
    
    doc = agent.model_dump()
    doc["password_hash"] = hash_password(agent_data.password)
    
    await db.agents.insert_one(doc)
    
    return AgentResponse(**agent.model_dump())

@api_router.post("/agents/login")
async def login_agent(login_data: AgentLogin):
    agent = await db.agents.find_one({"email": login_data.email}, {"_id": 0})
    if not agent:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(login_data.password, agent.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(agent["id"], agent["email"])
    
    return {
        "token": token,
        "agent": {
            "id": agent["id"],
            "email": agent["email"],
            "name": agent["name"],
            "role": agent["role"],
            "is_online": agent.get("is_online", False)
        }
    }

@api_router.get("/agents/me", response_model=AgentResponse)
async def get_current_agent_info(token: str):
    agent = await get_current_agent(token)
    if not agent:
        raise HTTPException(status_code=401, detail="Invalid token")
    return AgentResponse(**agent)

@api_router.get("/agents", response_model=List[AgentResponse])
async def get_all_agents():
    agents = await db.agents.find({}, {"_id": 0, "password_hash": 0}).to_list(100)
    return agents

@api_router.put("/agents/{agent_id}/status")
async def update_agent_status(agent_id: str, is_online: bool):
    result = await db.agents.update_one(
        {"id": agent_id},
        {"$set": {"is_online": is_online}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Agent not found")
    return {"status": "ok"}

# ==================== FILE UPLOAD ====================

@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    # Validate file size (max 10MB)
    MAX_SIZE = 10 * 1024 * 1024
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    
    # Generate unique filename
    ext = Path(file.filename).suffix if file.filename else ""
    unique_filename = f"{uuid.uuid4()}{ext}"
    file_path = UPLOAD_DIR / unique_filename
    
    # Save file
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(content)
    
    # Determine file type
    image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    file_type = "image" if ext.lower() in image_extensions else "file"
    
    return {
        "file_url": f"/api/uploads/{unique_filename}",
        "file_name": file.filename,
        "file_type": file_type
    }

# ==================== WEBSOCKET ENDPOINTS ====================

@api_router.websocket("/ws/visitor/{session_id}")
async def visitor_websocket(websocket: WebSocket, session_id: str):
    await manager.connect_visitor(session_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            
            if data.get("type") == "message":
                # Create message in DB
                message = Message(
                    session_id=session_id,
                    sender_type="visitor",
                    sender_id=data.get("visitor_id", ""),
                    sender_name=data.get("sender_name"),
                    content=data.get("content", ""),
                    message_type=data.get("message_type", "text"),
                    file_url=data.get("file_url"),
                    file_name=data.get("file_name")
                )
                
                doc = message.model_dump()
                await db.messages.insert_one(doc)
                
                # Remove _id for JSON serialization
                doc.pop('_id', None)
                
                # Update session
                session = await db.chat_sessions.find_one({"id": session_id}, {"_id": 0})
                if session:
                    await db.chat_sessions.update_one(
                        {"id": session_id},
                        {"$set": {
                            "last_message": data.get("content", "")[:100],
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        },
                        "$inc": {"unread_count": 1}}
                    )
                    
                    # Send to assigned agent
                    if session.get("assigned_agent_id"):
                        await manager.send_to_agent(session["assigned_agent_id"], {
                            "type": "new_message",
                            "message": doc,
                            "session_id": session_id
                        })
                    
                    # Broadcast to all agents for notification (new message event)
                    await manager.broadcast_to_agents({
                        "type": "new_message",
                        "message": doc,
                        "session_id": session_id
                    })
            
            elif data.get("type") == "typing":
                session = await db.chat_sessions.find_one({"id": session_id}, {"_id": 0})
                if session and session.get("assigned_agent_id"):
                    await manager.send_to_agent(session["assigned_agent_id"], {
                        "type": "visitor_typing",
                        "session_id": session_id
                    })
    
    except WebSocketDisconnect:
        manager.disconnect_visitor(session_id)

@api_router.websocket("/ws/agent/{agent_id}")
async def agent_websocket(websocket: WebSocket, agent_id: str):
    await manager.connect_agent(agent_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            
            if data.get("type") == "message":
                session_id = data.get("session_id")
                
                # Get agent info
                agent = await db.agents.find_one({"id": agent_id}, {"_id": 0, "password_hash": 0})
                
                # Create message in DB
                message = Message(
                    session_id=session_id,
                    sender_type="agent",
                    sender_id=agent_id,
                    sender_name=agent.get("name") if agent else "Agent",
                    content=data.get("content", ""),
                    message_type=data.get("message_type", "text"),
                    file_url=data.get("file_url"),
                    file_name=data.get("file_name")
                )
                
                doc = message.model_dump()
                await db.messages.insert_one(doc)
                
                # Remove _id for JSON serialization
                doc.pop('_id', None)
                
                # Update session
                await db.chat_sessions.update_one(
                    {"id": session_id},
                    {"$set": {
                        "last_message": data.get("content", "")[:100],
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                # Send to visitor
                await manager.send_to_visitor(session_id, {
                    "type": "new_message",
                    "message": doc
                })
                
                # Broadcast to other agents
                await manager.broadcast_to_agents({
                    "type": "new_message",
                    "message": doc,
                    "session_id": session_id
                })
            
            elif data.get("type") == "typing":
                session_id = data.get("session_id")
                await manager.send_to_visitor(session_id, {
                    "type": "agent_typing",
                    "session_id": session_id
                })
    
    except WebSocketDisconnect:
        await manager.disconnect_agent(agent_id)

# ==================== ROOT ENDPOINT ====================

@api_router.get("/")
async def root():
    return {"message": "24gameapi Chat API"}

# ==================== STATIC FILES & CONFIG ====================

# Include the router in the main app FIRST
app.include_router(api_router)

# Mount uploads directory AFTER router (so it doesn't catch all /api routes)
app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
