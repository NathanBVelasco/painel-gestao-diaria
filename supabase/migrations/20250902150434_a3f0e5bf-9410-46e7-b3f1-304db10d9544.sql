-- Create a secure function for gestors to access only necessary profile fields
CREATE OR REPLACE FUNCTION public.get_team_profiles_for_gestor()
RETURNS TABLE (
  user_id uuid,
  name text,
  role user_role
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow gestors to call this function
  IF public.get_current_user_role() != 'gestor' THEN
    RAISE EXCEPTION 'Access denied: Only gestors can access team profiles';
  END IF;
  
  -- Return only safe fields (no email addresses)
  RETURN QUERY
  SELECT p.user_id, p.name, p.role
  FROM public.profiles p
  WHERE p.user_id != auth.uid() -- Exclude the gestor themselves
    AND p.email != 'vendas19@totalcad.com.br'; -- Exclude the specific system user
END;
$$;

-- Update the RLS policy to be more restrictive
DROP POLICY IF EXISTS "Gestors can view team member names and roles" ON public.profiles;

-- Create a more restrictive policy that only allows viewing basic info
CREATE POLICY "Gestors can view limited team member info" 
ON public.profiles 
FOR SELECT 
USING (
  (auth.uid() = user_id) OR 
  (public.get_current_user_role() = 'gestor' AND user_id != auth.uid() AND email != 'vendas19@totalcad.com.br')
);

-- But we need to ensure the SELECT only returns safe columns when accessed by gestors
-- This will require application-level controls since RLS works at row level, not column level