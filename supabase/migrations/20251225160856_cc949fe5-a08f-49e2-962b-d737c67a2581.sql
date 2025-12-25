-- Fix: Allow conversation creator to view their own conversation immediately after creation
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;

CREATE POLICY "Users can view their conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (
  -- User is a participant
  id IN (SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid())
  OR
  -- OR user is the creator (allows viewing immediately after insert before participants are added)
  created_by = auth.uid()
);