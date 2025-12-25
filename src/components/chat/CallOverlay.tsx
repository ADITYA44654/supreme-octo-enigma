import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import FastAvatar from "./FastAvatar";

interface CallOverlayProps {
  isActive: boolean;
  isIncoming: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  callType: 'voice' | 'video' | null;
  remoteUsername: string | null;
  remoteUserId: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isGroupCall?: boolean;
  participantCount?: number;
  onAnswer: () => void;
  onReject: () => void;
  onEndCall: () => void;
}

const CallOverlay = ({
  isActive,
  isIncoming,
  isConnecting,
  isConnected,
  callType,
  remoteUsername,
  remoteUserId,
  localStream,
  remoteStream,
  isGroupCall = false,
  participantCount = 1,
  onAnswer,
  onReject,
  onEndCall,
}: CallOverlayProps) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Call timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isConnected) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [isConnected]);

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Setup local video
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Setup remote video/audio
  useEffect(() => {
    if (remoteStream) {
      if (callType === 'video' && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      // Always set up audio for both voice and video calls
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
      }
    }
  }, [remoteStream, callType]);

  // Toggle mute
  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = isVideoOff;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 z-50 bg-gradient-to-br from-background via-background to-primary/10 flex flex-col">
      {/* Hidden audio element for voice calls */}
      <audio ref={remoteAudioRef} autoPlay playsInline />
      
      {/* Video display */}
      {callType === 'video' && isConnected && (
        <div className="flex-1 relative bg-black">
          {/* Remote video (full screen) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Local video (small overlay) */}
          <div className="absolute top-4 right-4 w-32 h-24 rounded-xl overflow-hidden border-2 border-background/50 shadow-2xl">
            {isVideoOff ? (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <VideoOff className="h-8 w-8 text-muted-foreground" />
              </div>
            ) : (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            )}
          </div>
          {/* Call duration overlay */}
          <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
            <span className="text-white text-sm font-medium">{formatDuration(callDuration)}</span>
          </div>
          {/* Remote user name */}
          <div className="absolute bottom-24 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
            <span className="text-white font-medium">{remoteUsername}</span>
          </div>
        </div>
      )}

      {/* Voice call or connecting state */}
      {(callType === 'voice' || !isConnected) && (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="relative">
            <div className={`absolute inset-0 rounded-full bg-primary/20 ${isConnected ? 'animate-pulse' : ''}`} 
                 style={{ transform: 'scale(1.2)' }} />
            <FastAvatar
              src={null}
              seed={remoteUsername || remoteUserId || 'user'}
              alt={remoteUsername || 'User'}
              size="lg"
              className="w-32 h-32 ring-4 ring-primary/30"
            />
          </div>
          <h2 className="text-2xl font-bold mt-6 mb-2">{remoteUsername || 'Unknown'}</h2>
          {isGroupCall && participantCount > 1 && (
            <p className="text-sm text-muted-foreground mb-2">
              Group call • {participantCount} participants
            </p>
          )}
          <p className={`text-muted-foreground mb-2 ${!isConnected ? 'animate-pulse' : ''}`}>
            {isIncoming ? (
              `Incoming ${isGroupCall ? 'group ' : ''}${callType || 'voice'} call...`
            ) : isConnecting ? (
              'Connecting...'
            ) : isConnected ? (
              formatDuration(callDuration)
            ) : (
              'Calling...'
            )}
          </p>
        </div>
      )}

      {/* Call controls */}
      <div className="p-6 pb-8 bg-gradient-to-t from-background/80 to-transparent">
        {isIncoming && !isConnected ? (
          <div className="flex items-center justify-center gap-8">
            {/* Reject button */}
            <div className="flex flex-col items-center gap-2">
              <Button
                variant="destructive"
                size="icon"
                className="h-16 w-16 rounded-full shadow-lg shadow-destructive/30"
                onClick={onReject}
              >
                <PhoneOff className="h-7 w-7" />
              </Button>
              <span className="text-sm text-muted-foreground">Decline</span>
            </div>
            {/* Answer button */}
            <div className="flex flex-col items-center gap-2">
              <Button
                size="icon"
                className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/30"
                onClick={onAnswer}
              >
                {callType === 'video' ? (
                  <Video className="h-7 w-7" />
                ) : (
                  <Phone className="h-7 w-7" />
                )}
              </Button>
              <span className="text-sm text-muted-foreground">Accept</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-4">
            {/* Mute button */}
            <div className="flex flex-col items-center gap-2">
              <Button
                variant={isMuted ? "destructive" : "secondary"}
                size="icon"
                className="h-14 w-14 rounded-full"
                onClick={toggleMute}
              >
                {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </Button>
              <span className="text-xs text-muted-foreground">{isMuted ? 'Unmute' : 'Mute'}</span>
            </div>

            {/* End call button */}
            <div className="flex flex-col items-center gap-2">
              <Button
                variant="destructive"
                size="icon"
                className="h-16 w-16 rounded-full shadow-lg shadow-destructive/30"
                onClick={onEndCall}
              >
                <PhoneOff className="h-7 w-7" />
              </Button>
              <span className="text-xs text-muted-foreground">End</span>
            </div>

            {/* Video toggle (only for video calls) */}
            {callType === 'video' && (
              <div className="flex flex-col items-center gap-2">
                <Button
                  variant={isVideoOff ? "destructive" : "secondary"}
                  size="icon"
                  className="h-14 w-14 rounded-full"
                  onClick={toggleVideo}
                >
                  {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
                </Button>
                <span className="text-xs text-muted-foreground">{isVideoOff ? 'Video On' : 'Video Off'}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CallOverlay;