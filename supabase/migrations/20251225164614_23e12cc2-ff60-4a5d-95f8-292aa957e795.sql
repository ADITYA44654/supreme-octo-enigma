-- Create table for WebRTC call signaling
CREATE TABLE public.call_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  caller_id UUID NOT NULL,
  callee_id UUID NOT NULL,
  type TEXT NOT NULL, -- 'offer', 'answer', 'ice-candidate', 'call-start', 'call-end', 'call-reject'
  call_type TEXT NOT NULL DEFAULT 'voice', -- 'voice' or 'video'
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.call_signals ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view signals where they are caller or callee
CREATE POLICY "Users can view their own call signals"
ON public.call_signals
FOR SELECT
USING (auth.uid() = caller_id OR auth.uid() = callee_id);

-- Policy: Users can insert call signals
CREATE POLICY "Users can create call signals"
ON public.call_signals
FOR INSERT
WITH CHECK (auth.uid() = caller_id);

-- Policy: Users can delete their call signals
CREATE POLICY "Users can delete their call signals"
ON public.call_signals
FOR DELETE
USING (auth.uid() = caller_id OR auth.uid() = callee_id);

-- Enable realtime for call signals
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_signals;

-- Add index for faster queries
CREATE INDEX idx_call_signals_conversation ON public.call_signals(conversation_id);
CREATE INDEX idx_call_signals_callee ON public.call_signals(callee_id);