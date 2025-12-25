-- Fix infinite recursion in conversation_participants INSERT policy

-- Drop the problematic function and policy
DROP POLICY IF EXISTS "Participants can add members" ON public.conversation_participants;
DROP FUNCTION IF EXISTS public.can_add_participant(uuid);

-- Create a simpler INSERT policy that doesn't cause recursion
-- Allow: conversation creators OR existing participants to add members
-- Use security definer function to avoid recursion
CREATE OR REPLACE FUNCTION public.is_conversation_creator_or_participant(conv_id uuid, requester_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations WHERE id = conv_id AND created_by = requester_id
  ) OR EXISTS (
    SELECT 1 FROM public.conversation_participants WHERE conversation_id = conv_id AND user_id = requester_id
  )
$$;

-- Create INSERT policy using the security definer function
CREATE POLICY "Users can add participants to their conversations"
ON public.conversation_participants FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND public.is_conversation_creator_or_participant(conversation_id, auth.uid())
);

-- Also fix the SELECT policy to avoid potential recursion
DROP POLICY IF EXISTS "Users can view conversation participants" ON public.conversation_participants;

CREATE OR REPLACE FUNCTION public.user_conversation_ids(requester_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT conversation_id FROM public.conversation_participants WHERE user_id = requester_id
$$;

CREATE POLICY "Users can view participants in their conversations"
ON public.conversation_participants FOR SELECT
USING (
  conversation_id IN (SELECT public.user_conversation_ids(auth.uid()))
);