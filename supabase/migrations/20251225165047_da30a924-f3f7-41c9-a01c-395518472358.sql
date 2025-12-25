-- Create call history table
CREATE TABLE public.call_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  caller_id UUID NOT NULL,
  call_type TEXT NOT NULL DEFAULT 'voice', -- 'voice' or 'video'
  status TEXT NOT NULL DEFAULT 'missed', -- 'completed', 'missed', 'rejected', 'no_answer'
  duration_seconds INTEGER DEFAULT 0,
  participants UUID[] DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view call history for their conversations
CREATE POLICY "Users can view their call history"
ON public.call_history
FOR SELECT
USING (
  conversation_id IN (
    SELECT conversation_id FROM public.conversation_participants 
    WHERE user_id = auth.uid()
  )
);

-- Policy: Users can insert call history
CREATE POLICY "Users can create call history"
ON public.call_history
FOR INSERT
WITH CHECK (auth.uid() = caller_id);

-- Policy: Participants can update call history
CREATE POLICY "Participants can update call history"
ON public.call_history
FOR UPDATE
USING (
  auth.uid() = caller_id OR auth.uid() = ANY(participants)
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_history;

-- Add indexes
CREATE INDEX idx_call_history_conversation ON public.call_history(conversation_id);
CREATE INDEX idx_call_history_caller ON public.call_history(caller_id);
CREATE INDEX idx_call_history_started ON public.call_history(started_at DESC);