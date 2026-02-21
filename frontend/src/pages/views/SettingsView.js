import { useState } from 'react';
import { Settings, Moon, Sun, Shield, Volume2 } from 'lucide-react';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';
import { useTheme } from '../../context/ThemeContext';

export default function SettingsView() {
  const { theme, toggleTheme, isDark } = useTheme();
  const [settings, setSettings] = useState({
    soundEnabled: true,
    desktopNotifications: true,
    showOnlineStatus: true,
  });

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const bgColor = isDark ? 'bg-[#111111]' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-[#111111]';
  const mutedText = isDark ? 'text-gray-400' : 'text-gray-500';
  const cardBg = isDark ? 'bg-[#1a1a1a] border-[#333]' : 'bg-white border-gray-200';
  const iconBg = isDark ? 'bg-[#2a2a2a]' : 'bg-gray-100';

  return (
    <div className={`h-full flex flex-col p-6 max-w-2xl ${bgColor}`}>
      <div className="mb-6">
        <h1 className={`text-2xl font-semibold ${textColor}`}>General Settings</h1>
        <p className={`text-sm ${mutedText} mt-1`}>Manage your preferences</p>
      </div>

      <div className="space-y-6">
        {/* Appearance */}
        <div className={`border rounded-xl p-5 ${cardBg}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
              {isDark ? <Moon className={`w-5 h-5 ${textColor}`} /> : <Sun className={`w-5 h-5 ${textColor}`} />}
            </div>
            <h3 className={`font-medium ${textColor}`}>Appearance</h3>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label className={`text-sm ${textColor}`}>Dark Mode</Label>
              <p className={`text-xs ${mutedText}`}>Switch between light and dark theme</p>
              <p className={`text-xs ${mutedText} mt-1`}>Applies to dashboard and client chat widget</p>
            </div>
            <Switch
              checked={isDark}
              onCheckedChange={toggleTheme}
              data-testid="theme-toggle-switch"
            />
          </div>
        </div>

        {/* Sound */}
        <div className={`border rounded-xl p-5 ${cardBg}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
              <Volume2 className={`w-5 h-5 ${textColor}`} />
            </div>
            <h3 className={`font-medium ${textColor}`}>Sound & Alerts</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className={`text-sm ${textColor}`}>Notification Sound</Label>
                <p className={`text-xs ${mutedText}`}>Play sound for new messages</p>
              </div>
              <Switch
                checked={settings.soundEnabled}
                onCheckedChange={(v) => updateSetting('soundEnabled', v)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className={`text-sm ${textColor}`}>Desktop Notifications</Label>
                <p className={`text-xs ${mutedText}`}>Show browser notifications</p>
              </div>
              <Switch
                checked={settings.desktopNotifications}
                onCheckedChange={(v) => updateSetting('desktopNotifications', v)}
              />
            </div>
          </div>
        </div>

        {/* Privacy */}
        <div className={`border rounded-xl p-5 ${cardBg}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
              <Shield className={`w-5 h-5 ${textColor}`} />
            </div>
            <h3 className={`font-medium ${textColor}`}>Privacy</h3>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label className={`text-sm ${textColor}`}>Online Status</Label>
              <p className={`text-xs ${mutedText}`}>Show when you're online to visitors</p>
            </div>
            <Switch 
              checked={settings.showOnlineStatus}
              onCheckedChange={(v) => updateSetting('showOnlineStatus', v)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
