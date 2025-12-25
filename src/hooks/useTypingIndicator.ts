import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Typing indicator hook
export const useTypingIndicator = (conversationId: string | null) => {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Broadcast that user is typing
  const sendTyping = useCallback(() => {
    if (!conversationId || !user || !channelRef.current) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: user.id }
    });
  }, [conversationId, user]);

  // Broadcast that user stopped typing
  const sendStopTyping = useCallback(() => {
    if (!conversationId || !user || !channelRef.current) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'stop_typing',
      payload: { user_id: user.id }
    });
  }, [conversationId, user]);

  // Handle input change with debounce
  const handleTyping = useCallback(() => {
    sendTyping();

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing after 2 seconds
    typingTimeoutRef.current = setTimeout(() => {
      sendStopTyping();
    }, 2000);
  }, [sendTyping, sendStopTyping]);

  useEffect(() => {
    if (!conversationId || !user) return;

    // Create channel for this conversation
    const channel = supabase.channel(`typing:${conversationId}`);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.user_id !== user.id) {
          setTypingUsers(prev => {
            if (!prev.includes(payload.user_id)) {
              return [...prev, payload.user_id];
            }
            return prev;
          });

          // Auto-remove after 3 seconds if no update
          setTimeout(() => {
            setTypingUsers(prev => prev.filter(id => id !== payload.user_id));
          }, 3000);
        }
      })
      .on('broadcast', { event: 'stop_typing' }, ({ payload }) => {
        if (payload.user_id !== user.id) {
          setTypingUsers(prev => prev.filter(id => id !== payload.user_id));
        }
      })
      .subscribe();

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [conversationId, user]);

  return {
    typingUsers,
    handleTyping,
    sendStopTyping
  };
};
