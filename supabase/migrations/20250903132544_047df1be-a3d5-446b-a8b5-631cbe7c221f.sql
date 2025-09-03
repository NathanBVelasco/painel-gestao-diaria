-- Step 1: Create a secure function for basic team member info (non-gestors)
CREATE OR REPLACE FUNCTION public.get_basic_team_info()
 RETURNS TABLE(user_id uuid, name text, role user_role)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Return only safe fields for team members (no email addresses)
  -- Exclude the system user and the requesting user themselves
  RETURN QUERY
  SELECT p.user_id, p.name, p.role
  FROM public.profiles p
  WHERE p.user_id != auth.uid() -- Exclude the current user
    AND p.email != 'vendas19@totalcad.com.br' -- Exclude the system user
    AND p.role = 'vendedor'; -- Only show vendedor role users for ranking
END;
$function$