-- Drop current policy that's not working correctly
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

-- Create proper policy with TO authenticated
CREATE POLICY "Users can create conversations" 
ON public.conversations 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = created_by);