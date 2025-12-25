-- Create friendships table
CREATE TABLE public.friendships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  friend_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Enable RLS
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- RLS policies for friendships
CREATE POLICY "Users can view their friendships" 
ON public.friendships 
FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can send friend requests" 
ON public.friendships 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their friendship requests" 
ON public.friendships 
FOR UPDATE 
USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can delete their friendships" 
ON public.friendships 
FOR DELETE 
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Create trigger for updated_at
CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create files storage bucket for file sharing (unlimited size)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-files', 'chat-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for chat files
CREATE POLICY "Anyone can view chat files"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-files');

CREATE POLICY "Authenticated users can upload chat files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own chat files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'chat-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own chat files"
ON storage.objects FOR DELETE
USING (bucket_id = 'chat-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create voice-notes storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('voice-notes', 'voice-notes', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for voice notes
CREATE POLICY "Anyone can view voice notes"
ON storage.objects FOR SELECT
USING (bucket_id = 'voice-notes');

CREATE POLICY "Authenticated users can upload voice notes"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'voice-notes' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own voice notes"
ON storage.objects FOR DELETE
USING (bucket_id = 'voice-notes' AND auth.uid()::text = (storage.foldername(name))[1]);