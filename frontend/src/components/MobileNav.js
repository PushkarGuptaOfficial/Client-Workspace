import { MessageCircle, FolderOpen, ShoppingBag, Users, BarChart3 } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'chats', label: 'Chats', icon: MessageCircle },
  { id: 'projects', label: 'Projects', icon: FolderOpen },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'agents', label: 'Agents', icon: Users },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

export default function MobileNav({ activeView, setActiveView }) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#111111] border-t border-white/10 z-50 safe-area-bottom">
      <div className="flex justify-around items-center h-16">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
                active ? 'text-white' : 'text-gray-500'
              }`}
              data-testid={`mobile-nav-${item.id}`}
            >
              <div className={`p-1.5 rounded-lg ${active ? 'bg-white/20' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-1">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
