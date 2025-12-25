-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Storage policies for avatars
CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own avatar" ON storage.objects FOR DELETE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create conversations table
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  name TEXT,
  avatar_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create conversation participants table
CREATE TABLE public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'file', 'voice')),
  file_url TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "Users can view their conversations" ON public.conversations FOR SELECT 
USING (id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()));

CREATE POLICY "Users can create conversations" ON public.conversations FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Participants policies
CREATE POLICY "Users can view conversation participants" ON public.conversation_participants FOR SELECT 
USING (conversation_id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()));

CREATE POLICY "Users can add participants" ON public.conversation_participants FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Messages policies
CREATE POLICY "Users can view messages in their conversations" ON public.messages FOR SELECT 
USING (conversation_id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()));

CREATE POLICY "Users can send messages" ON public.messages FOR INSERT 
WITH CHECK (auth.uid() = sender_id AND conversation_id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own messages" ON public.messages FOR UPDATE 
USING (auth.uid() = sender_id);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Trigger for updated_at on conversations
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();