-- Drop existing policy that's not working
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

-- Create trigger function to auto-set created_by from auth.uid()
CREATE OR REPLACE FUNCTION public.set_conversation_creator()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to run before insert
CREATE TRIGGER set_conversation_creator_trigger
BEFORE INSERT ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.set_conversation_creator();

-- Create simple policy - just check user is authenticated
CREATE POLICY "Authenticated users can create conversations"
ON public.conversations
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);