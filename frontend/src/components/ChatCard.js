import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { MoreHorizontal, Moon, Reply, Trash2, UserMinus, UserPlus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from './ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { useState } from 'react';

const STATUS_OPTIONS = [
  { value: 'new_lead', label: 'New Lead', color: 'bg-blue-500' },
  { value: 'contacted', label: 'Contacted', color: 'bg-yellow-500' },
  { value: 'proposal_sent', label: 'Proposal Sent', color: 'bg-orange-500' },
  { value: 'negotiation', label: 'Negotiation', color: 'bg-purple-500' },
  { value: 'order_placed', label: 'Order Placed', color: 'bg-emerald-500' },
  { value: 'delivered', label: 'Delivered', color: 'bg-green-600' },
  { value: 'closed', label: 'Closed', color: 'bg-gray-500' },
  { value: 'denied', label: 'Denied', color: 'bg-red-500' },
];

// Generate consistent color from name
const getAvatarColor = (name) => {
  const colors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
    'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
    'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
    'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500',
  ];
  const hash = (name || 'V').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

export default function ChatCard({ 
  session, 
  selected, 
  onClick, 
  onStatusChange,
  onAssignAgent,
  onRevokeAgent,
  onDelete,
  agents = [],
  showStatus = false,
  isDark = false
}) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const assignedAgent = agents.find(a => a.id === session.assigned_agent_id);
  const status = session.order_status || session.status || 'new_lead';
  const statusInfo = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
  const hasUnread = session.unread_count > 0;

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

  const bgClass = selected 
    ? 'bg-[#111111] dark:bg-white' 
    : isDark 
      ? 'bg-[#2a2a2a] hover:bg-[#333]' 
      : 'bg-white hover:bg-gray-50';
  
  const textClass = selected 
    ? 'text-white dark:text-[#111111]' 
    : isDark 
      ? 'text-white' 
      : 'text-[#111111]';
  
  const subtextClass = selected 
    ? 'text-white/70 dark:text-[#111111]/70' 
    : isDark 
      ? 'text-gray-400' 
      : 'text-gray-500';

  return (
    <div
      onClick={onClick}
      className={`group relative p-3 rounded-xl cursor-pointer transition-all border ${
        selected 
          ? 'border-[#111111] dark:border-white' 
          : isDark 
            ? 'border-[#333] hover:border-[#444]' 
            : 'border-gray-100 hover:border-gray-200'
      } ${bgClass}`}
      data-testid={`chat-card-${session.id}`}
    >
      {/* Unread indicator bar */}
      {hasUnread && (
        <div className="absolute left-0 top-3 bottom-3 w-1 bg-orange-500 rounded-r-full" />
      )}

      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Avatar className="w-11 h-11 shrink-0">
          {session.visitor_photo ? (
            <AvatarImage src={session.visitor_photo} alt={session.visitor_name} />
          ) : null}
          <AvatarFallback className={`text-sm font-medium text-white ${getAvatarColor(session.visitor_name)}`}>
            {session.visitor_name?.[0]?.toUpperCase() || 'V'}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={`font-semibold text-sm truncate ${textClass}`}>
              {session.visitor_name || 'Visitor'}
            </span>
            <span className={`text-xs whitespace-nowrap ${subtextClass}`}>
              {formatTime(session.updated_at)}
            </span>
          </div>
          
          <p className={`text-sm truncate mt-0.5 ${subtextClass}`}>
            {session.last_message || 'No messages yet'}
          </p>

          {/* Footer Row */}
          <div className="flex items-center justify-between mt-2 gap-2">
            <div className="flex items-center gap-2">
              {/* Status Dropdown */}
              {showStatus && (
                <Select 
                  value={status} 
                  onValueChange={(val) => onStatusChange?.(session.id, val)}
                >
                  <SelectTrigger 
                    className={`h-6 text-[10px] px-2 w-auto border-0 ${
                      selected 
                        ? 'bg-white/10 text-white dark:bg-[#111]/10 dark:text-[#111]' 
                        : isDark 
                          ? 'bg-[#333] text-gray-300' 
                          : 'bg-gray-100 text-gray-600'
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
            </div>

            {/* Right side icons */}
            <div className="flex items-center gap-1.5">
              <Button 
                variant="ghost" 
                size="icon" 
                className={`h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ${subtextClass}`}
                onClick={(e) => e.stopPropagation()}
              >
                <Moon className="w-3.5 h-3.5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className={`h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ${subtextClass}`}
                onClick={(e) => e.stopPropagation()}
              >
                <Reply className="w-3.5 h-3.5" />
              </Button>
              
              {/* Assigned Agent Avatar */}
              {assignedAgent && (
                <Avatar className="w-5 h-5">
                  <AvatarFallback className="text-[8px] bg-gray-300 text-gray-700">
                    {assignedAgent.name?.[0]}
                  </AvatarFallback>
                </Avatar>
              )}

              {/* Three dots menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={`h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ${subtextClass}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <UserPlus className="w-4 h-4 mr-2" /> Assign Agent
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {agents.map((agent) => (
                        <DropdownMenuItem 
                          key={agent.id} 
                          onClick={() => onAssignAgent?.(session.id, agent.id)}
                        >
                          <Avatar className="w-5 h-5 mr-2">
                            <AvatarFallback className="text-[8px]">{agent.name?.[0]}</AvatarFallback>
                          </Avatar>
                          {agent.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  
                  {session.assigned_agent_id && (
                    <DropdownMenuItem onClick={() => onRevokeAgent?.(session.id)}>
                      <UserMinus className="w-4 h-4 mr-2" /> Revoke Agent
                    </DropdownMenuItem>
                  )}
                  
                  <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem 
                        className="text-red-600"
                        onSelect={(e) => {
                          e.preventDefault();
                          setShowDeleteDialog(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete Conversation
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this conversation and all messages. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          className="bg-red-600 hover:bg-red-700"
                          onClick={() => {
                            onDelete?.(session.id);
                            setShowDeleteDialog(false);
                          }}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { STATUS_OPTIONS, getAvatarColor };
