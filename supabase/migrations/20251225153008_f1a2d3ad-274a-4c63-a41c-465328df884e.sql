-- Fix conversations INSERT policy
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

-- Allow any authenticated user to create conversations
CREATE POLICY "Users can create conversations" 
ON public.conversations FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);