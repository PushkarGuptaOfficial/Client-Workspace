import { Users, MessageCircle, Star } from 'lucide-react';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';

export default function AgentsView({ agents = [], sessions = [], isDark = false }) {
  const getAgentStats = (agentId) => {
    const assignedSessions = sessions.filter(s => s.assigned_agent_id === agentId);
    const activeSessions = assignedSessions.filter(s => s.status === 'active');
    return { total: assignedSessions.length, active: activeSessions.length };
  };

  const bgColor = isDark ? 'bg-[#111111]' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-[#111111]';
  const mutedText = isDark ? 'text-gray-400' : 'text-gray-500';
  const cardBg = isDark ? 'bg-[#1a1a1a] border-[#333]' : 'bg-white border-gray-200';
  const borderColor = isDark ? 'border-[#333]' : 'border-gray-100';

  return (
    <div className={`h-full flex flex-col p-6 ${bgColor}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-semibold ${textColor}`}>Agents</h1>
          <p className={`text-sm ${mutedText} mt-1`}>Manage your team members</p>
        </div>
        <span className={`text-sm ${mutedText}`}>{agents.length} agents</span>
      </div>

      {agents.length === 0 ? (
        <div className={`flex-1 flex flex-col items-center justify-center ${mutedText}`}>
          <Users className="w-12 h-12 mb-3 opacity-30" />
          <p>No agents yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => {
            const stats = getAgentStats(agent.id);
            return (
              <div
                key={agent.id}
                className={`border rounded-xl p-4 hover:shadow-sm transition-all ${cardBg}`}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-[#111111] text-white text-lg">
                        {agent.name?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 ${isDark ? 'border-[#1a1a1a]' : 'border-white'} ${agent.is_online ? 'bg-green-500' : 'bg-gray-300'}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-medium ${textColor} truncate`}>{agent.name}</h3>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${isDark ? 'border-[#444] text-gray-400' : ''}`}>
                        {agent.role}
                      </Badge>
                    </div>
                    <p className={`text-xs ${mutedText} truncate`}>{agent.email}</p>
                  </div>
                </div>

                <div className={`mt-4 pt-3 border-t ${borderColor} flex items-center justify-between`}>
                  <div className={`flex items-center gap-4 text-sm ${mutedText}`}>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="w-4 h-4" />
                      <span>{stats.active}</span>
                      <span className={isDark ? 'text-[#444]' : 'text-gray-300'}>/</span>
                      <span>{stats.total}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-sm">4.8</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
