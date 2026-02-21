import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  MessageCircle, FolderOpen, ShoppingBag, Users, BarChart3,
  Settings, Bell, ChevronLeft, ChevronRight, LogOut
} from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

const NAV_ITEMS = {
  workspace: [
    { id: 'chats', label: 'All Chats', icon: MessageCircle },
    { id: 'projects', label: 'Projects', icon: FolderOpen },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'agents', label: 'Agents', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ],
  settings: [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ]
};

export default function Sidebar({ activeView, setActiveView, folded, onToggle, onLogout, agent }) {
  return (
    <TooltipProvider delayDuration={100}>
      <aside className={`hidden md:flex flex-col bg-[#111111] text-white transition-all duration-300 ${folded ? 'w-16' : 'w-56'}`}>
        {/* Toggle Button */}
        <div className="p-3 flex justify-end border-b border-white/10">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg"
            data-testid="sidebar-toggle"
          >
            {folded ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        {/* Agent Profile */}
        {agent && (
          <div className={`p-3 border-b border-white/10 ${folded ? 'flex justify-center' : ''}`}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`flex items-center gap-3 ${folded ? 'justify-center' : ''}`}>
                  <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-sm font-medium shrink-0">
                    {agent.name?.[0]?.toUpperCase()}
                  </div>
                  {!folded && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{agent.name}</p>
                      <p className="text-xs text-gray-400 truncate">{agent.email}</p>
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              {folded && <TooltipContent side="right">{agent.name}</TooltipContent>}
            </Tooltip>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 flex flex-col justify-center py-4">
          {/* Workspace Section */}
          {!folded && (
            <p className="px-4 mb-2 text-[10px] uppercase tracking-wider text-gray-500">Workspace</p>
          )}
          <div className="space-y-1 px-2">
            {NAV_ITEMS.workspace.map((item) => (
              <NavItem
                key={item.id}
                item={item}
                active={activeView === item.id}
                folded={folded}
                onClick={() => setActiveView(item.id)}
              />
            ))}
          </div>

          {/* Settings Section */}
          <div className="mt-6">
            {!folded && (
              <p className="px-4 mb-2 text-[10px] uppercase tracking-wider text-gray-500">Settings</p>
            )}
            <div className="space-y-1 px-2">
              {NAV_ITEMS.settings.map((item) => (
                <NavItem
                  key={item.id}
                  item={item}
                  active={activeView === item.id}
                  folded={folded}
                  onClick={() => setActiveView(item.id)}
                />
              ))}
            </div>
          </div>
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/10">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                onClick={onLogout}
                className={`w-full text-gray-400 hover:text-white hover:bg-white/10 ${folded ? 'px-0 justify-center' : 'justify-start'}`}
                data-testid="logout-btn"
              >
                <LogOut className="w-4 h-4" />
                {!folded && <span className="ml-3">Logout</span>}
              </Button>
            </TooltipTrigger>
            {folded && <TooltipContent side="right">Logout</TooltipContent>}
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}

function NavItem({ item, active, folded, onClick }) {
  const Icon = item.icon;
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
            active
              ? 'bg-white text-[#111111] font-medium'
              : 'text-gray-400 hover:bg-white/10 hover:text-white'
          } ${folded ? 'justify-center px-0' : ''}`}
          data-testid={`nav-${item.id}`}
        >
          <Icon className="w-5 h-5 shrink-0" />
          {!folded && <span className="text-sm">{item.label}</span>}
        </button>
      </TooltipTrigger>
      {folded && <TooltipContent side="right">{item.label}</TooltipContent>}
    </Tooltip>
  );
}
