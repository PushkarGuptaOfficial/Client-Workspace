import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { MessageCircle, Send, Paperclip, Image, X, Moon, Sun, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { ScrollArea } from '../components/ui/scroll-area';
import { useTheme } from '../context/ThemeContext';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STORAGE_KEYS = {
  VISITOR_ID: 'chat_visitor_id',
  SESSION_ID: 'chat_session_id',
  VISITOR_NAME: 'chat_visitor_name'
};

export default function VisitorChat() {
  const { sessionId: urlSessionId } = useParams();
  const { theme, toggleTheme } = useTheme();
  const [visitorId, setVisitorId] = useState(null);
  const [visitorName, setVisitorName] = useState('');
  const [sessionId, setSessionId] = useState(urlSessionId || null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [agentName, setAgentName] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showNameInput, setShowNameInput] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingPreview, setPendingPreview] = useState(null);
  const [isRestoring, setIsRestoring] = useState(true);
  
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      const storedVisitorId = localStorage.getItem(STORAGE_KEYS.VISITOR_ID);
      const storedSessionId = urlSessionId || localStorage.getItem(STORAGE_KEYS.SESSION_ID);
      const storedName = localStorage.getItem(STORAGE_KEYS.VISITOR_NAME);

      if (storedVisitorId && storedSessionId) {
        try {
          // Verify session exists and is not closed
          const sessionRes = await axios.get(`${API}/sessions/${storedSessionId}`);
          const session = sessionRes.data;
          
          if (session && session.status !== 'closed') {
            setVisitorId(storedVisitorId);
            setSessionId(storedSessionId);
            setVisitorName(storedName || 'Visitor');
            setShowNameInput(false);

            // Load messages
            const messagesRes = await axios.get(`${API}/sessions/${storedSessionId}/messages`);
            setMessages(messagesRes.data);

            // Check if agent is assigned
            if (session.assigned_agent_id) {
              const agentsRes = await axios.get(`${API}/agents`);
              const agent = agentsRes.data.find(a => a.id === session.assigned_agent_id);
              if (agent) setAgentName(agent.name);
            }

            // Connect WebSocket
            connectWebSocket(storedSessionId, storedVisitorId);
          } else {
            // Session closed, clear storage
            clearStoredSession();
          }
        } catch (error) {
          console.error('Error restoring session:', error);
          clearStoredSession();
        }
      }
      setIsRestoring(false);
    };

    restoreSession();
  }, [urlSessionId]);

  const clearStoredSession = () => {
    localStorage.removeItem(STORAGE_KEYS.VISITOR_ID);
    localStorage.removeItem(STORAGE_KEYS.SESSION_ID);
    localStorage.removeItem(STORAGE_KEYS.VISITOR_NAME);
  };

  const saveSession = (vId, sId, name) => {
    localStorage.setItem(STORAGE_KEYS.VISITOR_ID, vId);
    localStorage.setItem(STORAGE_KEYS.SESSION_ID, sId);
    localStorage.setItem(STORAGE_KEYS.VISITOR_NAME, name);
  };

  // Initialize visitor and session
  const startChat = async () => {
    if (!visitorName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    try {
      // Create visitor
      const visitorRes = await axios.post(`${API}/visitors`, {
        name: visitorName,
        source: 'whatsapp'
      });
      const visitor = visitorRes.data;
      setVisitorId(visitor.id);

      // Create session
      const sessionRes = await axios.post(`${API}/sessions?visitor_id=${visitor.id}&visitor_name=${visitorName}`);
      const session = sessionRes.data;
      setSessionId(session.id);
      setShowNameInput(false);

      // Save to localStorage
      saveSession(visitor.id, session.id, visitorName);

      // Load existing messages (in case session already had messages)
      const messagesRes = await axios.get(`${API}/sessions/${session.id}/messages`);
      setMessages(messagesRes.data);

      // Connect WebSocket
      connectWebSocket(session.id, visitor.id);
      
      toast.success('Connected! An agent will be with you shortly.');
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error('Failed to start chat. Please try again.');
    }
  };

  const connectWebSocket = useCallback((sid, vid) => {
    const wsUrl = `${process.env.REACT_APP_BACKEND_URL.replace('http', 'ws')}/api/ws/visitor/${sid}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'new_message') {
        setMessages(prev => [...prev, data.message]);
        setIsTyping(false);
      } else if (data.type === 'agent_joined') {
        setAgentName(data.agent_name);
        toast.success(`${data.agent_name} joined the chat`);
      } else if (data.type === 'agent_typing') {
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 3000);
      } else if (data.type === 'session_closed') {
        toast.info('Chat session has been closed');
        setIsConnected(false);
        clearStoredSession();
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('WebSocket disconnected');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const sendMessage = async (e) => {
    e?.preventDefault();
    if ((!newMessage.trim() && !pendingFile) || !wsRef.current || !isConnected) return;

    // If there's a pending file, upload it first
    if (pendingFile) {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', pendingFile);

      try {
        const res = await axios.post(`${API}/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        const { file_url, file_name, file_type } = res.data;
        const content = newMessage.trim() || (file_type === 'image' ? 'Shared an image' : `Shared file: ${file_name}`);

        const messageData = {
          type: 'message',
          visitor_id: visitorId,
          sender_name: visitorName,
          content,
          message_type: file_type,
          file_url,
          file_name
        };

        wsRef.current.send(JSON.stringify(messageData));

        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender_type: 'visitor',
          sender_name: visitorName,
          content,
          message_type: file_type,
          file_url,
          file_name,
          created_at: new Date().toISOString()
        }]);

        clearPendingFile();
        setNewMessage('');
      } catch (error) {
        console.error('Upload error:', error);
        toast.error('Failed to upload file');
      } finally {
        setUploading(false);
      }
    } else {
      // Text only message
      const messageData = {
        type: 'message',
        visitor_id: visitorId,
        sender_name: visitorName,
        content: newMessage.trim(),
        message_type: 'text'
      };

      wsRef.current.send(JSON.stringify(messageData));
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender_type: 'visitor',
        sender_name: visitorName,
        content: newMessage.trim(),
        message_type: 'text',
        created_at: new Date().toISOString()
      }]);

      setNewMessage('');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File too large. Maximum size is 10MB.');
      return;
    }

    setPendingFile(file);
    
    // Create preview for images
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (imageExts.includes(ext)) {
      const reader = new FileReader();
      reader.onload = (e) => setPendingPreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setPendingPreview(null);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearPendingFile = () => {
    setPendingFile(null);
    setPendingPreview(null);
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="visitor-chat bg-background" data-testid="visitor-chat">
      {/* Loading State */}
      {isRestoring ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Header */}
          <header className="glass-header sticky top-0 z-10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-foreground">24gameapi</h1>
            <p className="text-xs text-muted-foreground">
              {isConnected ? (
                agentName ? `Chatting with ${agentName}` : 'Waiting for agent...'
              ) : (
                'Start a conversation'
              )}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          data-testid="theme-toggle"
          className="rounded-full"
        >
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </Button>
      </header>

          {/* Name Input Screen */}
          {showNameInput ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
              <MessageCircle className="w-10 h-10 text-primary" />
            </div>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-2">
              Welcome to 24gameapi
            </h2>
            <p className="text-muted-foreground">
              Enter your name to start chatting with our team
            </p>
          </div>
          
          <div className="w-full max-w-sm space-y-4">
            <Input
              placeholder="Your name"
              value={visitorName}
              onChange={(e) => setVisitorName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && startChat()}
              data-testid="visitor-name-input"
              className="h-12 text-center"
            />
            <Button
              onClick={startChat}
              className="w-full h-12 rounded-full font-medium"
              data-testid="start-chat-btn"
            >
              Start Chat
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4" data-testid="messages-area">
            <div className="messages-container max-w-2xl mx-auto py-2">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    Send a message to start the conversation
                  </p>
                </div>
              )}
              
              {messages.map((msg, idx) => (
                <div
                  key={msg.id || idx}
                  className={`message-row ${msg.sender_type === 'visitor' ? 'justify-end' : 'justify-start'} message-enter`}
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  {msg.sender_type === 'agent' && (
                    <Avatar className="w-8 h-8 mr-2 mt-1">
                      <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                        {msg.sender_name?.[0] || 'A'}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className={msg.sender_type === 'visitor' ? 'chat-bubble-visitor' : 'chat-bubble-agent'}>
                    {msg.sender_type === 'agent' && (
                      <p className="text-xs font-medium text-primary mb-1">{msg.sender_name}</p>
                    )}
                    
                    {msg.message_type === 'image' && msg.file_url && (
                      <div className="file-preview mb-2">
                        <img
                          src={`${process.env.REACT_APP_BACKEND_URL}${msg.file_url}`}
                          alt="Shared"
                          className="rounded-lg max-w-full"
                        />
                      </div>
                    )}
                    
                    {msg.message_type === 'file' && msg.file_url && (
                      <a
                        href={`${process.env.REACT_APP_BACKEND_URL}${msg.file_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm underline"
                      >
                        <Paperclip className="w-4 h-4" />
                        {msg.file_name}
                      </a>
                    )}
                    
                    {msg.message_type === 'text' && (
                      <p className="text-sm">{msg.content}</p>
                    )}
                    
                    <p className={`text-xs mt-1 ${msg.sender_type === 'visitor' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="message-row justify-start">
                  <div className="chat-bubble-agent">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="glass-input sticky bottom-0 p-4">
            {/* Pending File Preview */}
            {pendingFile && (
              <div className="max-w-2xl mx-auto mb-2">
                <div className="flex items-center gap-2 p-2 bg-muted rounded-xl">
                  {pendingPreview ? (
                    <img src={pendingPreview} alt="Preview" className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Paperclip className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  <span className="flex-1 text-sm truncate">{pendingFile.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={clearPendingFile}
                    data-testid="remove-file-btn"
                    className="rounded-full h-8 w-8 shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
            
            <form onSubmit={sendMessage} className="max-w-2xl mx-auto flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.txt"
              />
              
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={!isConnected || uploading}
                data-testid="attach-file-btn"
                className="rounded-full shrink-0"
              >
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Paperclip className="w-5 h-5" />
                )}
              </Button>
              
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={isConnected ? "Type a message..." : "Connecting..."}
                disabled={!isConnected}
                data-testid="message-input"
                className="flex-1 h-12 rounded-full"
              />
              
              <Button
                type="submit"
                disabled={(!newMessage.trim() && !pendingFile) || !isConnected || uploading}
                data-testid="send-message-btn"
                className="rounded-full h-12 w-12 shrink-0"
              >
                <Send className="w-5 h-5" />
              </Button>
            </form>
          </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
