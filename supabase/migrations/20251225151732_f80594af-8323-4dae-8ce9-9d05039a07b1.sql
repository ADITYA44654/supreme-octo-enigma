-- ==========================================
-- 1. FIX: Conversation participants INSERT policy (allow only creators/existing participants)
-- ==========================================
DROP POLICY IF EXISTS "Users can add participants" ON public.conversation_participants;

-- Create helper function to check if user can add participants
CREATE OR REPLACE FUNCTION public.can_add_participant(conv_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- User is the conversation creator
    SELECT 1 FROM public.conversations WHERE id = conv_id AND created_by = auth.uid()
  ) OR EXISTS (
    -- User is already a participant
    SELECT 1 FROM public.conversation_participants WHERE conversation_id = conv_id AND user_id = auth.uid()
  )
$$;

CREATE POLICY "Participants can add members" 
ON public.conversation_participants FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND public.can_add_participant(conversation_id)
);

-- ==========================================
-- 2. FIX: Add UPDATE and DELETE policies for conversations
-- ==========================================
CREATE POLICY "Conversation creators can update" 
ON public.conversations FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Conversation creators can delete" 
ON public.conversations FOR DELETE 
USING (auth.uid() = created_by);

-- ==========================================
-- 3. FIX: Add DELETE policies for conversation_participants
-- ==========================================
CREATE POLICY "Users can leave conversations" 
ON public.conversation_participants FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Creators can remove participants" 
ON public.conversation_participants FOR DELETE 
USING (
  conversation_id IN (
    SELECT id FROM public.conversations 
    WHERE created_by = auth.uid()
  )
);

-- ==========================================
-- 4. FIX: Message content validation
-- ==========================================
-- Add constraint for message length
ALTER TABLE public.messages 
ADD CONSTRAINT message_content_length CHECK (length(content) <= 5000);

-- Update the insert policy to include validation
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id 
  AND conversation_id IN (
    SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()
  )
  AND length(content) > 0 
  AND length(content) <= 5000
);

-- ==========================================
-- 5. FIX: Storage buckets - make private and update policies
-- ==========================================
UPDATE storage.buckets SET public = false WHERE id IN ('avatars', 'chat-files', 'voice-notes');

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view chat files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view voice notes" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;

-- Create new authenticated-only policies
CREATE POLICY "Authenticated users can view avatars" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view chat files" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'chat-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view voice notes" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'voice-notes' AND auth.uid() IS NOT NULL);