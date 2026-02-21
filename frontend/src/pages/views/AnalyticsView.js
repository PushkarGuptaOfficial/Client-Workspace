import { BarChart3, MessageCircle, CheckCircle, Clock, ShoppingBag, Users } from 'lucide-react';

export default function AnalyticsView({ sessions = [], agents = [], isDark = false }) {
  const totalChats = sessions.length;
  const resolvedChats = sessions.filter(s => s.status === 'closed').length;
  const pendingChats = sessions.filter(s => s.status === 'waiting').length;
  const activeChats = sessions.filter(s => s.status === 'active').length;
  const ordersConverted = sessions.filter(s => s.is_order).length;

  const bgColor = isDark ? 'bg-[#111111]' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-[#111111]';
  const mutedText = isDark ? 'text-gray-400' : 'text-gray-500';
  const cardBg = isDark ? 'bg-[#1a1a1a] border-[#333]' : 'bg-white border-gray-200';
  const progressBg = isDark ? 'bg-[#333]' : 'bg-gray-100';

  const stats = [
    { label: 'Total Chats', value: totalChats, icon: MessageCircle, color: isDark ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-50 text-blue-600' },
    { label: 'Active', value: activeChats, icon: Clock, color: isDark ? 'bg-green-900/50 text-green-400' : 'bg-green-50 text-green-600' },
    { label: 'Pending', value: pendingChats, icon: Clock, color: isDark ? 'bg-yellow-900/50 text-yellow-400' : 'bg-yellow-50 text-yellow-600' },
    { label: 'Resolved', value: resolvedChats, icon: CheckCircle, color: isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600' },
    { label: 'Orders', value: ordersConverted, icon: ShoppingBag, color: isDark ? 'bg-purple-900/50 text-purple-400' : 'bg-purple-50 text-purple-600' },
    { label: 'Agents', value: agents.length, icon: Users, color: isDark ? 'bg-indigo-900/50 text-indigo-400' : 'bg-indigo-50 text-indigo-600' },
  ];

  const conversionRate = totalChats > 0 ? ((ordersConverted / totalChats) * 100).toFixed(1) : 0;
  const resolutionRate = totalChats > 0 ? ((resolvedChats / totalChats) * 100).toFixed(1) : 0;

  return (
    <div className={`h-full flex flex-col p-6 ${bgColor}`}>
      <div className="mb-6">
        <h1 className={`text-2xl font-semibold ${textColor}`}>Analytics</h1>
        <p className={`text-sm ${mutedText} mt-1`}>Track performance metrics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`border rounded-xl p-4 ${cardBg}`}>
              <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className={`text-2xl font-semibold ${textColor}`}>{stat.value}</p>
              <p className={`text-xs ${mutedText}`}>{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`border rounded-xl p-6 ${cardBg}`}>
          <h3 className={`font-medium ${textColor} mb-4`}>Conversion Rate</h3>
          <div className="flex items-end gap-3">
            <span className={`text-4xl font-bold ${textColor}`}>{conversionRate}%</span>
            <span className={`text-sm ${mutedText} mb-1`}>chats → orders</span>
          </div>
          <div className={`mt-4 h-2 ${progressBg} rounded-full overflow-hidden`}>
            <div 
              className="h-full bg-[#111111] dark:bg-white rounded-full transition-all" 
              style={{ width: `${conversionRate}%` }}
            />
          </div>
        </div>

        <div className={`border rounded-xl p-6 ${cardBg}`}>
          <h3 className={`font-medium ${textColor} mb-4`}>Resolution Rate</h3>
          <div className="flex items-end gap-3">
            <span className={`text-4xl font-bold ${textColor}`}>{resolutionRate}%</span>
            <span className={`text-sm ${mutedText} mb-1`}>chats resolved</span>
          </div>
          <div className={`mt-4 h-2 ${progressBg} rounded-full overflow-hidden`}>
            <div 
              className="h-full bg-green-500 rounded-full transition-all" 
              style={{ width: `${resolutionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Agent Performance */}
      <div className={`mt-6 border rounded-xl p-6 ${cardBg}`}>
        <h3 className={`font-medium ${textColor} mb-4`}>Agent Performance</h3>
        <div className="space-y-3">
          {agents.map((agent) => {
            const agentSessions = sessions.filter(s => s.assigned_agent_id === agent.id);
            const agentResolved = agentSessions.filter(s => s.status === 'closed').length;
            const rate = agentSessions.length > 0 ? (agentResolved / agentSessions.length) * 100 : 0;
            
            return (
              <div key={agent.id} className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full ${isDark ? 'bg-[#333]' : 'bg-gray-100'} flex items-center justify-center text-sm font-medium ${mutedText}`}>
                  {agent.name?.[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${textColor}`}>{agent.name}</span>
                    <span className={`text-xs ${mutedText}`}>{agentSessions.length} chats</span>
                  </div>
                  <div className={`h-1.5 ${progressBg} rounded-full overflow-hidden`}>
                    <div 
                      className="h-full bg-[#111111] dark:bg-white rounded-full" 
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
