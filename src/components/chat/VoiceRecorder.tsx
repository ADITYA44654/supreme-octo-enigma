import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Send, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { validateVoiceNote, MAX_VOICE_NOTE_DURATION } from "@/lib/fileValidation";
import { checkRateLimit, getRateLimitMessage } from "@/lib/rateLimiter";

interface VoiceRecorderProps {
  userId: string;
  conversationId: string;
  onVoiceNoteSent: (url: string, duration: number) => void;
}

const VoiceRecorder = ({ userId, conversationId, onVoiceNoteSent }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-stop recording if it exceeds max duration
  useEffect(() => {
    if (isRecording && recordingTime >= MAX_VOICE_NOTE_DURATION) {
      toast.warning(`Maximum recording time (${MAX_VOICE_NOTE_DURATION / 60} minutes) reached`);
      stopRecording();
    }
  }, [recordingTime, isRecording]);

  const startRecording = async () => {
    // Check rate limit before starting
    const rateLimit = checkRateLimit(userId, 'voice_note');
    if (!rateLimit.allowed) {
      toast.error(getRateLimitMessage('voice_note', rateLimit.retryAfter!));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error: any) {
      toast.error('Could not access microphone');
      console.error('Microphone error:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const cancelRecording = () => {
    stopRecording();
    setAudioBlob(null);
    setRecordingTime(0);
  };

  const sendVoiceNote = async () => {
    if (!audioBlob) return;

    // Validate voice note
    const validation = validateVoiceNote(audioBlob, recordingTime);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    setIsUploading(true);
    try {
      const fileName = `${userId}/${conversationId}/${Date.now()}.webm`;
      
      const { error: uploadError } = await supabase.storage
        .from('voice-notes')
        .upload(fileName, audioBlob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('voice-notes')
        .getPublicUrl(fileName);

      onVoiceNoteSent(publicUrl, recordingTime);
      setAudioBlob(null);
      setRecordingTime(0);
    } catch (error: any) {
      toast.error('Failed to send voice note');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (audioBlob) {
    return (
      <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-4 py-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={cancelRecording}
          className="text-destructive hover:text-destructive"
        >
          <X className="h-5 w-5" />
        </Button>
        
        <div className="flex-1 flex items-center gap-2">
          <div className="h-2 flex-1 bg-primary/20 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '100%' }} />
          </div>
          <span className="text-sm font-medium text-muted-foreground">{formatTime(recordingTime)}</span>
        </div>

        <Button
          type="button"
          size="icon"
          onClick={sendVoiceNote}
          disabled={isUploading}
        >
          {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </Button>
      </div>
    );
  }

  if (isRecording) {
    return (
      <div className="flex items-center gap-2 bg-destructive/10 rounded-xl px-4 py-2">
        <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
        <span className="text-sm font-medium text-destructive">{formatTime(recordingTime)}</span>
        <span className="text-xs text-muted-foreground">/ {formatTime(MAX_VOICE_NOTE_DURATION)}</span>
        <div className="flex-1" />
        <Button
          type="button"
          variant="destructive"
          size="icon"
          onClick={stopRecording}
        >
          <Square className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={startRecording}
      className="text-muted-foreground hover:text-foreground flex-shrink-0 rounded-xl"
    >
      <Mic className="h-5 w-5" />
    </Button>
  );
};

export default VoiceRecorder;
