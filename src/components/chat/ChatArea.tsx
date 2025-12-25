import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Phone, 
  Video, 
  MoreVertical, 
  Smile, 
  Send,
  ArrowLeft,
  Sword,
  Play,
  Pause,
  Download,
  File,
  Trash2,
  VolumeX,
  Bell,
  Search,
  UserX,
  Info,
  PhoneOff
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRealTimeMessages, ConversationWithDetails } from "@/hooks/useRealTimeMessages";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useWebRTC } from "@/hooks/useWebRTC";
import VoiceRecorder from "./VoiceRecorder";
import FileUploader from "./FileUploader";
import FastAvatar from "./FastAvatar";
import ReadReceipt from "./ReadReceipt";
import CallOverlay from "./CallOverlay";
import BlockUserDialog from "./BlockUserDialog";
import { format } from "date-fns";
import { toast } from "sonner";

interface ChatAreaProps {
  conversation: ConversationWithDetails | null;
  onBack?: () => void;
  isUserOnline?: (userId: string) => boolean;
  onMessagesRead?: () => void;
}

const ChatArea = ({ conversation, onBack, isUserOnline, onMessagesRead }: ChatAreaProps) => {
  const { user } = useAuth();
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { messages, sendMessage, deleteMessage, isLoading } = useRealTimeMessages(conversation?.id || null, onMessagesRead);
  const { typingUsers, handleTyping, sendStopTyping } = useTypingIndicator(conversation?.id || null);
  const { 
    callState, 
    localStreamRef, 
    remoteStreamRef,
    startCall: webrtcStartCall, 
    answerCall, 
    rejectCall, 
    endCall 
  } = useWebRTC();

  const handleStartCall = (type: 'voice' | 'video') => {
    if (!conversation || !user) return;
    
    // Get all other participants (for both direct and group calls)
    const otherParticipants = conversation.participants.filter(p => p.user_id !== user.id);
    
    if (otherParticipants.length === 0) {
      toast.error('No participants to call');
      return;
    }
    
    // For direct calls, use the single participant
    // For group calls, we'll call the first participant and include all participant IDs
    const firstParticipant = otherParticipants[0];
    const participantIds = otherParticipants.map(p => p.user_id);
    const displayName = conversation.type === 'group' 
      ? conversation.name || 'Group Call'
      : firstParticipant.username;
    
    webrtcStartCall(
      conversation.id,
      firstParticipant.user_id,
      displayName,
      type,
      participantIds
    );
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);
    handleTyping();
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    sendStopTyping();
    await sendMessage(messageText, 'text');
    setMessageText("");
  };

  const handleVoiceNoteSent = async (url: string, duration: number) => {
    await sendMessage(`Voice note (${duration}s)`, 'voice', url);
  };

  const handleFileUploaded = async (url: string, fileName: string, fileType: string) => {
    await sendMessage(fileName, fileType, url);
  };

  const toggleAudio = async (url: string) => {
    if (playingAudio === url) {
      audioRef.current?.pause();
      setPlayingAudio(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      try {
        const audio = new Audio(url);
        audio.onended = () => setPlayingAudio(null);
        audio.onerror = (e) => {
          console.error('Audio playback error:', e);
          toast.error('Could not play voice note');
          setPlayingAudio(null);
        };
        await audio.play();
        audioRef.current = audio;
        setPlayingAudio(url);
      } catch (error) {
        console.error('Audio play failed:', error);
        toast.error('Could not play voice note');
      }
    }
  };

  const getTypingIndicator = () => {
    if (typingUsers.length === 0) return null;
    
    const typingParticipants = typingUsers
      .map(id => conversation?.participants.find(p => p.user_id === id)?.username)
      .filter(Boolean);

    if (typingParticipants.length === 0) return null;
    if (typingParticipants.length === 1) return `${typingParticipants[0]} is typing...`;
    if (typingParticipants.length === 2) return `${typingParticipants.join(' and ')} are typing...`;
    return `${typingParticipants.length} people are typing...`;
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background relative overflow-hidden">
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/3 right-1/3 w-[250px] h-[250px] bg-accent/10 rounded-full blur-[80px]" />
        
        <div className="text-center max-w-md relative z-10 animate-slide-up" style={{ opacity: 0, animationDelay: '0.1s' }}>
          <div className="h-28 w-28 mx-auto mb-8 rounded-3xl gradient-primary flex items-center justify-center shadow-2xl shadow-primary/40 rotate-[-10deg]">
            <Sword className="h-14 w-14 text-primary-foreground" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Welcome to Espada</h2>
          <p className="text-muted-foreground text-lg">
            Select a conversation or add a friend to start messaging
          </p>
        </div>
      </div>
    );
  }

  const otherParticipant = conversation.type === 'direct'
    ? conversation.participants.find(p => p.user_id !== user?.id)
    : null;

  const displayName = conversation.type === 'group'
    ? conversation.name
    : otherParticipant?.username || 'Unknown';

  const isOnline = conversation.type === 'direct' && otherParticipant?.user_id
    ? (isUserOnline ? isUserOnline(otherParticipant.user_id) : otherParticipant?.is_online)
    : false;
  const typingText = getTypingIndicator();

  const renderMessageContent = (msg: typeof messages[0]) => {
    if (msg.type === 'voice' && msg.file_url) {
      const isPlaying = playingAudio === msg.file_url;
      return (
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => toggleAudio(msg.file_url!)}
            className="h-10 w-10 rounded-full bg-primary/20 hover:bg-primary/30"
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
          <div className="flex-1">
            <div className="h-1 bg-primary/30 rounded-full">
              <div className={`h-full bg-primary rounded-full transition-all ${isPlaying ? 'animate-pulse' : ''}`} style={{ width: isPlaying ? '100%' : '0%' }} />
            </div>
            <p className="text-xs mt-1 opacity-70">{msg.content}</p>
          </div>
        </div>
      );
    }

    if (msg.type === 'image' && msg.file_url) {
      return (
        <div className="space-y-2">
          <img 
            src={msg.file_url} 
            alt={msg.content}
            className="max-w-[280px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(msg.file_url!, '_blank')}
          />
          <p className="text-xs opacity-70">{msg.content}</p>
        </div>
      );
    }

    if (msg.type === 'video' && msg.file_url) {
      return (
        <div className="space-y-2">
          <video 
            src={msg.file_url}
            controls
            className="max-w-[280px] rounded-lg"
          />
          <p className="text-xs opacity-70">{msg.content}</p>
        </div>
      );
    }

    if (msg.type === 'file' && msg.file_url) {
      return (
        <a 
          href={msg.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 bg-background/50 rounded-lg hover:bg-background/70 transition-colors"
        >
          <File className="h-8 w-8 text-primary" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate text-sm">{msg.content}</p>
            <p className="text-xs opacity-70">Click to download</p>
          </div>
          <Download className="h-4 w-4 opacity-50" />
        </a>
      );
    }

    return <p className="text-[15px] leading-relaxed">{msg.content}</p>;
  };

  return (
    <div className="flex-1 flex flex-col bg-background h-full relative">
      {/* Call Overlay */}
      <CallOverlay
        isActive={callState.isActive}
        isIncoming={callState.isIncoming}
        isConnecting={callState.isConnecting}
        isConnected={callState.isConnected}
        callType={callState.callType}
        remoteUsername={callState.remoteUsername}
        remoteUserId={callState.remoteUserId}
        localStream={localStreamRef.current}
        remoteStream={remoteStreamRef.current}
        isGroupCall={callState.isGroupCall}
        participantCount={callState.participants.length}
        onAnswer={answerCall}
        onReject={rejectCall}
        onEndCall={endCall}
      />

      {/* Fixed Header */}
      <div className="h-20 px-4 sm:px-6 flex items-center justify-between border-b border-border bg-card/80 backdrop-blur-xl flex-shrink-0 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <FastAvatar
            src={conversation.type === 'group' ? conversation.avatar_url : otherParticipant?.avatar_url}
            seed={displayName || otherParticipant?.user_id || conversation.id}
            alt={displayName || ''}
            size="md"
            isOnline={isOnline || false}
          />
          
          <div>
            <h3 className="font-semibold text-base sm:text-lg">{displayName}</h3>
            <p className="text-sm text-muted-foreground">
              {typingText ? (
                <span className="text-primary animate-pulse">{typingText}</span>
              ) : isOnline ? (
                <span className="text-green-500">Online</span>
              ) : (
                "Offline"
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-muted-foreground hover:text-foreground rounded-xl hidden sm:flex"
            onClick={() => handleStartCall('voice')}
          >
            <Phone className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-muted-foreground hover:text-foreground rounded-xl hidden sm:flex"
            onClick={() => handleStartCall('video')}
          >
            <Video className="h-5 w-5" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground rounded-xl">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem className="gap-2 sm:hidden" onClick={() => handleStartCall('voice')}>
                <Phone className="h-4 w-4" />
                Voice Call
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 sm:hidden" onClick={() => handleStartCall('video')}>
                <Video className="h-4 w-4" />
                Video Call
              </DropdownMenuItem>
              <DropdownMenuSeparator className="sm:hidden" />
              <DropdownMenuItem className="gap-2" onClick={() => toast.info("View profile coming soon!")}>
                <Info className="h-4 w-4" />
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2" onClick={() => toast.info("Search coming soon!")}>
                <Search className="h-4 w-4" />
                Search in Chat
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2" onClick={() => toast.success("Notifications muted!")}>
                <VolumeX className="h-4 w-4" />
                Mute Notifications
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2" onClick={() => toast.info("Custom notifications coming soon!")}>
                <Bell className="h-4 w-4" />
                Custom Notifications
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {conversation.type === 'direct' && otherParticipant && (
                <BlockUserDialog
                  userId={otherParticipant.user_id}
                  username={otherParticipant.username}
                  trigger={
                    <DropdownMenuItem className="gap-2 text-destructive" onSelect={(e) => e.preventDefault()}>
                      <UserX className="h-4 w-4" />
                      Block User
                    </DropdownMenuItem>
                  }
                  onBlocked={() => toast.success("User blocked")}
                />
              )}
              <DropdownMenuItem className="gap-2 text-destructive" onClick={() => toast.info("Delete chat coming soon!")}>
                <Trash2 className="h-4 w-4" />
                Delete Chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.sender_id === user?.id;
            const sender = conversation.participants.find(p => p.user_id === msg.sender_id);

            return (
              <div
                key={msg.id}
                className={`flex gap-2 sm:gap-3 group ${isOwn ? 'flex-row-reverse' : ''}`}
              >
                {!isOwn && (
                  <FastAvatar
                    src={sender?.avatar_url}
                    seed={sender?.username || msg.sender_id}
                    alt={sender?.username}
                    size="sm"
                  />
                )}
                <div className={`max-w-[75%] sm:max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                  <div className="relative">
                    <div
                      className={`rounded-2xl px-4 py-2.5 ${
                        isOwn
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted text-foreground rounded-bl-md'
                      }`}
                    >
                      {renderMessageContent(msg)}
                    </div>
                    {/* Delete button for own messages */}
                    {isOwn && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute -left-10 top-1/2 -translate-y-1/2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        onClick={() => deleteMessage(msg.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : ''}`}>
                    <p className="text-xs text-muted-foreground">
                      {msg.created_at && format(new Date(msg.created_at), 'HH:mm')}
                    </p>
                    <ReadReceipt isRead={msg.is_read} isOwn={isOwn} />
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Typing Indicator */}
        {typingText && (
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 sm:p-6 border-t border-border bg-card/80 backdrop-blur-xl flex-shrink-0">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2 sm:gap-3">
          {user && conversation && (
            <FileUploader
              userId={user.id}
              conversationId={conversation.id}
              onFileUploaded={handleFileUploaded}
            />
          )}
          
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder="Type a message..."
              value={messageText}
              onChange={handleInputChange}
              className="pr-12"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 text-muted-foreground hover:text-foreground rounded-xl"
            >
              <Smile className="h-5 w-5" />
            </Button>
          </div>

          {messageText.trim() ? (
            <Button type="submit" size="icon" className="flex-shrink-0 rounded-xl">
              <Send className="h-5 w-5" />
            </Button>
          ) : (
            user && conversation && (
              <VoiceRecorder
                userId={user.id}
                conversationId={conversation.id}
                onVoiceNoteSent={handleVoiceNoteSent}
              />
            )
          )}
        </form>
      </div>
    </div>
  );
};

export default ChatArea;
