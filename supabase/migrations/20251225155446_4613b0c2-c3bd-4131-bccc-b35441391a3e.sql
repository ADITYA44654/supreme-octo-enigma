-- A. DATABASE: Drop existing trigger and function
DROP TRIGGER IF EXISTS set_conversation_creator_trigger ON public.conversations;
DROP FUNCTION IF EXISTS public.set_conversation_creator();

-- Create BEFORE INSERT trigger function (NO SECURITY DEFINER)
-- Throws error if auth.uid() is NULL
CREATE OR REPLACE FUNCTION public.set_conversation_creator()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to create a conversation';
  END IF;
  
  -- Auto-set created_by from auth context
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger
CREATE TRIGGER set_conversation_creator_trigger
BEFORE INSERT ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.set_conversation_creator();

-- B. RLS POLICY: Drop ALL existing INSERT policies
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

-- Create ONE clean INSERT policy
CREATE POLICY "Authenticated users can create conversations"
ON public.conversations
AS PERMISSIVE
FOR INSERT 
TO authenticated
WITH CHECK (created_by = auth.uid());