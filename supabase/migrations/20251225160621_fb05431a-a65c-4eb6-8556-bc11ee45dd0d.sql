-- First, drop ALL existing policies on conversations
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

-- Recreate the INSERT policy - simpler approach without role restriction
CREATE POLICY "Allow authenticated insert"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Verify the trigger exists and recreate it to ensure it's working
DROP TRIGGER IF EXISTS set_conversation_creator_trigger ON public.conversations;
DROP FUNCTION IF EXISTS public.set_conversation_creator();

CREATE OR REPLACE FUNCTION public.set_conversation_creator()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to create a conversation';
  END IF;
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_conversation_creator_trigger
BEFORE INSERT ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.set_conversation_creator();