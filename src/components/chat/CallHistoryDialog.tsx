import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import FastAvatar from "./FastAvatar";
import { format, formatDistanceToNow } from "date-fns";

interface CallRecord {
  id: string;
  conversation_id: string;
  caller_id: string;
  call_type: string;
  status: string;
  duration_seconds: number;
  started_at: string;
  ended_at: string | null;
  caller_name?: string;
  caller_avatar?: string | null;
  conversation_name?: string;
}

interface CallHistoryDialogProps {
  trigger: React.ReactNode;
  onCallBack?: (conversationId: string, callType: 'voice' | 'video') => void;
}

const CallHistoryDialog = ({ trigger, onCallBack }: CallHistoryDialogProps) => {
  const [open, setOpen] = useState(false);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (open && user) {
      fetchCallHistory();
    }
  }, [open, user]);

  const fetchCallHistory = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const { data: callHistory, error } = await supabase
        .from('call_history' as any)
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get caller profiles
      const callerIds = [...new Set((callHistory || []).map((c: any) => c.caller_id))];
      const conversationIds = [...new Set((callHistory || []).map((c: any) => c.conversation_id))];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', callerIds);

      const { data: conversations } = await supabase
        .from('conversations')
        .select('id, name')
        .in('id', conversationIds);

      const callsWithDetails = (callHistory || []).map((call: any) => {
        const caller = profiles?.find(p => p.user_id === call.caller_id);
        const conv = conversations?.find(c => c.id === call.conversation_id);
        return {
          ...call,
          caller_name: caller?.username || 'Unknown',
          caller_avatar: caller?.avatar_url,
          conversation_name: conv?.name,
        };
      });

      setCalls(callsWithDetails);
    } catch (error) {
      console.error('Error fetching call history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getCallIcon = (call: CallRecord) => {
    const isOutgoing = call.caller_id === user?.id;
    
    if (call.status === 'missed' || call.status === 'no_answer') {
      return <PhoneMissed className="h-4 w-4 text-destructive" />;
    }
    
    if (isOutgoing) {
      return <PhoneOutgoing className="h-4 w-4 text-green-500" />;
    }
    
    return <PhoneIncoming className="h-4 w-4 text-blue-500" />;
  };

  const getStatusText = (call: CallRecord) => {
    const isOutgoing = call.caller_id === user?.id;
    
    switch (call.status) {
      case 'completed':
        return isOutgoing ? 'Outgoing' : 'Incoming';
      case 'missed':
        return isOutgoing ? 'No answer' : 'Missed';
      case 'rejected':
        return isOutgoing ? 'Declined' : 'Rejected';
      case 'no_answer':
        return 'No answer';
      default:
        return call.status;
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
            <Clock className="h-5 w-5" />
            Call History
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : calls.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <Phone className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No call history yet</p>
              <p className="text-sm text-muted-foreground/70">Your calls will appear here</p>
            </div>
          ) : (
            <div className="space-y-2 p-1">
              {calls.map(call => (
                <div
                  key={call.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <FastAvatar
                    src={call.caller_avatar}
                    seed={call.caller_name || call.caller_id}
                    alt={call.caller_name}
                    size="md"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {call.conversation_name || call.caller_name}
                      </span>
                      {call.call_type === 'video' ? (
                        <Video className="h-3 w-3 text-muted-foreground" />
                      ) : (
                        <Phone className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {getCallIcon(call)}
                      <span>{getStatusText(call)}</span>
                      {call.status === 'completed' && call.duration_seconds > 0 && (
                        <span>• {formatDuration(call.duration_seconds)}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(call.started_at), { addSuffix: true })}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 mt-1"
                      onClick={() => {
                        onCallBack?.(call.conversation_id, call.call_type as 'voice' | 'video');
                        setOpen(false);
                      }}
                    >
                      {call.call_type === 'video' ? (
                        <Video className="h-4 w-4" />
                      ) : (
                        <Phone className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default CallHistoryDialog;
