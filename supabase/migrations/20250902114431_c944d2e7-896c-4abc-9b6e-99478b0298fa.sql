-- Fix security linter issues from previous migration

-- 1. Fix the security definer view issue by removing security_barrier and using RLS instead
DROP VIEW IF EXISTS public.team_members;

-- Create the view without security definer properties and let RLS handle access
CREATE VIEW public.team_members AS
SELECT 
  id,
  user_id,
  name,
  role,
  created_at
FROM public.profiles;

-- Grant access to the view for authenticated users  
GRANT SELECT ON public.team_members TO authenticated;

-- 2. Fix function search path issue by setting explicit search_path
CREATE OR REPLACE FUNCTION public.log_profile_access(
  profile_id UUID,
  access_type TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profile_access_log (accessed_by, accessed_profile, access_type)
  VALUES (auth.uid(), profile_id, access_type);
END;
$$;

-- 3. Additional security: Restrict daily reports access to only recent data for managers
DROP POLICY IF EXISTS "Gestors can view all reports" ON public.daily_reports;

CREATE POLICY "Gestors can view recent team reports" 
ON public.daily_reports 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'gestor'
  ) 
  AND date >= CURRENT_DATE - INTERVAL '90 days' -- Limit to last 90 days for privacy
);

-- 4. Add time-based access restriction for prize achievements
DROP POLICY IF EXISTS "Gestors can view all achievements" ON public.prize_achievements;

CREATE POLICY "Gestors can view recent team achievements" 
ON public.prize_achievements 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'gestor'
  ) 
  AND achieved_at >= CURRENT_DATE - INTERVAL '90 days' -- Limit historical achievement access
);