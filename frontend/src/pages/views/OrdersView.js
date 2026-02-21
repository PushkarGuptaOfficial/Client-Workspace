import { ShoppingBag, Search } from 'lucide-react';
import { Input } from '../../components/ui/input';
import ChatCard from '../../components/ChatCard';
import { useState } from 'react';

export default function OrdersView({ sessions = [], agents, onSelect, selectedId, onStatusChange, isDark = false }) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredSessions = sessions
    .filter(s => !searchQuery || s.visitor_name?.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  const bgColor = isDark ? 'bg-[#111111]' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-[#111111]';
  const mutedText = isDark ? 'text-gray-400' : 'text-gray-500';
  const inputBg = isDark ? 'bg-[#2a2a2a] border-[#333]' : 'bg-gray-50 border-gray-200';

  return (
    <div className={`h-full flex flex-col p-6 ${bgColor}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-semibold ${textColor}`}>Orders</h1>
          <p className={`text-sm ${mutedText} mt-1`}>Track leads through your sales pipeline</p>
        </div>
        <span className={`text-sm ${mutedText}`}>{filteredSessions.length} orders</span>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${mutedText}`} />
        <Input
          placeholder="Search orders..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`pl-9 h-9 rounded-full ${inputBg}`}
        />
      </div>

      {filteredSessions.length === 0 ? (
        <div className={`flex-1 flex flex-col items-center justify-center ${mutedText}`}>
          <ShoppingBag className="w-12 h-12 mb-3 opacity-30" />
          <p>No orders yet</p>
          <p className="text-xs mt-1">Mark chats as orders to track them here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredSessions.map((session) => (
            <ChatCard
              key={session.id}
              session={session}
              selected={selectedId === session.id}
              onClick={() => onSelect(session)}
              agents={agents}
              showStatus={true}
              onStatusChange={onStatusChange}
              isDark={isDark}
            />
          ))}
        </div>
      )}
    </div>
  );
}
