import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageCircle, Send, Paperclip, Moon, Sun, LogOut, Users, Clock,
  CheckCircle, XCircle, Bell, BellOff, User, Loader2, Search, MoreVertical, X
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { ScrollArea } from '../components/ui/scroll-area';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { useTheme } from '../context/ThemeContext';
import { toast } from 'sonner';
import axios from 'axios';

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
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [agents, setAgents] = useState([]);
  const [visitorTyping, setVisitorTyping] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingPreview, setPendingPreview] = useState(null);
  
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

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

  // Fetch sessions and agents
  useEffect(() => {
    if (!agent) return;

    const fetchData = async () => {
      try {
        const [sessionsRes, agentsRes] = await Promise.all([
          axios.get(`${API}/sessions`),
          axios.get(`${API}/agents`)
        ]);
        setSessions(sessionsRes.data);
        setAgents(agentsRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [agent]);

  // WebSocket connection
  useEffect(() => {
    if (!agent) return;

    const wsUrl = `${process.env.REACT_APP_BACKEND_URL.replace('http', 'ws')}/api/ws/agent/${agent.id}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      console.log('Agent WebSocket connected');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'new_message') {
        if (data.session_id === selectedSession?.id) {
          setMessages(prev => [...prev, data.message]);
          setVisitorTyping(false);
        }
        
        // Update session in list
        setSessions(prev => prev.map(s => 
          s.id === data.session_id 
            ? { ...s, last_message: data.message.content?.substring(0, 100), unread_count: s.unread_count + 1 }
            : s
        ));

        // Browser notification
        if (notificationsEnabled && data.message.sender_type === 'visitor') {
          showNotification('New Message', data.message.content);
        }
      } else if (data.type === 'new_session') {
        setSessions(prev => [data.session, ...prev]);
        if (notificationsEnabled) {
          showNotification('New Chat', `${data.session.visitor_name || 'Visitor'} started a chat`);
        }
        toast.info('New chat waiting for assignment');
      } else if (data.type === 'session_updated') {
        setSessions(prev => prev.map(s => s.id === data.session.id ? data.session : s));
      } else if (data.type === 'session_closed') {
        setSessions(prev => prev.map(s => s.id === data.session.id ? data.session : s));
        if (selectedSession?.id === data.session.id) {
          toast.info('This chat has been closed');
        }
      } else if (data.type === 'visitor_typing') {
        if (data.session_id === selectedSession?.id) {
          setVisitorTyping(true);
          setTimeout(() => setVisitorTyping(false), 3000);
        }
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('Agent WebSocket disconnected');
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [agent, selectedSession?.id, notificationsEnabled]);

  const showNotification = (title, body) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  };

  // Load messages when session selected
  useEffect(() => {
    if (!selectedSession) return;

    const fetchMessages = async () => {
      try {
        const res = await axios.get(`${API}/sessions/${selectedSession.id}/messages`);
        setMessages(res.data);
        
        // Mark as read
        await axios.put(`${API}/sessions/${selectedSession.id}/read`);
        setSessions(prev => prev.map(s => 
          s.id === selectedSession.id ? { ...s, unread_count: 0 } : s
        ));
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();
  }, [selectedSession?.id]);

  const sendMessage = async (e) => {
    e?.preventDefault();
    if ((!newMessage.trim() && !pendingFile) || !wsRef.current || !isConnected || !selectedSession) return;

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
          session_id: selectedSession.id,
          content,
          message_type: file_type,
          file_url,
          file_name
        };

        wsRef.current.send(JSON.stringify(messageData));

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
      // Text only message
      const messageData = {
        type: 'message',
        session_id: selectedSession.id,
        content: newMessage.trim(),
        message_type: 'text'
      };

      wsRef.current.send(JSON.stringify(messageData));
      
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
    if (!file || !selectedSession) return;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File too large. Maximum size is 10MB.');
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
      
      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, assigned_agent_id: agent.id, status: 'active' } : s
      ));
    } catch (error) {
      toast.error('Failed to assign chat');
    }
  };

  const closeSession = async (sessionId) => {
    try {
      await axios.put(`${API}/sessions/${sessionId}/close`);
      toast.success('Chat closed');
      
      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, status: 'closed' } : s
      ));
      
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null);
        setMessages([]);
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

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const filteredSessions = sessions.filter(s => {
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    if (searchQuery && !s.visitor_name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'waiting':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">Waiting</Badge>;
      case 'active':
        return <Badge variant="outline" className="bg-success/10 text-success border-success/20">Active</Badge>;
      case 'closed':
        return <Badge variant="outline" className="bg-muted text-muted-foreground">Closed</Badge>;
      default:
        return null;
    }
  };

  if (!agent) return null;

  return (
    <div className="agent-dashboard bg-background" data-testid="agent-dashboard">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col border-r bg-card">
        {/* Sidebar Header */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-heading font-bold text-foreground truncate">24gameapi</h1>
              <p className="text-xs text-muted-foreground">Agent Dashboard</p>
            </div>
          </div>
        </div>

        {/* Agent Info */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="online-indicator">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {agent.name?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{agent.name}</p>
              <p className="text-xs text-muted-foreground truncate">{agent.email}</p>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
              data-testid="search-chats-input"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9" data-testid="filter-status-select">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Chats</SelectItem>
              <SelectItem value="waiting">Waiting</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Chat List */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {filteredSessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No chats found
              </div>
            ) : (
              filteredSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => setSelectedSession(session)}
                  className={`session-item p-3 rounded-xl cursor-pointer mb-1 ${
                    selectedSession?.id === session.id ? 'active' : ''
                  }`}
                  data-testid={`session-item-${session.id}`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10 shrink-0">
                      <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                        {session.visitor_name?.[0]?.toUpperCase() || 'V'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm truncate">
                          {session.visitor_name || 'Visitor'}
                        </p>
                        {session.unread_count > 0 && (
                          <span className="unread-badge">{session.unread_count}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {session.last_message || 'No messages yet'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusBadge(session.status)}
                        <span className="text-xs text-muted-foreground">
                          {formatDate(session.updated_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Sidebar Footer */}
        <div className="p-4 border-t space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
            data-testid="toggle-notifications-btn"
          >
            {notificationsEnabled ? (
              <>
                <Bell className="w-4 h-4 mr-2" /> Notifications On
              </>
            ) : (
              <>
                <BellOff className="w-4 h-4 mr-2" /> Notifications Off
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={toggleTheme}
            data-testid="theme-toggle-sidebar"
          >
            {theme === 'light' ? (
              <>
                <Moon className="w-4 h-4 mr-2" /> Dark Mode
              </>
            ) : (
              <>
                <Sun className="w-4 h-4 mr-2" /> Light Mode
              </>
            )}
          </Button>
          <Separator />
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-destructive hover:text-destructive"
            onClick={handleLogout}
            data-testid="logout-btn"
          >
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex flex-col h-screen overflow-hidden">
        {selectedSession ? (
          <>
            {/* Chat Header */}
            <header className="glass-header px-4 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    {selectedSession.visitor_name?.[0]?.toUpperCase() || 'V'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-heading font-bold text-foreground">
                    {selectedSession.visitor_name || 'Visitor'}
                  </h2>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedSession.status)}
                    {selectedSession.assigned_agent_id && (
                      <span className="text-xs text-muted-foreground">
                        Assigned to {agents.find(a => a.id === selectedSession.assigned_agent_id)?.name || 'Agent'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {selectedSession.status === 'waiting' && (
                  <Button
                    size="sm"
                    onClick={() => assignToMe(selectedSession.id)}
                    data-testid="assign-to-me-btn"
                    className="rounded-full"
                  >
                    <User className="w-4 h-4 mr-1" /> Take Chat
                  </Button>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {selectedSession.status !== 'closed' && (
                      <DropdownMenuItem
                        onClick={() => closeSession(selectedSession.id)}
                        className="text-destructive"
                        data-testid="close-chat-btn"
                      >
                        <XCircle className="w-4 h-4 mr-2" /> Close Chat
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4">
              <div className="messages-container max-w-3xl mx-auto py-2">
                {messages.map((msg, idx) => (
                  <div
                    key={msg.id || idx}
                    className={`message-row ${msg.sender_type === 'agent' ? 'justify-end' : 'justify-start'} message-enter`}
                  >
                    {msg.sender_type === 'visitor' && (
                      <Avatar className="w-8 h-8 mr-2 mt-1 shrink-0">
                        <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                          {selectedSession.visitor_name?.[0] || 'V'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div className={msg.sender_type === 'agent' ? 'chat-bubble-visitor' : 'chat-bubble-agent'}>
                      {msg.sender_type === 'visitor' && (
                        <p className="text-xs font-medium text-primary mb-1">
                          {selectedSession.visitor_name || 'Visitor'}
                        </p>
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
                      
                      <p className={`text-xs mt-1 ${msg.sender_type === 'agent' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                    
                    {msg.sender_type === 'agent' && (
                      <Avatar className="w-8 h-8 ml-2 mt-1 shrink-0">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {msg.sender_name?.[0] || 'A'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
                
                {visitorTyping && (
                  <div className="message-row justify-start">
                    <Avatar className="w-8 h-8 mr-2 mt-1 shrink-0">
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                        {selectedSession.visitor_name?.[0] || 'V'}
                      </AvatarFallback>
                    </Avatar>
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
            {selectedSession.status !== 'closed' && selectedSession.assigned_agent_id === agent.id && (
              <div className="glass-input p-4 shrink-0">
                {/* Pending File Preview */}
                {pendingFile && (
                  <div className="max-w-3xl mx-auto mb-2">
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
                        data-testid="agent-remove-file-btn"
                        className="rounded-full h-8 w-8 shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
                
                <form onSubmit={sendMessage} className="max-w-3xl mx-auto flex items-center gap-2">
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
                    disabled={uploading}
                    data-testid="agent-attach-file-btn"
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
                    placeholder="Type a message..."
                    data-testid="agent-message-input"
                    className="flex-1 h-12 rounded-full"
                  />
                  
                  <Button
                    type="submit"
                    disabled={(!newMessage.trim() && !pendingFile) || uploading}
                    data-testid="agent-send-message-btn"
                    className="rounded-full h-12 w-12 shrink-0"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </form>
              </div>
            )}

            {selectedSession.status === 'waiting' && !selectedSession.assigned_agent_id && (
              <div className="p-4 bg-warning/10 border-t border-warning/20 text-center">
                <p className="text-sm text-warning font-medium">
                  This chat is waiting for assignment. Click "Take Chat" to respond.
                </p>
              </div>
            )}

            {selectedSession.status === 'closed' && (
              <div className="p-4 bg-muted text-center">
                <p className="text-sm text-muted-foreground">
                  This chat has been closed.
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <MessageCircle className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="font-heading text-xl font-bold text-foreground mb-2">
              Select a conversation
            </h2>
            <p className="text-muted-foreground max-w-sm">
              Choose a chat from the sidebar to start responding to visitors
            </p>
            
            <div className="mt-8 grid grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-xl bg-card border">
                <Clock className="w-6 h-6 mx-auto mb-2 text-warning" />
                <p className="text-2xl font-bold">{sessions.filter(s => s.status === 'waiting').length}</p>
                <p className="text-xs text-muted-foreground">Waiting</p>
              </div>
              <div className="p-4 rounded-xl bg-card border">
                <MessageCircle className="w-6 h-6 mx-auto mb-2 text-success" />
                <p className="text-2xl font-bold">{sessions.filter(s => s.status === 'active').length}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
              <div className="p-4 rounded-xl bg-card border">
                <CheckCircle className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-2xl font-bold">{sessions.filter(s => s.status === 'closed').length}</p>
                <p className="text-xs text-muted-foreground">Closed</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Header (for small screens) */}
      <div className="md:hidden fixed top-0 left-0 right-0 glass-header px-4 py-3 flex items-center justify-between z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-heading font-bold">24gameapi</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-full text-destructive">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
