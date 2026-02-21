import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MessageCircle } from 'lucide-react';
import { Input } from '../components/ui/input';
import { ScrollArea } from '../components/ui/scroll-area';
import Sidebar from '../components/Sidebar';
import MobileNav from '../components/MobileNav';
import ChatCard from '../components/ChatCard';
import ChatPanel from '../components/ChatPanel';
import FilterTabs from '../components/FilterTabs';
import ProjectsView from './views/ProjectsView';
import OrdersView from './views/OrdersView';
import AgentsView from './views/AgentsView';
import AnalyticsView from './views/AnalyticsView';
import SettingsView from './views/SettingsView';
import NotificationsView from './views/NotificationsView';
import { playNotification, ensureAudioUnlocked } from '../utils/audio';
import { useTheme } from '../context/ThemeContext';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AgentDashboard() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  
  // State
  const [agent, setAgent] = useState(null);
  const [sidebarFolded, setSidebarFolded] = useState(false);
  const [activeView, setActiveView] = useState('chats');
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [isConnected, setIsConnected] = useState(false);
  const [visitorTyping, setVisitorTyping] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [agents, setAgents] = useState([]);

  const wsRef = useRef(null);
  const selectedSessionRef = useRef(null);

  // Keep ref in sync
  useEffect(() => {
    selectedSessionRef.current = selectedSession;
  }, [selectedSession]);

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

  // Notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
  }, []);

  // Fetch data
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
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [agent]);

  // WebSocket
  useEffect(() => {
    if (!agent) return;
    const wsUrl = `${process.env.REACT_APP_BACKEND_URL.replace('http', 'ws')}/api/ws/agent/${agent.id}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => setIsConnected(true);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const currentSession = selectedSessionRef.current;
      
      if (data.type === 'new_message') {
        if (data.session_id === currentSession?.id && data.message.sender_type === 'visitor') {
          setMessages(prev => {
            if (prev.some(m => m.id === data.message.id)) return prev;
            return [...prev, data.message];
          });
          setVisitorTyping(false);
        }
        
        setSessions(prev => prev.map(s => 
          s.id === data.session_id 
            ? { ...s, last_message: data.message.content?.substring(0, 100), updated_at: new Date().toISOString(), unread_count: (s.unread_count || 0) + (data.message.sender_type === 'visitor' ? 1 : 0) }
            : s
        ));

        if (data.message.sender_type === 'visitor') {
          playNotification('visitor');
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New Message', { body: data.message.content });
          }
        }
      } else if (data.type === 'new_session') {
        setSessions(prev => [data.session, ...prev]);
        toast.info(`New chat from ${data.session.visitor_name || 'Visitor'}`);
        playNotification('visitor');
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

  // Load messages
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

  // Handlers
  const handleLogout = () => {
    localStorage.removeItem('agent_token');
    localStorage.removeItem('agent_data');
    navigate('/agent/login');
  };

  const selectSession = (session) => {
    ensureAudioUnlocked();
    setSelectedSession(session);
    setMobileShowChat(true);
  };

  const sendMessage = (messageData) => {
    if (!wsRef.current || !isConnected || !selectedSession) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'message',
      session_id: selectedSession.id,
      ...messageData
    }));
    
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      sender_type: 'agent',
      sender_id: agent.id,
      sender_name: agent.name,
      created_at: new Date().toISOString(),
      ...messageData
    }]);
  };

  const assignAgent = async (sessionId, agentId) => {
    try {
      await axios.put(`${API}/sessions/${sessionId}/assign`, { agent_id: agentId });
      toast.success('Agent assigned');
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, assigned_agent_id: agentId, status: 'active' } : s));
      if (selectedSession?.id === sessionId) {
        setSelectedSession(prev => ({ ...prev, assigned_agent_id: agentId, status: 'active' }));
      }
    } catch (error) {
      toast.error('Failed to assign agent');
    }
  };

  const revokeAgent = async (sessionId) => {
    try {
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, assigned_agent_id: null, status: 'waiting' } : s));
      toast.success('Agent revoked');
    } catch (error) {
      toast.error('Failed to revoke agent');
    }
  };

  const deleteSession = async (sessionId) => {
    try {
      await axios.put(`${API}/sessions/${sessionId}/close`);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null);
        setMessages([]);
        setMobileShowChat(false);
      }
      toast.success('Conversation deleted');
    } catch (error) {
      toast.error('Failed to delete conversation');
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

  const markAsOrder = async (sessionId) => {
    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, is_order: true, order_status: 'new_lead' } : s
    ));
    toast.success('Marked as order');
  };

  // Update session status - sync with Orders if order_placed
  const updateSessionStatus = (sessionId, status) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        const isOrder = status === 'order_placed' || s.is_order;
        return { ...s, order_status: status, is_order: isOrder };
      }
      return s;
    }));
  };

  // Filter sessions based on active filter
  const getFilteredSessions = () => {
    let filtered = sessions;
    
    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(s => 
        s.visitor_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply status filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(s => {
        const status = s.order_status || s.status || 'new_lead';
        return status === activeFilter;
      });
    }
    
    // Sort by updated_at
    return filtered.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  };

  const filteredSessions = getFilteredSessions();

  if (!agent) return null;

  // Render view content
  const renderContent = () => {
    switch (activeView) {
      case 'projects':
        return <ProjectsView isDark={isDark} />;
      case 'orders':
        return (
          <OrdersView 
            sessions={sessions.filter(s => s.is_order)} 
            agents={agents}
            onSelect={selectSession}
            selectedId={selectedSession?.id}
            onStatusChange={updateSessionStatus}
            isDark={isDark}
          />
        );
      case 'agents':
        return <AgentsView agents={agents} sessions={sessions} isDark={isDark} />;
      case 'analytics':
        return <AnalyticsView sessions={sessions} agents={agents} isDark={isDark} />;
      case 'general':
        return <SettingsView />;
      case 'notifications':
        return <NotificationsView isDark={isDark} />;
      default:
        return null;
    }
  };

  const bgColor = isDark ? 'bg-[#111111]' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-[#111111]';
  const borderColor = isDark ? 'border-[#333]' : 'border-gray-100';
  const mutedText = isDark ? 'text-gray-400' : 'text-gray-500';
  const inputBg = isDark ? 'bg-[#2a2a2a] border-[#333]' : 'bg-gray-50 border-gray-200';

  return (
    <div className={`h-screen flex ${bgColor}`} data-testid="agent-dashboard">
      {/* Sidebar */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        folded={sidebarFolded}
        onToggle={() => setSidebarFolded(!sidebarFolded)}
        onLogout={handleLogout}
        agent={agent}
        isDark={isDark}
      />

      {/* Main Content */}
      {activeView === 'chats' ? (
        <>
          {/* Chat List */}
          <div className={`w-full md:w-80 lg:w-96 border-r ${borderColor} flex flex-col ${bgColor} ${mobileShowChat ? 'hidden md:flex' : 'flex'}`}>
            <div className={`p-4 border-b ${borderColor}`}>
              <div className="flex items-center justify-between mb-3">
                <h1 className={`text-lg font-semibold ${textColor}`}>All Chats</h1>
                <span className={`text-xs ${mutedText}`}>{filteredSessions.length} conversations</span>
              </div>
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${mutedText}`} />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`pl-9 h-9 rounded-full ${inputBg}`}
                />
              </div>
              
              {/* Filter Tabs */}
              <FilterTabs 
                activeFilter={activeFilter} 
                onFilterChange={setActiveFilter}
                isDark={isDark}
              />
            </div>

            <ScrollArea className="flex-1">
              {filteredSessions.length === 0 ? (
                <div className={`flex flex-col items-center justify-center py-16 ${mutedText}`}>
                  <MessageCircle className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm">No conversations</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredSessions.map((session) => (
                    <ChatCard
                      key={session.id}
                      session={session}
                      selected={selectedSession?.id === session.id}
                      onClick={() => selectSession(session)}
                      agents={agents}
                      showStatus={true}
                      onStatusChange={updateSessionStatus}
                      onAssignAgent={assignAgent}
                      onRevokeAgent={revokeAgent}
                      onDelete={deleteSession}
                      isDark={isDark}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Chat Panel */}
          <div className={`flex-1 ${!mobileShowChat ? 'hidden md:flex' : 'flex'}`}>
            <ChatPanel
              session={selectedSession}
              messages={messages}
              agent={agent}
              onBack={() => setMobileShowChat(false)}
              onSendMessage={sendMessage}
              onAssign={(id) => assignAgent(id, agent.id)}
              onMarkOrder={markAsOrder}
              onClose={closeSession}
              visitorTyping={visitorTyping}
              isDark={isDark}
            />
          </div>
        </>
      ) : (
        <div className={`flex-1 overflow-auto ${bgColor}`}>
          {renderContent()}
        </div>
      )}

      {/* Mobile Nav */}
      <MobileNav activeView={activeView} setActiveView={setActiveView} />
    </div>
  );
}
