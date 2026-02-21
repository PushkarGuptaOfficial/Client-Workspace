import { useState } from 'react';
import { Bell, MessageCircle, UserPlus, ShoppingBag, CheckCircle } from 'lucide-react';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';
import { useTheme } from '../../context/ThemeContext';

const NOTIFICATION_TYPES = [
  { id: 'new_message', label: 'New Messages', description: 'When a visitor sends a message', icon: MessageCircle, defaultOn: true },
  { id: 'new_chat', label: 'New Chats', description: 'When a new visitor starts a chat', icon: UserPlus, defaultOn: true },
  { id: 'chat_assigned', label: 'Chat Assigned', description: 'When a chat is assigned to you', icon: UserPlus, defaultOn: true },
  { id: 'order_update', label: 'Order Updates', description: 'When an order status changes', icon: ShoppingBag, defaultOn: false },
  { id: 'chat_closed', label: 'Chat Closed', description: 'When a chat is closed', icon: CheckCircle, defaultOn: false },
];

export default function NotificationsView() {
  const { isDark } = useTheme();
  const [notifications, setNotifications] = useState(
    NOTIFICATION_TYPES.reduce((acc, n) => ({ ...acc, [n.id]: n.defaultOn }), {})
  );

  const updateNotification = (id, value) => {
    setNotifications(prev => ({ ...prev, [id]: value }));
  };

  const bgColor = isDark ? 'bg-[#111111]' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-[#111111]';
  const mutedText = isDark ? 'text-gray-400' : 'text-gray-500';
  const cardBg = isDark ? 'bg-[#1a1a1a] border-[#333]' : 'bg-white border-gray-200';
  const iconBg = isDark ? 'bg-[#2a2a2a]' : 'bg-gray-100';
  const borderColor = isDark ? 'border-[#333]' : 'border-gray-100';

  return (
    <div className={`h-full flex flex-col p-6 max-w-2xl ${bgColor}`}>
      <div className="mb-6">
        <h1 className={`text-2xl font-semibold ${textColor}`}>Notifications</h1>
        <p className={`text-sm ${mutedText} mt-1`}>Choose what you want to be notified about</p>
      </div>

      <div className={`border rounded-xl overflow-hidden ${cardBg}`}>
        {NOTIFICATION_TYPES.map((type, idx) => {
          const Icon = type.icon;
          return (
            <div
              key={type.id}
              className={`p-4 flex items-center justify-between ${idx !== NOTIFICATION_TYPES.length - 1 ? `border-b ${borderColor}` : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${mutedText}`} />
                </div>
                <div>
                  <Label className={`text-sm font-medium ${textColor}`}>{type.label}</Label>
                  <p className={`text-xs ${mutedText}`}>{type.description}</p>
                </div>
              </div>
              <Switch
                checked={notifications[type.id]}
                onCheckedChange={(v) => updateNotification(type.id, v)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
