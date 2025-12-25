-- First, create a security definer function to check if two users are friends
CREATE OR REPLACE FUNCTION public.are_friends(user_a uuid, user_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.friendships
    WHERE status = 'accepted'
      AND (
        (user_id = user_a AND friend_id = user_b)
        OR (user_id = user_b AND friend_id = user_a)
      )
  )
$$;

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a new restrictive policy: users can only see their own profile or friends' profiles
CREATE POLICY "Users can view own and friends profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND (
    user_id = auth.uid() 
    OR public.are_friends(auth.uid(), user_id)
  )
);