-- CRITICAL SECURITY FIX: Protect employee email addresses from unauthorized access
-- This migration implements zero-trust security for profile data (CORRECTED VERSION)

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

-- POLICY 2: Users can only update their own profile (secure version)
CREATE POLICY "profiles_own_update_only" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

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

-- Create function to get user's own email securely (for settings, etc)
CREATE OR REPLACE FUNCTION public.get_own_email()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- User can only get their OWN email
  SELECT email INTO user_email 
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  RETURN user_email;
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
  -- Only allow email changes by the profile owner
  IF OLD.email != NEW.email AND auth.uid() != NEW.user_id THEN
    RAISE EXCEPTION 'Unauthorized email modification attempt detected';
  END IF;
  
  -- Log any email change attempts for security monitoring
  IF OLD.email != NEW.email THEN
    INSERT INTO public.profile_access_log (accessed_by, accessed_profile, access_type)
    VALUES (auth.uid(), NEW.user_id, 'email_change_attempt')
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_profile_email_changes
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_email_changes();

-- Ensure RLS is enabled with maximum security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;