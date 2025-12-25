import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import FastAvatar from "./FastAvatar";
import { toast } from "sonner";

interface Friend {
  user_id: string;
  username: string;
  avatar_url: string | null;
}

interface CreateGroupDialogProps {
  trigger: React.ReactNode;
  onGroupCreated?: (conversationId: string) => void;
}

const CreateGroupDialog = ({ trigger, onGroupCreated }: CreateGroupDialogProps) => {
  const [open, setOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (open && user) {
      fetchFriends();
    }
  }, [open, user]);

  const fetchFriends = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const { data: friendships } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq('status', 'accepted');

      if (!friendships?.length) {
        setFriends([]);
        setIsLoading(false);
        return;
      }

      const friendIds = friendships.map(f => 
        f.user_id === user.id ? f.friend_id : f.user_id
      );

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', friendIds);

      setFriends(profiles || []);
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFriend = (userId: string) => {
    setSelectedFriends(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const createGroup = async () => {
    if (!user || !groupName.trim() || selectedFriends.length < 1) {
      toast.error('Please enter a group name and select at least 1 friend');
      return;
    }

    setIsCreating(true);

    try {
      // Create conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          type: 'group',
          name: groupName.trim(),
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add participants (including self)
      const participants = [user.id, ...selectedFriends].map(userId => ({
        conversation_id: conversation.id,
        user_id: userId,
      }));

      const { error: partError } = await supabase
        .from('conversation_participants')
        .insert(participants);

      if (partError) throw partError;

      toast.success('Group created successfully!');
      setOpen(false);
      setGroupName("");
      setSelectedFriends([]);
      onGroupCreated?.(conversation.id);
    } catch (error: any) {
      console.error('Error creating group:', error);
      toast.error('Failed to create group');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Create Group Chat
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="groupName">Group Name</Label>
            <Input
              id="groupName"
              placeholder="Enter group name..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Select Members ({selectedFriends.length} selected)</Label>
            <ScrollArea className="h-[200px] border rounded-lg p-2">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : friends.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No friends to add. Add friends first!
                </p>
              ) : (
                <div className="space-y-2">
                  {friends.map(friend => (
                    <div
                      key={friend.user_id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleFriend(friend.user_id)}
                    >
                      <Checkbox
                        checked={selectedFriends.includes(friend.user_id)}
                        onCheckedChange={() => toggleFriend(friend.user_id)}
                      />
                      <FastAvatar
                        src={friend.avatar_url}
                        seed={friend.username || friend.user_id}
                        alt={friend.username}
                        size="sm"
                      />
                      <span className="font-medium">{friend.username}</span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <Button
            onClick={createGroup}
            disabled={isCreating || !groupName.trim() || selectedFriends.length < 1}
            className="w-full"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Users className="h-4 w-4 mr-2" />
                Create Group ({selectedFriends.length + 1} members)
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupDialog;
