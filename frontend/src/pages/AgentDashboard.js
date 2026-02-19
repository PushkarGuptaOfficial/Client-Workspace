import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageCircle, Send, Paperclip, Moon, Sun, LogOut,
  Clock, User, Loader2, Search, X, ChevronLeft
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { ScrollArea } from '../components/ui/scroll-area';
import { Badge } from '../components/ui/badge';
import { useTheme } from '../context/ThemeContext';
import { toast } from 'sonner';
import axios from 'axios';
import { playNotificationDebounced } from '../utils/audio';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AgentDashboard() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  
  const [agent, setAgent] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingPreview, setPendingPreview] = useState(null);
  const [visitorTyping, setVisitorTyping] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const selectedSessionRef = useRef(null);

  // Keep ref in sync with state
  useEffect(() => {
    selectedSessionRef.current = selectedSession;
  }, [selectedSession]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem('agent_token');
    const agentData = localStorage.getItem('agent_data');
    
    if (!token || !agentData) {
      navigate('/agent/login');
      return;
    }
    
    setAgent(JSON.parse(agentData));
  }, [navigate]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Fetch sessions
  useEffect(() => {
    if (!agent) return;

    const fetchSessions = async () => {
      try {
        const res = await axios.get(`${API}/sessions`);
        setSessions(res.data);
      } catch (error) {
        console.error('Error fetching sessions:', error);
      }
    };

    fetchSessions();
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, [agent]);

  // WebSocket connection - only reconnect when agent changes, not session
  useEffect(() => {
    if (!agent) return;

    const wsUrl = `${process.env.REACT_APP_BACKEND_URL.replace('http', 'ws')}/api/ws/agent/${agent.id}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const currentSession = selectedSessionRef.current;
      
      if (data.type === 'new_message') {
        // Only add to messages if it's for current session AND from visitor
        if (data.session_id === currentSession?.id && data.message.sender_type === 'visitor') {
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === data.message.id)) return prev;
            return [...prev, data.message];
          });
          setVisitorTyping(false);
        }
        
        // Update session list
        setSessions(prev => prev.map(s => 
          s.id === data.session_id 
            ? { ...s, last_message: data.message.content?.substring(0, 100), updated_at: new Date().toISOString(), unread_count: (s.unread_count || 0) + (data.message.sender_type === 'visitor' ? 1 : 0) }
            : s
        ));

        // Play sound and show notification for visitor messages
        if (data.message.sender_type === 'visitor') {
          playNotificationDebounced('visitor');
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New Message', { body: data.message.content });
          }
        }
      } else if (data.type === 'new_session') {
        setSessions(prev => [data.session, ...prev]);
        toast.info(`New chat from ${data.session.visitor_name || 'Visitor'}`);
        playNotificationDebounced('visitor');
      } else if (data.type === 'session_updated' || data.type === 'session_closed') {
        setSessions(prev => prev.map(s => s.id === data.session.id ? data.session : s));
      } else if (data.type === 'visitor_typing' && data.session_id === currentSession?.id) {
        setVisitorTyping(true);
        setTimeout(() => setVisitorTyping(false), 3000);
      }
    };

    ws.onclose = () => setIsConnected(false);
    wsRef.current = ws;

    return () => ws.close();
  }, [agent]);

  // Load messages when session selected
  useEffect(() => {
    if (!selectedSession) return;

    const fetchMessages = async () => {
      try {
        const res = await axios.get(`${API}/sessions/${selectedSession.id}/messages`);
        setMessages(res.data);
        await axios.put(`${API}/sessions/${selectedSession.id}/read`);
        setSessions(prev => prev.map(s => s.id === selectedSession.id ? { ...s, unread_count: 0 } : s));
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();
  }, [selectedSession?.id]);

  const sendMessage = async (e) => {
    e?.preventDefault();
    if ((!newMessage.trim() && !pendingFile) || !wsRef.current || !isConnected || !selectedSession) return;

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

        wsRef.current.send(JSON.stringify({
          type: 'message',
          session_id: selectedSession.id,
          content,
          message_type: file_type,
          file_url,
          file_name
        }));

        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender_type: 'agent',
          sender_id: agent.id,
          sender_name: agent.name,
          content,
          message_type: file_type,
          file_url,
          file_name,
          created_at: new Date().toISOString()
        }]);

        clearPendingFile();
        setNewMessage('');
      } catch (error) {
        toast.error('Failed to upload file');
      } finally {
        setUploading(false);
      }
    } else {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        session_id: selectedSession.id,
        content: newMessage.trim(),
        message_type: 'text'
      }));
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender_type: 'agent',
        sender_id: agent.id,
        sender_name: agent.name,
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
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large (max 10MB)');
      return;
    }
    setPendingFile(file);
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

  const assignToMe = async (sessionId) => {
    try {
      await axios.put(`${API}/sessions/${sessionId}/assign`, { agent_id: agent.id });
      toast.success('Chat assigned to you');
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, assigned_agent_id: agent.id, status: 'active' } : s));
      if (selectedSession?.id === sessionId) {
        setSelectedSession(prev => ({ ...prev, assigned_agent_id: agent.id, status: 'active' }));
      }
    } catch (error) {
      toast.error('Failed to assign chat');
    }
  };

  const closeSession = async (sessionId) => {
    try {
      await axios.put(`${API}/sessions/${sessionId}/close`);
      toast.success('Chat closed');
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: 'closed' } : s));
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null);
        setMessages([]);
        setMobileShowChat(false);
      }
    } catch (error) {
      toast.error('Failed to close chat');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('agent_token');
    localStorage.removeItem('agent_data');
    navigate('/agent/login');
  };

  const selectSession = (session) => {
    setSelectedSession(session);
    setMobileShowChat(true);
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const filteredSessions = sessions
    .filter(s => !searchQuery || s.visitor_name?.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  const getStatusColor = (status) => {
    switch (status) {
      case 'waiting': return 'bg-amber-500';
      case 'active': return 'bg-emerald-500';
      default: return 'bg-neutral-400';
    }
  };

  if (!agent) return null;

  return (
    <div className="h-screen flex bg-background" data-testid="agent-dashboard">
      {/* Sidebar - Session List */}
      <aside className={`w-full md:w-80 lg:w-96 border-r flex flex-col ${mobileShowChat ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-heading font-bold">Inbox</h1>
                <p className="text-xs text-muted-foreground">{agent.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full h-8 w-8">
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-full h-8 w-8 text-destructive">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 rounded-full bg-muted/50"
              data-testid="search-input"
            />
          </div>
        </div>

        {/* Session List */}
        <ScrollArea className="flex-1">
          {filteredSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <MessageCircle className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm">No conversations yet</p>
            </div>
          ) : (
            <div className="p-2">
              {filteredSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => selectSession(session)}
                  className={`p-3 rounded-xl cursor-pointer transition-colors mb-1 ${
                    selectedSession?.id === session.id 
                      ? 'bg-primary/10 border border-primary/20' 
                      : 'hover:bg-muted/50'
                  }`}
                  data-testid={`session-${session.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar className="w-11 h-11">
                        <AvatarFallback className="bg-muted text-muted-foreground font-medium">
                          {session.visitor_name?.[0]?.toUpperCase() || 'V'}
                        </AvatarFallback>
                      </Avatar>
                      <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${getStatusColor(session.status)}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm truncate">
                          {session.visitor_name || 'Visitor'}
                        </span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatTime(session.updated_at)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {session.last_message || 'No messages yet'}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        {session.status === 'waiting' && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-amber-50 text-amber-600 border-amber-200">
                            <Clock className="w-3 h-3 mr-1" /> Waiting
                          </Badge>
                        )}
                        {session.unread_count > 0 && (
                          <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-semibold bg-primary text-primary-foreground rounded-full">
                            {session.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </aside>

      {/* Chat Area */}
      <main className={`flex-1 flex flex-col ${!mobileShowChat ? 'hidden md:flex' : 'flex'}`}>
        {selectedSession ? (
          <>
            {/* Chat Header */}
            <header className="px-4 py-3 border-b flex items-center justify-between bg-background">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="md:hidden rounded-full"
                  onClick={() => setMobileShowChat(false)}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-muted">
                    {selectedSession.visitor_name?.[0]?.toUpperCase() || 'V'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-heading font-semibold">{selectedSession.visitor_name || 'Visitor'}</h2>
                  <p className="text-xs text-muted-foreground">
                    {selectedSession.status === 'active' ? 'Active conversation' : 
                     selectedSession.status === 'waiting' ? 'Waiting for response' : 'Closed'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {selectedSession.status === 'waiting' && (
                  <Button size="sm" onClick={() => assignToMe(selectedSession.id)} className="rounded-full" data-testid="take-chat-btn">
                    <User className="w-4 h-4 mr-1.5" /> Take Chat
                  </Button>
                )}
                {selectedSession.status !== 'closed' && (
                  <Button size="sm" variant="outline" onClick={() => closeSession(selectedSession.id)} className="rounded-full text-destructive" data-testid="close-chat-btn">
                    Close
                  </Button>
                )}
              </div>
            </header>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="messages-container max-w-2xl mx-auto py-2">
                {messages.map((msg, idx) => (
                  <div
                    key={msg.id || idx}
                    className={`message-row ${msg.sender_type === 'agent' ? 'justify-end' : 'justify-start'} message-enter`}
                  >
                    {msg.sender_type === 'visitor' && (
                      <Avatar className="w-8 h-8 mr-2 mt-1 shrink-0">
                        <AvatarFallback className="bg-muted text-xs">
                          {selectedSession.visitor_name?.[0] || 'V'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div className={msg.sender_type === 'agent' ? 'chat-bubble-visitor' : 'chat-bubble-agent'}>
                      {msg.message_type === 'image' && msg.file_url && (
                        <img
                          src={`${process.env.REACT_APP_BACKEND_URL}${msg.file_url}`}
                          alt="Shared"
                          className="rounded-lg max-w-[200px] mb-2"
                        />
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
                      
                      {msg.message_type === 'text' && <p className="text-sm">{msg.content}</p>}
                      
                      <p className={`text-[10px] mt-1.5 ${msg.sender_type === 'agent' ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                
                {visitorTyping && (
                  <div className="message-row justify-start">
                    <Avatar className="w-8 h-8 mr-2 mt-1 shrink-0">
                      <AvatarFallback className="bg-muted text-xs">{selectedSession.visitor_name?.[0] || 'V'}</AvatarFallback>
                    </Avatar>
                    <div className="chat-bubble-agent">
                      <div className="typing-indicator"><span></span><span></span><span></span></div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            {selectedSession.status !== 'closed' && selectedSession.assigned_agent_id === agent.id && (
              <div className="p-4 border-t bg-background">
                {pendingFile && (
                  <div className="max-w-2xl mx-auto mb-2">
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-xl">
                      {pendingPreview ? (
                        <img src={pendingPreview} alt="Preview" className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Paperclip className="w-4 h-4 text-primary" />
                        </div>
                      )}
                      <span className="flex-1 text-sm truncate">{pendingFile.name}</span>
                      <Button variant="ghost" size="icon" onClick={clearPendingFile} className="rounded-full h-8 w-8">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
                
                <form onSubmit={sendMessage} className="max-w-2xl mx-auto flex items-center gap-2">
                  <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,.pdf,.doc,.docx,.txt" />
                  
                  <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="rounded-full shrink-0">
                    {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                  </Button>
                  
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 h-11 rounded-full"
                    data-testid="message-input"
                  />
                  
                  <Button type="submit" disabled={(!newMessage.trim() && !pendingFile) || uploading} className="rounded-full h-11 w-11 shrink-0" data-testid="send-btn">
                    <Send className="w-5 h-5" />
                  </Button>
                </form>
              </div>
            )}

            {selectedSession.status === 'waiting' && !selectedSession.assigned_agent_id && (
              <div className="p-4 bg-amber-50 border-t border-amber-100 text-center">
                <p className="text-sm text-amber-700">Click "Take Chat" to start responding</p>
              </div>
            )}

            {selectedSession.status === 'closed' && (
              <div className="p-4 bg-muted text-center">
                <p className="text-sm text-muted-foreground">This conversation has been closed</p>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="font-heading text-lg font-semibold mb-1">Select a conversation</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              Choose a chat from the list to view messages and respond
            </p>
            
            <div className="flex gap-6 mt-8">
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <p className="text-2xl font-bold">{sessions.filter(s => s.status === 'waiting').length}</p>
                <p className="text-xs text-muted-foreground">Waiting</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-2">
                  <MessageCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-2xl font-bold">{sessions.filter(s => s.status === 'active').length}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
