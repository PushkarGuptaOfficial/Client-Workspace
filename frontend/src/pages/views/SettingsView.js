import { useState } from 'react';
import { Settings, Moon, Sun, Globe, Shield } from 'lucide-react';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';
import { useTheme } from '../../context/ThemeContext';

export default function SettingsView() {
  const { theme, toggleTheme } = useTheme();
  const [settings, setSettings] = useState({
    soundEnabled: true,
    desktopNotifications: true,
    emailNotifications: false,
  });

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="h-full flex flex-col p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#111111]">General Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your preferences</p>
      </div>

      <div className="space-y-6">
        {/* Appearance */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            {theme === 'light' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            <h3 className="font-medium text-[#111111]">Appearance</h3>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Dark Mode</Label>
              <p className="text-xs text-gray-400">Switch between light and dark theme</p>
            </div>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={toggleTheme}
            />
          </div>
        </div>

        {/* Sound */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <Settings className="w-5 h-5" />
            <h3 className="font-medium text-[#111111]">Sound & Alerts</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Notification Sound</Label>
                <p className="text-xs text-gray-400">Play sound for new messages</p>
              </div>
              <Switch
                checked={settings.soundEnabled}
                onCheckedChange={(v) => updateSetting('soundEnabled', v)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Desktop Notifications</Label>
                <p className="text-xs text-gray-400">Show browser notifications</p>
              </div>
              <Switch
                checked={settings.desktopNotifications}
                onCheckedChange={(v) => updateSetting('desktopNotifications', v)}
              />
            </div>
          </div>
        </div>

        {/* Privacy */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5" />
            <h3 className="font-medium text-[#111111]">Privacy</h3>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Online Status</Label>
              <p className="text-xs text-gray-400">Show when you're online to visitors</p>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
      </div>
    </div>
  );
}
