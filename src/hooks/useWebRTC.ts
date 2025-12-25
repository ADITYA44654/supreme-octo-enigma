import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface CallState {
  isActive: boolean;
  isIncoming: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  callType: 'voice' | 'video' | null;
  remoteUserId: string | null;
  remoteUsername: string | null;
  conversationId: string | null;
  isGroupCall: boolean;
  participants: string[];
}

interface ICEServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

// Free STUN/TURN servers
const ICE_SERVERS: ICEServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
];

export const useWebRTC = () => {
  const { user } = useAuth();
  const [callState, setCallState] = useState<CallState>({
    isActive: false,
    isIncoming: false,
    isConnecting: false,
    isConnected: false,
    callType: null,
    remoteUserId: null,
    remoteUsername: null,
    conversationId: null,
    isGroupCall: false,
    participants: [],
  });

  const callHistoryIdRef = useRef<string | null>(null);
  const callStartTimeRef = useRef<Date | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // Initialize peer connection
  const createPeerConnection = useCallback(() => {
    console.log('Creating peer connection...');
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = async (event) => {
      if (event.candidate && callState.conversationId && callState.remoteUserId) {
        console.log('Sending ICE candidate:', event.candidate);
        await supabase.from('call_signals' as any).insert({
          conversation_id: callState.conversationId,
          caller_id: user?.id,
          callee_id: callState.remoteUserId,
          type: 'ice-candidate',
          call_type: callState.callType || 'voice',
          payload: { candidate: event.candidate },
        } as any);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected') {
        setCallState(prev => ({ ...prev, isConnecting: false, isConnected: true }));
        toast.success('Call connected!');
      } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        endCall();
      }
    };

    pc.ontrack = (event) => {
      console.log('Received remote track:', event.streams[0]);
      remoteStreamRef.current = event.streams[0];
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [user?.id, callState.conversationId, callState.remoteUserId, callState.callType]);

  // Get user media
  const getUserMedia = useCallback(async (video: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: video ? { facingMode: 'user', width: 640, height: 480 } : false,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (error) {
      console.error('Error getting user media:', error);
      toast.error('Could not access microphone/camera');
      throw error;
    }
  }, []);

  // Start a call (supports both direct and group calls)
  const startCall = useCallback(async (
    conversationId: string,
    remoteUserId: string,
    remoteUsername: string,
    callType: 'voice' | 'video',
    participantIds: string[] = []
  ) => {
    if (!user) return;

    const isGroupCall = participantIds.length > 1;
    console.log('Starting call:', { conversationId, remoteUserId, callType, isGroupCall, participantIds });

    setCallState({
      isActive: true,
      isIncoming: false,
      isConnecting: true,
      isConnected: false,
      callType,
      remoteUserId,
      remoteUsername,
      conversationId,
      isGroupCall,
      participants: participantIds,
    });

    callStartTimeRef.current = new Date();

    try {
      // Get local media
      const stream = await getUserMedia(callType === 'video');
      
      // Create peer connection
      const pc = createPeerConnection();
      
      // Add tracks to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Send call start signal
      await supabase.from('call_signals' as any).insert({
        conversation_id: conversationId,
        caller_id: user.id,
        callee_id: remoteUserId,
        type: 'call-start',
        call_type: callType,
        payload: { username: user.email?.split('@')[0] || 'User' },
      } as any);

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await supabase.from('call_signals' as any).insert({
        conversation_id: conversationId,
        caller_id: user.id,
        callee_id: remoteUserId,
        type: 'offer',
        call_type: callType,
        payload: { sdp: offer },
      } as any);

      toast.info('Calling...');
    } catch (error) {
      console.error('Error starting call:', error);
      endCall();
    }
  }, [user, getUserMedia, createPeerConnection]);

  // Answer a call
  const answerCall = useCallback(async () => {
    if (!user || !callState.conversationId || !callState.remoteUserId) return;

    console.log('Answering call...');
    setCallState(prev => ({ ...prev, isConnecting: true, isIncoming: false }));

    try {
      // Get local media
      const stream = await getUserMedia(callState.callType === 'video');
      
      // Create peer connection if not exists
      const pc = peerConnectionRef.current || createPeerConnection();
      
      // Add tracks to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Get the offer from signals
      const { data: signals } = await supabase
        .from('call_signals' as any)
        .select('*')
        .eq('conversation_id', callState.conversationId)
        .eq('callee_id', user.id)
        .eq('type', 'offer')
        .order('created_at', { ascending: false })
        .limit(1);

      if (signals && signals.length > 0) {
        const offerSignal = signals[0] as any;
        await pc.setRemoteDescription(new RTCSessionDescription(offerSignal.payload.sdp));

        // Create and send answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await supabase.from('call_signals' as any).insert({
          conversation_id: callState.conversationId,
          caller_id: user.id,
          callee_id: callState.remoteUserId,
          type: 'answer',
          call_type: callState.callType || 'voice',
          payload: { sdp: answer },
        } as any);
      }

      toast.info('Connecting...');
    } catch (error) {
      console.error('Error answering call:', error);
      endCall();
    }
  }, [user, callState, getUserMedia, createPeerConnection]);

  // Reject a call
  const rejectCall = useCallback(async () => {
    if (!user || !callState.conversationId || !callState.remoteUserId) return;

    await supabase.from('call_signals' as any).insert({
      conversation_id: callState.conversationId,
      caller_id: user.id,
      callee_id: callState.remoteUserId,
      type: 'call-reject',
      call_type: callState.callType || 'voice',
      payload: {},
    } as any);

    endCall();
    toast.info('Call rejected');
  }, [user, callState]);

  // End call
  const endCall = useCallback(async () => {
    console.log('Ending call...');

    // Send end signal if call was active
    if (user && callState.conversationId && callState.remoteUserId) {
      await supabase.from('call_signals' as any).insert({
        conversation_id: callState.conversationId,
        caller_id: user.id,
        callee_id: callState.remoteUserId,
        type: 'call-end',
        call_type: callState.callType || 'voice',
        payload: {},
      } as any);
    }

    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    remoteStreamRef.current = null;

    setCallState({
      isActive: false,
      isIncoming: false,
      isConnecting: false,
      isConnected: false,
      callType: null,
      remoteUserId: null,
      remoteUsername: null,
      conversationId: null,
      isGroupCall: false,
      participants: [],
    });
  }, [user, callState]);

  // Listen for incoming signals
  useEffect(() => {
    if (!user) return;

    console.log('Setting up call signal listener...');

    const channel = supabase
      .channel('call-signals')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_signals',
          filter: `callee_id=eq.${user.id}`,
        },
        async (payload) => {
          const signal = payload.new as any;
          console.log('Received call signal:', signal);

          switch (signal.type) {
            case 'call-start':
              // Incoming call
              if (!callState.isActive) {
                // Get caller info
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('username')
                  .eq('user_id', signal.caller_id)
                  .single();

                setCallState({
                  isActive: true,
                  isIncoming: true,
                  isConnecting: false,
                  isConnected: false,
                  callType: signal.call_type,
                  remoteUserId: signal.caller_id,
                  remoteUsername: profile?.username || signal.payload?.username || 'Unknown',
                  conversationId: signal.conversation_id,
                  isGroupCall: signal.payload?.isGroupCall || false,
                  participants: signal.payload?.participants || [],
                });
                toast.info(`Incoming ${signal.call_type} call from ${profile?.username || 'Unknown'}!`);
              }
              break;

            case 'answer':
              // Call was answered
              if (peerConnectionRef.current && signal.payload?.sdp) {
                await peerConnectionRef.current.setRemoteDescription(
                  new RTCSessionDescription(signal.payload.sdp)
                );
              }
              break;

            case 'ice-candidate':
              // ICE candidate received
              if (peerConnectionRef.current && signal.payload?.candidate) {
                try {
                  await peerConnectionRef.current.addIceCandidate(
                    new RTCIceCandidate(signal.payload.candidate)
                  );
                } catch (e) {
                  console.error('Error adding ICE candidate:', e);
                }
              }
              break;

            case 'call-end':
            case 'call-reject':
              // Call ended or rejected
              if (callState.isActive && callState.remoteUserId === signal.caller_id) {
                endCall();
                toast.info(signal.type === 'call-reject' ? 'Call rejected' : 'Call ended');
              }
              break;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, callState.isActive, callState.remoteUserId, endCall]);

  return {
    callState,
    localVideoRef,
    remoteVideoRef,
    localStreamRef,
    remoteStreamRef,
    startCall,
    answerCall,
    rejectCall,
    endCall,
  };
};
