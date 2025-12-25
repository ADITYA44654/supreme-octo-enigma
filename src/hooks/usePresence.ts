import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface PresenceState {
  [key: string]: {
    user_id: string;
    online_at: string;
  }[];
}

export const usePresence = () => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) return;

    // Update database is_online status
    const updateOnlineStatus = async (isOnline: boolean) => {
      try {
        await supabase
          .from('profiles')
          .update({ 
            is_online: isOnline, 
            last_seen: new Date().toISOString() 
          })
          .eq('user_id', user.id);
      } catch (error) {
        console.error('Error updating online status:', error);
      }
    };

    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as PresenceState;
        const online = new Set<string>();
        
        Object.values(state).forEach((presences) => {
          presences.forEach((presence) => {
            if (presence.user_id) {
              online.add(presence.user_id);
            }
          });
        });
        
        setOnlineUsers(online);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        setOnlineUsers((prev) => {
          const updated = new Set(prev);
          newPresences.forEach((p: any) => {
            if (p.user_id) updated.add(p.user_id);
          });
          return updated;
        });
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        setOnlineUsers((prev) => {
          const updated = new Set(prev);
          leftPresences.forEach((p: any) => {
            if (p.user_id) updated.delete(p.user_id);
          });
          return updated;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
          await updateOnlineStatus(true);
        }
      });

    // Heartbeat to keep presence alive
    heartbeatRef.current = setInterval(async () => {
      if (channelRef.current && !document.hidden) {
        await channelRef.current.track({
          user_id: user.id,
          online_at: new Date().toISOString(),
        });
      }
    }, 30000); // Every 30 seconds

    // Handle page visibility changes
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        await updateOnlineStatus(false);
      } else {
        await updateOnlineStatus(true);
        if (channelRef.current) {
          await channelRef.current.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      }
    };

    // Handle before unload
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable offline status update
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}`;
      const data = JSON.stringify({ is_online: false, last_seen: new Date().toISOString() });
      
      navigator.sendBeacon(url, new Blob([data], { type: 'application/json' }));
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      updateOnlineStatus(false);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]);

  const isUserOnline = useCallback((userId: string) => {
    return onlineUsers.has(userId);
  }, [onlineUsers]);

  return { onlineUsers, isUserOnline };
};
