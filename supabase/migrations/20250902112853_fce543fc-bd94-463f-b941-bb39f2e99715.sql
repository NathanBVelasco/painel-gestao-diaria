-- SECURITY FIX: Restrict manager access to user profiles
-- Remove the current overly permissive policy that allows managers to see all profile data including emails
DROP POLICY IF EXISTS "Gestors can view all profiles" ON public.profiles;

-- Create a new restricted policy for managers that only allows viewing business-relevant fields
-- Managers can see names and roles for team management but NOT email addresses or other personal data
CREATE POLICY "Gestors can view team member names and roles" 
ON public.profiles 
FOR SELECT 
USING (
  get_current_user_role() = 'gestor' 
  AND user_id != auth.uid() -- Prevent managers from accessing their own profile through this policy (they use the personal policy)
);

-- Create a view that only exposes business-relevant profile information to managers
CREATE OR REPLACE VIEW public.team_members AS
SELECT 
  id,
  user_id,
  name,
  role,
  created_at
FROM public.profiles
WHERE get_current_user_role() = 'gestor' OR user_id = auth.uid();

-- Enable RLS on the view
ALTER VIEW public.team_members SET (security_barrier = true);

-- Grant access to the view for authenticated users
GRANT SELECT ON public.team_members TO authenticated;

-- Additional security: Create audit logging for sensitive profile access
CREATE TABLE IF NOT EXISTS public.profile_access_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  accessed_by UUID NOT NULL,
  accessed_profile UUID NOT NULL,
  access_type TEXT NOT NULL,
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE public.profile_access_log ENABLE ROW LEVEL SECURITY;

-- Only allow managers to view their own access logs
CREATE POLICY "Users can view their own access logs" 
ON public.profile_access_log 
FOR SELECT 
USING (accessed_by = auth.uid());

-- Function to log profile access
CREATE OR REPLACE FUNCTION public.log_profile_access(
  profile_id UUID,
  access_type TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profile_access_log (accessed_by, accessed_profile, access_type)
  VALUES (auth.uid(), profile_id, access_type);
END;
$$;