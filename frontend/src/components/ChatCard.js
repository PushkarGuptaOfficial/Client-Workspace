import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

const STATUS_OPTIONS = [
  { value: 'new_lead', label: 'New Lead', color: 'bg-blue-500' },
  { value: 'contacted', label: 'Contacted', color: 'bg-yellow-500' },
  { value: 'proposal_sent', label: 'Proposal Sent', color: 'bg-orange-500' },
  { value: 'negotiation', label: 'Negotiation', color: 'bg-purple-500' },
  { value: 'order_placed', label: 'Order Placed', color: 'bg-emerald-500' },
  { value: 'delivered', label: 'Delivered', color: 'bg-green-600' },
  { value: 'closed', label: 'Closed', color: 'bg-gray-500' },
];

export default function ChatCard({ 
  session, 
  selected, 
  onClick, 
  onStatusChange,
  agents = [],
  showStatus = false 
}) {
  const assignedAgent = agents.find(a => a.id === session.assigned_agent_id);
  const status = session.order_status || 'new_lead';
  const statusInfo = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-xl cursor-pointer transition-all border ${
        selected 
          ? 'bg-[#111111] text-white border-[#111111]' 
          : 'bg-white hover:bg-gray-50 border-gray-100 hover:border-gray-200'
      }`}
      data-testid={`chat-card-${session.id}`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Avatar className="w-11 h-11 shrink-0">
          <AvatarFallback className={`text-sm font-medium ${selected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'}`}>
            {session.visitor_name?.[0]?.toUpperCase() || 'V'}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={`font-medium text-sm truncate ${selected ? 'text-white' : 'text-[#111111]'}`}>
              {session.visitor_name || 'Visitor'}
            </span>
            <span className={`text-xs whitespace-nowrap ${selected ? 'text-white/60' : 'text-gray-400'}`}>
              {formatTime(session.updated_at)}
            </span>
          </div>
          
          <p className={`text-sm truncate mt-0.5 ${selected ? 'text-white/70' : 'text-gray-500'}`}>
            {session.last_message || 'No messages yet'}
          </p>

          {/* Footer: Status + Agent + Unread */}
          <div className="flex items-center justify-between mt-2 gap-2">
            <div className="flex items-center gap-2">
              {/* Status Dropdown */}
              {showStatus && (
                <Select 
                  value={status} 
                  onValueChange={(val) => {
                    onStatusChange?.(session.id, val);
                  }}
                >
                  <SelectTrigger 
                    className={`h-6 text-[10px] px-2 w-auto border-0 ${
                      selected ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.color} mr-1.5`} />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${opt.color}`} />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Assigned Agent */}
              {assignedAgent && (
                <div className={`flex items-center gap-1 text-[10px] ${selected ? 'text-white/60' : 'text-gray-400'}`}>
                  <Avatar className="w-4 h-4">
                    <AvatarFallback className="text-[8px] bg-gray-200 text-gray-600">
                      {assignedAgent.name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate max-w-[60px]">{assignedAgent.name}</span>
                </div>
              )}
            </div>

            {/* Unread Badge */}
            {session.unread_count > 0 && (
              <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold bg-[#111111] text-white rounded-full">
                {session.unread_count}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export { STATUS_OPTIONS };
