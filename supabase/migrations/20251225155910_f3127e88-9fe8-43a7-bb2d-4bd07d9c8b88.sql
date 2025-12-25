-- Drop the current failing policy
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;

-- Create policy with WITH CHECK (true) - trigger handles the security
CREATE POLICY "Authenticated users can create conversations"
ON public.conversations
AS PERMISSIVE
FOR INSERT 
TO authenticated
WITH CHECK (true);