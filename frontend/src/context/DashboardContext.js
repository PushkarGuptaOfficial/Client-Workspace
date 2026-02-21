import { createContext, useContext, useState } from 'react';

const DashboardContext = createContext();

export function DashboardProvider({ children }) {
  const [sidebarFolded, setSidebarFolded] = useState(false);
  const [activeView, setActiveView] = useState('chats');
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [agents, setAgents] = useState([]);
  const [projects, setProjects] = useState([]);

  const toggleSidebar = () => setSidebarFolded(prev => !prev);

  const updateSessionStatus = (sessionId, status) => {
    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, status, order_status: status } : s
    ));
  };

  const assignAgent = (sessionId, agentId) => {
    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, assigned_agent_id: agentId } : s
    ));
  };

  const markAsOrder = (sessionId) => {
    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, is_order: true, order_status: 'new_lead' } : s
    ));
  };

  return (
    <DashboardContext.Provider value={{
      sidebarFolded,
      toggleSidebar,
      activeView,
      setActiveView,
      sessions,
      setSessions,
      selectedSession,
      setSelectedSession,
      agents,
      setAgents,
      projects,
      setProjects,
      updateSessionStatus,
      assignAgent,
      markAsOrder
    }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within DashboardProvider');
  }
  return context;
}
