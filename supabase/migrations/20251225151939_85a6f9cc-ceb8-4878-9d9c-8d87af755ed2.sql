-- Update profile policy to allow all authenticated users to see profiles (for discovery)
DROP POLICY IF EXISTS "Users can view own and friends profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);