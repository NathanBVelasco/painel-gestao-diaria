-- Fix the get_secure_team_basic_info function to allow vendas19 user to access data when they are the requester
-- The function was excluding vendas19@totalcad.com.br but this user needs access as a gestor

CREATE OR REPLACE FUNCTION public.get_secure_team_basic_info()
 RETURNS TABLE(user_id uuid, name text, role user_role)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only allow gestors to call this function
  IF public.get_current_user_role() != 'gestor' THEN
    RAISE EXCEPTION 'Access denied: Insufficient permissions';
  END IF;
  
  -- Return ONLY safe fields - NO EMAIL ADDRESSES EVER
  -- Allow vendas19@totalcad.com.br to see team data when they are the requester
  RETURN QUERY
  SELECT p.user_id, p.name, p.role
  FROM public.profiles p
  WHERE p.user_id != auth.uid() -- Exclude the gestor themselves
    AND p.role = 'vendedor' -- Only show vendedor role users
    AND (p.email != 'vendas19@totalcad.com.br' OR auth.uid() = (SELECT user_id FROM profiles WHERE email = 'vendas19@totalcad.com.br')); -- Allow vendas19 to see data when they are the requester
END;
$function$