-- Create blocked_users table
CREATE TABLE public.blocked_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL,
  blocked_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

-- Enable RLS
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- Users can view their blocks
CREATE POLICY "Users can view their blocked users"
ON public.blocked_users
FOR SELECT
USING (auth.uid() = blocker_id);

-- Users can block others
CREATE POLICY "Users can block others"
ON public.blocked_users
FOR INSERT
WITH CHECK (auth.uid() = blocker_id);

-- Users can unblock others
CREATE POLICY "Users can unblock others"
ON public.blocked_users
FOR DELETE
USING (auth.uid() = blocker_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.blocked_users;