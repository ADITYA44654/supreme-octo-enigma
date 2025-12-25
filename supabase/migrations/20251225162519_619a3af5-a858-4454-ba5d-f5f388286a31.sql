-- Fix 1: Profiles - Restrict visibility to friends, conversation participants, and pending requests
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

-- Create function to check if user can view a profile
CREATE OR REPLACE FUNCTION public.can_view_profile(viewer_id uuid, profile_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Own profile
    viewer_id = profile_user_id
    OR
    -- Friends (accepted)
    EXISTS (
      SELECT 1 FROM public.friendships
      WHERE status = 'accepted'
      AND ((user_id = viewer_id AND friend_id = profile_user_id)
           OR (user_id = profile_user_id AND friend_id = viewer_id))
    )
    OR
    -- Pending friend requests (to see who sent request)
    EXISTS (
      SELECT 1 FROM public.friendships
      WHERE status = 'pending'
      AND ((user_id = viewer_id AND friend_id = profile_user_id)
           OR (user_id = profile_user_id AND friend_id = viewer_id))
    )
    OR
    -- In same conversation
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp1
      JOIN public.conversation_participants cp2 
        ON cp1.conversation_id = cp2.conversation_id
      WHERE cp1.user_id = viewer_id AND cp2.user_id = profile_user_id
    )
$$;

-- Create new restrictive policy for profiles
CREATE POLICY "Users can view relevant profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.can_view_profile(auth.uid(), user_id));

-- Fix 2: Rate limiting for messages (100 messages per hour per conversation)
CREATE OR REPLACE FUNCTION public.check_message_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  message_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO message_count
  FROM public.messages
  WHERE sender_id = NEW.sender_id
    AND conversation_id = NEW.conversation_id
    AND created_at > NOW() - INTERVAL '1 hour';
  
  IF message_count >= 100 THEN
    RAISE EXCEPTION 'Rate limit exceeded: maximum 100 messages per hour per conversation';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS enforce_message_rate_limit ON public.messages;
CREATE TRIGGER enforce_message_rate_limit
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.check_message_rate_limit();

-- Fix 3: Rate limiting for friend requests (20 per day)
CREATE OR REPLACE FUNCTION public.check_friend_request_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  request_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO request_count
  FROM public.friendships
  WHERE user_id = NEW.user_id
    AND created_at > NOW() - INTERVAL '1 day';
  
  IF request_count >= 20 THEN
    RAISE EXCEPTION 'Rate limit exceeded: maximum 20 friend requests per day';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS enforce_friend_request_rate_limit ON public.friendships;
CREATE TRIGGER enforce_friend_request_rate_limit
  BEFORE INSERT ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.check_friend_request_rate_limit();

-- Fix 4: Rate limiting for conversation creation (10 per hour)
CREATE OR REPLACE FUNCTION public.check_conversation_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  conv_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO conv_count
  FROM public.conversations
  WHERE created_by = auth.uid()
    AND created_at > NOW() - INTERVAL '1 hour';
  
  IF conv_count >= 10 THEN
    RAISE EXCEPTION 'Rate limit exceeded: maximum 10 conversations per hour';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS enforce_conversation_rate_limit ON public.conversations;
CREATE TRIGGER enforce_conversation_rate_limit
  BEFORE INSERT ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.check_conversation_rate_limit();