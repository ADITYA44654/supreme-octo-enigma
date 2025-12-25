-- Add DELETE policy for messages table
CREATE POLICY "Users can delete own messages"
ON public.messages
FOR DELETE
TO authenticated
USING (auth.uid() = sender_id);