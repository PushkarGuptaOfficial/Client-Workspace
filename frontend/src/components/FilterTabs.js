import { useRef, useEffect } from 'react';

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'new_lead', label: 'New Leads' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'negotiation', label: 'Negotiation' },
  { id: 'order_placed', label: 'Order Placed' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'closed', label: 'Closed' },
  { id: 'denied', label: 'Denied' },
];

export default function FilterTabs({ activeFilter, onFilterChange, isDark = false }) {
  const scrollRef = useRef(null);
  const activeRef = useRef(null);

  // Scroll active tab into view
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      activeRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest', 
        inline: 'center' 
      });
    }
  }, [activeFilter]);

  return (
    <div 
      ref={scrollRef}
      className="flex gap-1 overflow-x-auto scrollbar-hide py-2 -mx-1 px-1"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {FILTER_TABS.map((tab) => {
        const isActive = activeFilter === tab.id;
        return (
          <button
            key={tab.id}
            ref={isActive ? activeRef : null}
            onClick={() => onFilterChange(tab.id)}
            className={`px-3 py-1.5 text-sm whitespace-nowrap rounded-lg transition-all shrink-0 ${
              isActive
                ? `font-semibold ${isDark ? 'text-white border-b-2 border-white' : 'text-[#111111] border-b-2 border-[#111111]'}`
                : `${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`
            }`}
            data-testid={`filter-tab-${tab.id}`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export { FILTER_TABS };
