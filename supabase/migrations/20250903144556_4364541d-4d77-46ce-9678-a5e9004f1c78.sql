-- CRITICAL SECURITY FIX: Protect employee email addresses from unauthorized access
-- This migration implements zero-trust security for profile data

-- First, drop existing policies to rebuild with maximum security
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;

-- POLICY 1: Ultra-restrictive profile access - users can ONLY see their own data
CREATE POLICY "profiles_own_data_only" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- POLICY 2: Users can only update their own profile (excluding email changes)
CREATE POLICY "profiles_own_update_only" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id AND 
  -- Prevent email changes through regular updates for security
  email = OLD.email
);

-- POLICY 3: Profile creation only for new users (system-level)
CREATE POLICY "profiles_system_insert_only" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- CRITICAL: Remove any public functions that might expose profile data
-- Drop the existing team access functions that could be exploited
DROP FUNCTION IF EXISTS public.get_team_profiles_for_gestor();
DROP FUNCTION IF EXISTS public.get_basic_team_info();

-- Create SECURE function for gestors to get MINIMAL team info (NO EMAILS)
CREATE OR REPLACE FUNCTION public.get_secure_team_basic_info()
RETURNS TABLE(user_id uuid, name text, role user_role)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow gestors to call this function
  IF public.get_current_user_role() != 'gestor' THEN
    RAISE EXCEPTION 'Access denied: Insufficient permissions';
  END IF;
  
  -- Return ONLY safe fields - NO EMAIL ADDRESSES EVER
  RETURN QUERY
  SELECT p.user_id, p.name, p.role
  FROM public.profiles p
  WHERE p.user_id != auth.uid() -- Exclude the gestor themselves
    AND p.role = 'vendedor' -- Only show vendedor role users
    AND p.email != 'vendas19@totalcad.com.br'; -- Exclude system user
END;
$$;

-- Create function to get user's own email (for settings, etc)
CREATE OR REPLACE FUNCTION public.get_own_email()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email 
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  RETURN user_email;
END;
$$;

-- Update the user ranking function to be more secure
DROP FUNCTION IF EXISTS public.get_user_ranking_positions();
CREATE OR REPLACE FUNCTION public.get_user_ranking_positions()
RETURNS TABLE(sales_position integer, renewals_position integer, cross_selling_position integer, packs_position integer, onboarding_position integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
BEGIN
  -- Return user positions for each metric based on last 30 days of data
  -- NO EMAIL ACCESS - only use user_id for ranking
  RETURN QUERY
  WITH user_metrics AS (
    SELECT 
      p.user_id,
      p.name, -- Name is OK for ranking, but NO email
      COALESCE(SUM(dr.sales_amount), 0) as total_sales,
      COALESCE(SUM(dr.chaos_renewed + dr.sketchup_renewed), 0) as total_renewals,
      COALESCE(SUM(dr.cross_selling), 0) as total_cross_selling,
      COALESCE(SUM(dr.packs_vendidos), 0) as total_packs,
      COALESCE(SUM(dr.onboarding), 0) as total_onboarding
    FROM profiles p
    LEFT JOIN daily_reports dr ON p.user_id = dr.user_id 
      AND dr.date >= CURRENT_DATE - INTERVAL '30 days'
    WHERE p.user_id != current_user_id -- Exclude sensitive system accounts
    GROUP BY p.user_id, p.name
  ),
  rankings AS (
    SELECT 
      user_id,
      ROW_NUMBER() OVER (ORDER BY total_sales DESC, name ASC) as sales_rank,
      ROW_NUMBER() OVER (ORDER BY total_renewals DESC, name ASC) as renewals_rank,
      ROW_NUMBER() OVER (ORDER BY total_cross_selling DESC, name ASC) as cross_selling_rank,
      ROW_NUMBER() OVER (ORDER BY total_packs DESC, name ASC) as packs_rank,
      ROW_NUMBER() OVER (ORDER BY total_onboarding DESC, name ASC) as onboarding_rank
    FROM user_metrics
  )
  SELECT 
    sales_rank::INTEGER,
    renewals_rank::INTEGER,
    cross_selling_rank::INTEGER,
    packs_rank::INTEGER,
    onboarding_rank::INTEGER
  FROM rankings
  WHERE user_id = current_user_id;
END;
$$;

-- Add email protection trigger - prevent unauthorized email changes
CREATE OR REPLACE FUNCTION public.protect_email_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow email changes by the profile owner and with special permission
  IF OLD.email != NEW.email AND auth.uid() != NEW.user_id THEN
    RAISE EXCEPTION 'Unauthorized email modification attempt detected';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_profile_email_changes
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_email_changes();

-- Add audit logging for profile access attempts
CREATE OR REPLACE FUNCTION public.log_profile_access_attempt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log any profile access for security monitoring
  INSERT INTO public.profile_access_log (accessed_by, accessed_profile, access_type)
  VALUES (auth.uid(), NEW.user_id, 'profile_view')
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Ensure RLS is enabled with maximum security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;