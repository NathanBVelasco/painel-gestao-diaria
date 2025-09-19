-- Fix the ambiguous user_id column reference in get_secure_team_basic_info function
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
  -- Fix ambiguous column reference by using table alias
  RETURN QUERY
  SELECT p.user_id, p.name, p.role
  FROM public.profiles p
  WHERE p.user_id != auth.uid() -- Exclude the gestor themselves
    AND p.role = 'vendedor' -- Only show vendedor role users
    AND (p.email != 'vendas19@totalcad.com.br' 
         OR auth.uid() = (SELECT p2.user_id FROM public.profiles p2 WHERE p2.email = 'vendas19@totalcad.com.br')); -- Fix ambiguous reference with alias
END;
$function$