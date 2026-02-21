import { BarChart3, MessageCircle, CheckCircle, Clock, ShoppingBag, Users } from 'lucide-react';

export default function AnalyticsView({ sessions, agents }) {
  const totalChats = sessions.length;
  const resolvedChats = sessions.filter(s => s.status === 'closed').length;
  const pendingChats = sessions.filter(s => s.status === 'waiting').length;
  const activeChats = sessions.filter(s => s.status === 'active').length;
  const ordersConverted = sessions.filter(s => s.is_order).length;

  const stats = [
    { label: 'Total Chats', value: totalChats, icon: MessageCircle, color: 'bg-blue-50 text-blue-600' },
    { label: 'Active', value: activeChats, icon: Clock, color: 'bg-green-50 text-green-600' },
    { label: 'Pending', value: pendingChats, icon: Clock, color: 'bg-yellow-50 text-yellow-600' },
    { label: 'Resolved', value: resolvedChats, icon: CheckCircle, color: 'bg-gray-100 text-gray-600' },
    { label: 'Orders', value: ordersConverted, icon: ShoppingBag, color: 'bg-purple-50 text-purple-600' },
    { label: 'Agents', value: agents.length, icon: Users, color: 'bg-indigo-50 text-indigo-600' },
  ];

  const conversionRate = totalChats > 0 ? ((ordersConverted / totalChats) * 100).toFixed(1) : 0;
  const resolutionRate = totalChats > 0 ? ((resolvedChats / totalChats) * 100).toFixed(1) : 0;

  return (
    <div className="h-full flex flex-col p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#111111]">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Track performance metrics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-semibold text-[#111111]">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-medium text-[#111111] mb-4">Conversion Rate</h3>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-bold text-[#111111]">{conversionRate}%</span>
            <span className="text-sm text-gray-400 mb-1">chats → orders</span>
          </div>
          <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#111111] rounded-full transition-all" 
              style={{ width: `${conversionRate}%` }}
            />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-medium text-[#111111] mb-4">Resolution Rate</h3>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-bold text-[#111111]">{resolutionRate}%</span>
            <span className="text-sm text-gray-400 mb-1">chats resolved</span>
          </div>
          <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 rounded-full transition-all" 
              style={{ width: `${resolutionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Agent Performance */}
      <div className="mt-6 bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="font-medium text-[#111111] mb-4">Agent Performance</h3>
        <div className="space-y-3">
          {agents.map((agent) => {
            const agentSessions = sessions.filter(s => s.assigned_agent_id === agent.id);
            const agentResolved = agentSessions.filter(s => s.status === 'closed').length;
            const rate = agentSessions.length > 0 ? (agentResolved / agentSessions.length) * 100 : 0;
            
            return (
              <div key={agent.id} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600">
                  {agent.name?.[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-[#111111]">{agent.name}</span>
                    <span className="text-xs text-gray-400">{agentSessions.length} chats</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#111111] rounded-full" 
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
