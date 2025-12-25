import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, UserPlus, Check, X, Users, Clock, Loader2, Globe, MessageCircle } from "lucide-react";

interface Profile {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  is_online: boolean | null;
}

interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
  friend_profile?: Profile;
  requester_profile?: Profile;
}

interface FriendsDialogProps {
  trigger: React.ReactNode;
  onStartChat?: (friendUserId: string) => void;
}

const FriendsDialog = ({ trigger, onStartChat }: FriendsDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friendship[]>([]);
  const [sentRequests, setSentRequests] = useState<Friendship[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && user) {
      fetchAllData();

      // Real-time subscription for friendships
      const friendshipChannel = supabase
        .channel('friendships-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'friendships' },
          () => fetchAllData()
        )
        .subscribe();

      // Real-time subscription for new profiles
      const profileChannel = supabase
        .channel('profiles-changes')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'profiles' },
          () => fetchAllUsers()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(friendshipChannel);
        supabase.removeChannel(profileChannel);
      };
    }
  }, [open, user]);

  const fetchAllData = async () => {
    if (!user) return;
    setIsLoading(true);
    await Promise.all([
      fetchAllUsers(),
      fetchFriends(),
      fetchPendingRequests(),
      fetchSentRequests()
    ]);
    setIsLoading(false);
  };

  const fetchAllUsers = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('user_id', user.id)
      .order('username');

    if (!error && data) {
      setAllUsers(data);
    }
  };

  const fetchFriends = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('friendships')
      .select('*')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .eq('status', 'accepted');

    if (data && !error) {
      const friendIds = data.map(f => f.user_id === user.id ? f.friend_id : f.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', friendIds);

      const friendsWithProfiles = data.map(f => ({
        ...f,
        friend_profile: profiles?.find(p => p.user_id === (f.user_id === user.id ? f.friend_id : f.user_id))
      }));

      setFriends(friendsWithProfiles);
    }
  };

  const fetchPendingRequests = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('friendships')
      .select('*')
      .eq('friend_id', user.id)
      .eq('status', 'pending');

    if (data && !error) {
      const requesterIds = data.map(f => f.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', requesterIds);

      const requestsWithProfiles = data.map(f => ({
        ...f,
        requester_profile: profiles?.find(p => p.user_id === f.user_id)
      }));

      setPendingRequests(requestsWithProfiles);
    }
  };

  const fetchSentRequests = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('friendships')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending');

    if (!error && data) {
      setSentRequests(data);
    }
  };

  const getFriendshipStatus = (profileUserId: string): 'none' | 'friends' | 'pending_sent' | 'pending_received' => {
    if (friends.some(f => 
      f.friend_profile?.user_id === profileUserId || 
      (f.user_id === profileUserId || f.friend_id === profileUserId)
    )) {
      return 'friends';
    }
    if (sentRequests.some(r => r.friend_id === profileUserId)) {
      return 'pending_sent';
    }
    if (pendingRequests.some(r => r.user_id === profileUserId)) {
      return 'pending_received';
    }
    return 'none';
  };

  const getPendingRequestId = (profileUserId: string): string | null => {
    const request = pendingRequests.find(r => r.user_id === profileUserId);
    return request?.id || null;
  };

  const sendFriendRequest = async (friendUserId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('friendships')
        .insert({
          user_id: user.id,
          friend_id: friendUserId,
          status: 'pending'
        });

      if (error) throw error;
      toast.success('Follow request sent!');
      fetchSentRequests();
    } catch (error: any) {
      toast.error(error.message || 'Failed to send request');
    }
  };

  const respondToRequest = async (friendshipId: string, accept: boolean) => {
    try {
      if (accept) {
        const { error } = await supabase
          .from('friendships')
          .update({ status: 'accepted' })
          .eq('id', friendshipId);

        if (error) throw error;
        toast.success('Request accepted! You are now friends.');
      } else {
        const { error } = await supabase
          .from('friendships')
          .delete()
          .eq('id', friendshipId);

        if (error) throw error;
        toast.success('Request declined');
      }

      fetchAllData();
    } catch (error: any) {
      toast.error('Failed to respond to request');
    }
  };

  const handleStartChat = (friendUserId: string) => {
    if (onStartChat) {
      onStartChat(friendUserId);
      setOpen(false);
    }
  };

  const filteredUsers = searchQuery.trim()
    ? allUsers.filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()))
    : allUsers;

  const renderUserCard = (profile: Profile, showActions: boolean = true) => {
    const status = getFriendshipStatus(profile.user_id);
    const requestId = getPendingRequestId(profile.user_id);

    return (
      <div
        key={profile.id}
        className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-all"
      >
        <div className="relative">
          <img
            src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.user_id}`}
            alt={profile.username}
            className="h-12 w-12 rounded-full object-cover ring-2 ring-border"
          />
          {profile.is_online && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{profile.username}</p>
          <p className="text-sm text-muted-foreground truncate">
            {profile.bio || 'No bio yet'}
          </p>
        </div>
        {showActions && (
          <div className="flex gap-2 flex-shrink-0">
            {status === 'none' && (
              <Button
                size="sm"
                onClick={() => sendFriendRequest(profile.user_id)}
                className="gap-1"
              >
                <UserPlus className="h-4 w-4" />
                Follow
              </Button>
            )}
            {status === 'pending_sent' && (
              <Badge variant="secondary" className="px-3 py-1">
                <Clock className="h-3 w-3 mr-1" />
                Pending
              </Badge>
            )}
            {status === 'pending_received' && requestId && (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  onClick={() => respondToRequest(requestId, true)}
                  className="gap-1"
                >
                  <Check className="h-4 w-4" />
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => respondToRequest(requestId, false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            {status === 'friends' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStartChat(profile.user_id)}
                className="gap-1"
              >
                <MessageCircle className="h-4 w-4" />
                Chat
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0">
        <div className="p-4 pb-2 border-b border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Users className="h-5 w-5" />
              People
            </DialogTitle>
          </DialogHeader>
        </div>

        <Tabs defaultValue="discover" className="flex-1 flex flex-col min-h-0">
          <div className="px-4">
            <TabsList className="w-full">
              <TabsTrigger value="discover" className="flex-1 gap-1">
                <Globe className="h-4 w-4" />
                Discover
              </TabsTrigger>
              <TabsTrigger value="requests" className="flex-1 gap-1">
                <Clock className="h-4 w-4" />
                Requests
                {pendingRequests.length > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs flex items-center justify-center">
                    {pendingRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="friends" className="flex-1 gap-1">
                <Users className="h-4 w-4" />
                Friends
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Discover Tab - All Users */}
          <TabsContent value="discover" className="flex-1 flex flex-col mt-0 px-4 pb-4 min-h-0">
            <div className="py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search people..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Globe className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No users found</p>
                </div>
              ) : (
                <div className="space-y-2 pr-2">
                  {filteredUsers.map(profile => renderUserCard(profile))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests" className="flex-1 flex flex-col mt-0 px-4 pb-4 min-h-0">
            <ScrollArea className="flex-1 pt-3">
              {pendingRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No pending requests</p>
                  <p className="text-sm text-muted-foreground/70">When someone follows you, it will appear here</p>
                </div>
              ) : (
                <div className="space-y-2 pr-2">
                  {pendingRequests.map(request => (
                    <div
                      key={request.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20"
                    >
                      <img
                        src={request.requester_profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${request.requester_profile?.user_id}`}
                        alt={request.requester_profile?.username}
                        className="h-12 w-12 rounded-full object-cover ring-2 ring-primary/30"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">{request.requester_profile?.username}</p>
                        <p className="text-sm text-muted-foreground">wants to follow you</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => respondToRequest(request.id, true)}
                          className="gap-1"
                        >
                          <Check className="h-4 w-4" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => respondToRequest(request.id, false)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Friends Tab */}
          <TabsContent value="friends" className="flex-1 flex flex-col mt-0 px-4 pb-4 min-h-0">
            <ScrollArea className="flex-1 pt-3">
              {friends.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No friends yet</p>
                  <p className="text-sm text-muted-foreground/70">Follow people to become friends</p>
                </div>
              ) : (
                <div className="space-y-2 pr-2">
                  {friends.map(friend => (
                    <div
                      key={friend.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-all cursor-pointer"
                      onClick={() => friend.friend_profile && handleStartChat(friend.friend_profile.user_id)}
                    >
                      <div className="relative">
                        <img
                          src={friend.friend_profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.friend_profile?.user_id}`}
                          alt={friend.friend_profile?.username}
                          className="h-12 w-12 rounded-full object-cover ring-2 ring-border"
                        />
                        {friend.friend_profile?.is_online && (
                          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">{friend.friend_profile?.username}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {friend.friend_profile?.bio || 'No bio'}
                        </p>
                      </div>
                      <Button size="sm" variant="ghost" className="gap-1">
                        <MessageCircle className="h-4 w-4" />
                        Chat
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default FriendsDialog;
