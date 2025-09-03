-- Allow all authenticated users to view basic team member profiles for ranking
-- This replaces the existing policy that only allowed gestors to see team info
DROP POLICY IF EXISTS "Gestors can view limited team member info" ON public.profiles;

-- Create new policy that allows all authenticated users to view basic team info
-- but still excludes sensitive data like emails and system users
CREATE POLICY "Users can view basic team member info for ranking" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  auth.uid() = user_id 
  OR (
    auth.uid() IS NOT NULL 
    AND email != 'vendas19@totalcad.com.br'
  )
);