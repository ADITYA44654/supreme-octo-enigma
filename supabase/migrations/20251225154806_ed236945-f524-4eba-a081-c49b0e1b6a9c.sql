-- Drop existing trigger first
DROP TRIGGER IF EXISTS set_conversation_creator_trigger ON public.conversations;

-- Drop existing function
DROP FUNCTION IF EXISTS public.set_conversation_creator();

-- Recreate function WITHOUT SECURITY DEFINER (uses SECURITY INVOKER by default)
-- This allows auth.uid() to return the authenticated user's ID
CREATE OR REPLACE FUNCTION public.set_conversation_creator()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Recreate trigger
CREATE TRIGGER set_conversation_creator_trigger
BEFORE INSERT ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.set_conversation_creator();