import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  type: string;
  file_url: string | null;
  is_read: boolean | null;
  created_at: string | null;
}

export interface ConversationWithDetails {
  id: string;
  type: string;
  name: string | null;
  avatar_url: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  participants: {
    user_id: string;
    username: string;
    avatar_url: string | null;
    is_online: boolean | null;
  }[];
  last_message?: Message;
  unread_count: number;
}

export const useRealTimeMessages = (conversationId: string | null, onMessagesRead?: () => void) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch messages for a conversation and mark unread as read
  const fetchMessages = useCallback(async () => {
    if (!conversationId || !user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark unread messages from others as read
      const unreadMessageIds = (data || [])
        .filter(m => m.sender_id !== user.id && !m.is_read)
        .map(m => m.id);

      if (unreadMessageIds.length > 0) {
        const { error: updateError } = await supabase
          .from('messages')
          .update({ is_read: true })
          .in('id', unreadMessageIds);
        
        if (!updateError && onMessagesRead) {
          onMessagesRead();
        }
      }
    } catch (error: any) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, user, onMessagesRead]);

  // Send a message
  const sendMessage = useCallback(async (content: string, type: string = 'text', fileUrl?: string) => {
    if (!conversationId || !user || !content.trim()) return null;

    const trimmedContent = content.trim();
    
    // Client-side validation for message length
    if (trimmedContent.length > 5000) {
      toast.error('Message is too long (max 5000 characters)');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: trimmedContent,
          type,
          file_url: fileUrl || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      toast.error('Failed to send message');
      console.error('Error sending message:', error);
      return null;
    }
  }, [conversationId, user]);

  // Delete a message
  const deleteMessage = useCallback(async (messageId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', user.id);

      if (error) throw error;
      
      // Optimistically remove from state
      setMessages(prev => prev.filter(m => m.id !== messageId));
      toast.success('Message deleted');
      return true;
    } catch (error: any) {
      toast.error('Failed to delete message');
      console.error('Error deleting message:', error);
      return false;
    }
  }, [user]);

  // Mark a single message as read
  const markMessageAsRead = useCallback(async (messageId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId)
        .neq('sender_id', user.id);
      
      if (!error && onMessagesRead) {
        onMessagesRead();
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }, [user, onMessagesRead]);

  // Set up real-time subscription
  useEffect(() => {
    if (!conversationId || !user) return;

    fetchMessages();

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => {
            // Avoid duplicates by checking if message already exists
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
          
          // Auto-mark as read if it's from someone else and we're viewing this conversation
          if (newMessage.sender_id !== user.id) {
            await markMessageAsRead(newMessage.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updatedMessage = payload.new as Message;
          setMessages(prev =>
            prev.map(m => m.id === updatedMessage.id ? updatedMessage : m)
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const deletedMessage = payload.old as { id: string };
          setMessages(prev => prev.filter(m => m.id !== deletedMessage.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user, fetchMessages, markMessageAsRead]);

  return {
    messages,
    isLoading,
    sendMessage,
    deleteMessage,
    refetch: fetchMessages,
  };
};

export const useConversations = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      // Get conversations the user is part of
      const { data: participantData, error: participantError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (participantError) throw participantError;

      const conversationIds = participantData?.map(p => p.conversation_id) || [];

      if (conversationIds.length === 0) {
        setConversations([]);
        setIsLoading(false);
        return;
      }

      // Get conversation details
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .in('id', conversationIds)
        .order('updated_at', { ascending: false });

      if (convError) throw convError;

      // Get all participants for these conversations
      const { data: allParticipants, error: allParticipantsError } = await supabase
        .from('conversation_participants')
        .select('conversation_id, user_id')
        .in('conversation_id', conversationIds);

      if (allParticipantsError) throw allParticipantsError;

      // Get profiles for all participants
      const participantUserIds = [...new Set(allParticipants?.map(p => p.user_id) || [])];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, is_online')
        .in('user_id', participantUserIds);

      if (profilesError) throw profilesError;

      // Get last message for each conversation
      const conversationsWithDetails = await Promise.all(
        (convData || []).map(async (conv) => {
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Get unread count
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .neq('sender_id', user.id);

          // Get participants for this conversation - deduplicate by user_id
          const seenUserIds = new Set<string>();
          const convParticipants = allParticipants
            ?.filter(p => p.conversation_id === conv.id)
            .filter(p => {
              if (seenUserIds.has(p.user_id)) return false;
              seenUserIds.add(p.user_id);
              return true;
            })
            .map(p => {
              const profile = profiles?.find(pr => pr.user_id === p.user_id);
              return {
                user_id: p.user_id,
                username: profile?.username || 'Unknown',
                avatar_url: profile?.avatar_url,
                is_online: profile?.is_online,
              };
            }) || [];

          return {
            ...conv,
            participants: convParticipants,
            last_message: lastMsg || undefined,
            unread_count: count || 0,
          };
        })
      );

      setConversations(conversationsWithDetails);
    } catch (error: any) {
      console.error('Error fetching conversations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Create or get direct conversation with a user
  const getOrCreateDirectConversation = useCallback(async (otherUserId: string) => {
    if (!user) return null;

    try {
      // Check if direct conversation exists
      const { data: myConvs } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      const { data: theirConvs } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', otherUserId);

      const myConvIds = new Set(myConvs?.map(c => c.conversation_id) || []);
      const theirConvIds = theirConvs?.map(c => c.conversation_id) || [];
      const commonConvIds = theirConvIds.filter(id => myConvIds.has(id));

      if (commonConvIds.length > 0) {
        // Check if any is a direct conversation
        const { data: directConv } = await supabase
          .from('conversations')
          .select('*')
          .in('id', commonConvIds)
          .eq('type', 'direct')
          .maybeSingle();

        if (directConv) {
          return directConv.id;
        }
      }

      // Create new conversation - trigger auto-sets created_by from auth.uid()
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          type: 'direct',
          // NOTE: created_by is auto-set by database trigger from auth.uid()
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add participants
      const { error: partError } = await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: newConv.id, user_id: user.id },
          { conversation_id: newConv.id, user_id: otherUserId },
        ]);

      if (partError) throw partError;

      await fetchConversations();
      return newConv.id;
    } catch (error: any) {
      toast.error('Failed to start conversation');
      console.error('Error creating conversation:', error);
      return null;
    }
  }, [user, fetchConversations]);

  useEffect(() => {
    fetchConversations();

    // Subscribe to conversation updates
    const channel = supabase
      .channel('conversations-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConversations]);

  return {
    conversations,
    isLoading,
    refetch: fetchConversations,
    getOrCreateDirectConversation,
  };
};
