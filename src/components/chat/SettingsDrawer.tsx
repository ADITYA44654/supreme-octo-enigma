import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AvatarPicker from "./AvatarPicker";
import {
  Settings,
  User,
  Shield,
  Bell,
  Moon,
  LogOut,
  Save,
  Loader2,
  ChevronRight,
  Eye,
  EyeOff,
  MessageCircle,
  Volume2,
  Vibrate
} from "lucide-react";

interface SettingsDrawerProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const SettingsDrawer = ({ trigger, open: controlledOpen, onOpenChange }: SettingsDrawerProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Support both controlled and uncontrolled modes
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [activeTab, setActiveTab] = useState<'profile' | 'privacy' | 'notifications'>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState({
    username: '',
    bio: '',
    avatar_url: '',
  });
  const [settings, setSettings] = useState({
    showOnlineStatus: true,
    showLastSeen: true,
    showReadReceipts: true,
    messageNotifications: true,
    soundEnabled: true,
    vibrationEnabled: true,
  });

  useEffect(() => {
    if (isOpen && user) {
      fetchProfile();
    }
  }, [isOpen, user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data && !error) {
      setProfile({
        username: data.username || '',
        bio: data.bio || '',
        avatar_url: data.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
      });
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: profile.username,
          bio: profile.bio,
        })
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('Profile updated!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    setOpen(false);
    navigate('/login');
  };

  const menuItems = [
    { id: 'profile', icon: User, label: 'Account' },
    { id: 'privacy', icon: Shield, label: 'Privacy' },
    { id: 'notifications', icon: Bell, label: 'Notifications' },
  ] as const;

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      {trigger && (
        <SheetTrigger asChild>
          {trigger}
        </SheetTrigger>
      )}
      <SheetContent side="left" className="w-full sm:w-[400px] p-0">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-border bg-muted/30">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2 text-xl">
                <Settings className="h-5 w-5" />
                Settings
              </SheetTitle>
            </SheetHeader>
          </div>

          {/* Navigation */}
          <div className="p-4 border-b border-border">
            <div className="flex gap-2">
              {menuItems.map(item => (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab(item.id)}
                  className="flex-1"
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-6">
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  {/* Avatar */}
                  <div className="flex justify-center">
                    <div className="relative group">
                      <div className="h-28 w-28 rounded-full overflow-hidden ring-4 ring-primary/30 shadow-xl">
                        <img
                          src={profile.avatar_url}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {user && (
                        <AvatarPicker
                          currentAvatar={profile.avatar_url}
                          userId={user.id}
                          onAvatarChange={(url) => setProfile(prev => ({ ...prev, avatar_url: url }))}
                        />
                      )}
                    </div>
                  </div>

                  {/* Username */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Username</label>
                    <Input
                      value={profile.username}
                      onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                      placeholder="Your username"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <Input value={user?.email || ''} disabled className="opacity-60" />
                  </div>

                  {/* Bio */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Bio</label>
                    <Textarea
                      value={profile.bio}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      placeholder="Tell us about yourself..."
                      rows={3}
                      className="resize-none"
                    />
                  </div>

                  <Button onClick={handleSaveProfile} className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              )}

              {activeTab === 'privacy' && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Visibility
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Show Online Status</p>
                          <p className="text-sm text-muted-foreground">Let others see when you're online</p>
                        </div>
                        <Switch
                          checked={settings.showOnlineStatus}
                          onCheckedChange={(checked) => setSettings({ ...settings, showOnlineStatus: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Show Last Seen</p>
                          <p className="text-sm text-muted-foreground">Display when you were last active</p>
                        </div>
                        <Switch
                          checked={settings.showLastSeen}
                          onCheckedChange={(checked) => setSettings({ ...settings, showLastSeen: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Read Receipts</p>
                          <p className="text-sm text-muted-foreground">Show when you've read messages</p>
                        </div>
                        <Switch
                          checked={settings.showReadReceipts}
                          onCheckedChange={(checked) => setSettings({ ...settings, showReadReceipts: checked })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Messages
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Message Notifications</p>
                          <p className="text-sm text-muted-foreground">Get notified for new messages</p>
                        </div>
                        <Switch
                          checked={settings.messageNotifications}
                          onCheckedChange={(checked) => setSettings({ ...settings, messageNotifications: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium flex items-center gap-2">
                            <Volume2 className="h-4 w-4" />
                            Sound
                          </p>
                          <p className="text-sm text-muted-foreground">Play sound for notifications</p>
                        </div>
                        <Switch
                          checked={settings.soundEnabled}
                          onCheckedChange={(checked) => setSettings({ ...settings, soundEnabled: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium flex items-center gap-2">
                            <Vibrate className="h-4 w-4" />
                            Vibration
                          </p>
                          <p className="text-sm text-muted-foreground">Vibrate for notifications</p>
                        </div>
                        <Switch
                          checked={settings.vibrationEnabled}
                          onCheckedChange={(checked) => setSettings({ ...settings, vibrationEnabled: checked })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Logout Button */}
          <div className="p-4 border-t border-border">
            <Button variant="destructive" onClick={handleLogout} className="w-full">
              <LogOut className="h-4 w-4 mr-2" />
              Log Out
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SettingsDrawer;
