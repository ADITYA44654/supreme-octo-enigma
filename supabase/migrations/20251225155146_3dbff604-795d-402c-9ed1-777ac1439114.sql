-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;

-- Create PERMISSIVE policy (default, but being explicit)
CREATE POLICY "Authenticated users can create conversations"
ON public.conversations
AS PERMISSIVE
FOR INSERT 
TO authenticated
WITH CHECK (true);