-- Step 2: Update RLS policies to remove email exposure
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view basic team member info for ranking" ON public.profiles;

-- Create a more secure policy that only allows viewing own profile
CREATE POLICY "Users can only view own profile directly"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);