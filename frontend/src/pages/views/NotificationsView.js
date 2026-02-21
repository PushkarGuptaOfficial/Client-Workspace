import { useState } from 'react';
import { Bell, MessageCircle, UserPlus, ShoppingBag, CheckCircle } from 'lucide-react';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';

const NOTIFICATION_TYPES = [
  { id: 'new_message', label: 'New Messages', description: 'When a visitor sends a message', icon: MessageCircle, defaultOn: true },
  { id: 'new_chat', label: 'New Chats', description: 'When a new visitor starts a chat', icon: UserPlus, defaultOn: true },
  { id: 'chat_assigned', label: 'Chat Assigned', description: 'When a chat is assigned to you', icon: UserPlus, defaultOn: true },
  { id: 'order_update', label: 'Order Updates', description: 'When an order status changes', icon: ShoppingBag, defaultOn: false },
  { id: 'chat_closed', label: 'Chat Closed', description: 'When a chat is closed', icon: CheckCircle, defaultOn: false },
];

export default function NotificationsView() {
  const [notifications, setNotifications] = useState(
    NOTIFICATION_TYPES.reduce((acc, n) => ({ ...acc, [n.id]: n.defaultOn }), {})
  );

  const updateNotification = (id, value) => {
    setNotifications(prev => ({ ...prev, [id]: value }));
  };

  return (
    <div className="h-full flex flex-col p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#111111]">Notifications</h1>
        <p className="text-sm text-gray-500 mt-1">Choose what you want to be notified about</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {NOTIFICATION_TYPES.map((type, idx) => {
          const Icon = type.icon;
          return (
            <div
              key={type.id}
              className={`p-4 flex items-center justify-between ${idx !== NOTIFICATION_TYPES.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <Label className="text-sm font-medium text-[#111111]">{type.label}</Label>
                  <p className="text-xs text-gray-400">{type.description}</p>
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
