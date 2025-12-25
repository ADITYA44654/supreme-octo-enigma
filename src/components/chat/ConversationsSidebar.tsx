import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Users, MessageCircle, Loader2, Plus, ArrowLeft, MoreHorizontal, Sun, Moon, Monitor, Settings, UserPlus, Archive, Star, Phone, UsersRound } from "lucide-react";
import { ConversationWithDetails, useConversations } from "@/hooks/useRealTimeMessages";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import SettingsDrawer from "./SettingsDrawer";
import FriendsDialog from "./FriendsDialog";
import CreateGroupDialog from "./CreateGroupDialog";
import CallHistoryDialog from "./CallHistoryDialog";
import FastAvatar from "./FastAvatar";
import { format, isToday, isYesterday } from "date-fns";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";

interface Profile {
  user_id: string;
  username: string;
  avatar_url: string | null;
  is_online: boolean | null;
}

interface ConversationsSidebarProps {
  activeConversation: ConversationWithDetails | null;
  onSelectConversation: (conversation: ConversationWithDetails) => void;
  isUserOnline?: (userId: string) => boolean;
}

const ConversationsSidebar = ({ activeConversation, onSelectConversation, isUserOnline }: ConversationsSidebarProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFriends, setActiveFriends] = useState<Profile[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { user } = useAuth();
  const { conversations, isLoading, getOrCreateDirectConversation, refetch } = useConversations();

  // Fetch active/online friends
  useEffect(() => {
    const fetchActiveFriends = async () => {
      if (!user) return;

      const { data: friendships } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq('status', 'accepted');

      if (!friendships?.length) return;

      const friendIds = friendships.map(f => 
        f.user_id === user.id ? f.friend_id : f.user_id
      );

      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', friendIds);

      if (profiles) {
        setActiveFriends(profiles);
      }
    };

    fetchActiveFriends();
  }, [user]);

  const filteredConversations = conversations.filter(conv => {
    const otherParticipant = conv.participants.find(p => p.user_id !== user?.id);
    const name = conv.type === 'group' 
      ? conv.name 
      : otherParticipant?.username;
    return name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleStartChatWithFriend = async (friendUserId: string) => {
    const conversationId = await getOrCreateDirectConversation(friendUserId);
    if (conversationId) {
      await refetch();
      const conv = conversations.find(c => c.id === conversationId);
      if (conv) {
        onSelectConversation(conv);
      }
    }
  };

  const formatLastMessageTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'dd MMM');
  };

  const { theme, setTheme } = useTheme();

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-border">
        <SettingsDrawer
          trigger={
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          }
        />
        <h1 className="text-xl font-bold">Message</h1>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem className="gap-2" onClick={() => setTheme("light")}>
              <Sun className="h-4 w-4" />
              Light Mode
              {theme === "light" && <span className="ml-auto text-primary">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2" onClick={() => setTheme("dark")}>
              <Moon className="h-4 w-4" />
              Dark Mode
              {theme === "dark" && <span className="ml-auto text-primary">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2" onClick={() => setTheme("system")}>
              <Monitor className="h-4 w-4" />
              System
              {theme === "system" && <span className="ml-auto text-primary">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2" onClick={() => toast.info("Starred messages coming soon!")}>
              <Star className="h-4 w-4" />
              Starred Messages
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2" onClick={() => toast.info("Archived chats coming soon!")}>
              <Archive className="h-4 w-4" />
              Archived Chats
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <FriendsDialog
              trigger={
                <DropdownMenuItem className="gap-2" onSelect={(e) => e.preventDefault()}>
                  <UserPlus className="h-4 w-4" />
                  Add Friends
                </DropdownMenuItem>
              }
              onStartChat={handleStartChatWithFriend}
            />
            <CreateGroupDialog
              trigger={
                <DropdownMenuItem className="gap-2" onSelect={(e) => e.preventDefault()}>
                  <UsersRound className="h-4 w-4" />
                  Create Group
                </DropdownMenuItem>
              }
              onGroupCreated={() => refetch()}
            />
            <CallHistoryDialog
              trigger={
                <DropdownMenuItem className="gap-2" onSelect={(e) => e.preventDefault()}>
                  <Phone className="h-4 w-4" />
                  Call History
                </DropdownMenuItem>
              }
            />
            <DropdownMenuItem className="gap-2" onClick={() => setSettingsOpen(true)}>
              <Settings className="h-4 w-4" />
              Settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Settings drawer controlled by state */}
        <SettingsDrawer open={settingsOpen} onOpenChange={setSettingsOpen} />
      </div>

      {/* Search */}
      <div className="px-5 py-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search People"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 bg-muted/50 border-0 rounded-full"
          />
        </div>
      </div>

      {/* Active Friends Section */}
      <div className="px-5 pb-4">
        <h2 className="text-lg font-semibold mb-3">Active</h2>
        <div className="flex items-start gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {/* Add Friend Button */}
          <FriendsDialog
            trigger={
              <button className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div 
                  className="rounded-full border-2 border-dashed border-primary/50 flex items-center justify-center hover:border-primary hover:bg-primary/5 transition-all"
                  style={{ width: 56, height: 56 }}
                >
                  <Plus className="h-5 w-5 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">Add</span>
              </button>
            }
            onStartChat={handleStartChatWithFriend}
          />
          
          {/* Active Friends */}
          {activeFriends.map(friend => (
            <button
              key={friend.user_id}
              onClick={() => handleStartChatWithFriend(friend.user_id)}
              className="flex flex-col items-center gap-1.5 flex-shrink-0"
            >
                <FastAvatar
                  src={friend.avatar_url}
                  seed={friend.username || friend.user_id}
                  alt={friend.username}
                  size="lg"
                  isOnline={isUserOnline ? isUserOnline(friend.user_id) : (friend.is_online || false)}
                />
              <span className="text-xs font-medium truncate text-center" style={{ width: 56 }}>
                {friend.username?.split(' ')[0] || 'User'}
              </span>
            </button>
          ))}

          {activeFriends.length === 0 && (
            <p className="text-sm text-muted-foreground py-2">Add friends to see them here</p>
          )}
        </div>
      </div>

      {/* Messages Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-5 pb-3">
          <h2 className="text-lg font-semibold">Message</h2>
        </div>

        <ScrollArea className="flex-1 px-3">
          <div className="space-y-1 pb-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredConversations.length > 0 ? (
              filteredConversations.map(conversation => {
                const otherParticipant = conversation.participants.find(p => p.user_id !== user?.id);
                const displayName = conversation.type === 'group' 
                  ? conversation.name 
                  : otherParticipant?.username || 'Unknown';
                const isActive = activeConversation?.id === conversation.id;

                return (
                  <div
                    key={conversation.id}
                    onClick={() => onSelectConversation(conversation)}
                    className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-200 ${
                      isActive 
                        ? 'bg-primary/10' 
                        : 'hover:bg-muted/50'
                    }`}
                  >
                      <FastAvatar
                        src={conversation.type === 'group' ? conversation.avatar_url : otherParticipant?.avatar_url}
                        seed={displayName || otherParticipant?.user_id || conversation.id}
                        alt={displayName || ''}
                        size="lg"
                        isOnline={conversation.type === 'direct' && otherParticipant?.user_id 
                          ? (isUserOnline ? isUserOnline(otherParticipant.user_id) : (otherParticipant?.is_online || false))
                          : false}
                      />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h3 className="font-semibold text-base truncate">{displayName}</h3>
                        {conversation.last_message?.created_at && (
                          <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                            {formatLastMessageTime(conversation.last_message.created_at)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {conversation.last_message?.content || 'No messages yet'}
                      </p>
                    </div>

                    {conversation.unread_count > 0 && (
                      <span className="flex-shrink-0 h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                        {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                      </span>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-center p-4">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <MessageCircle className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">No messages yet</p>
                <p className="text-sm text-muted-foreground/70 mb-4">Add friends to start chatting!</p>
                <FriendsDialog
                  trigger={
                    <Button variant="outline" size="sm" className="rounded-full">
                      <Users className="h-4 w-4 mr-2" />
                      Find Friends
                    </Button>
                  }
                  onStartChat={handleStartChatWithFriend}
                />
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default ConversationsSidebar;
