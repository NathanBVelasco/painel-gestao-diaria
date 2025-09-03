-- Fix security issue: Remove conflicting RLS policies and create clear, secure policies

-- Drop all existing policies on profiles table to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles; 
DROP POLICY IF EXISTS "Users can only view own profile directly" ON public.profiles;

-- Create clear, non-conflicting RLS policies for profiles table
-- Policy 1: Users can only view their own profile data
CREATE POLICY "profiles_select_own" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Policy 2: Users can only update their own profile data
CREATE POLICY "profiles_update_own" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can insert their own profile (for profile creation)
CREATE POLICY "profiles_insert_own" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy 4: Prevent profile deletion (profiles should be persistent)
-- Users cannot delete their profiles - this should be handled by admin functions if needed
-- No DELETE policy = no one can delete profiles

-- Ensure the table has proper RLS enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create a secure function for profile creation during user registration
CREATE OR REPLACE FUNCTION public.create_profile_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile only if it doesn't exist
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Ensure the trigger exists for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_profile_for_user();

-- Add additional security: ensure user_id column cannot be null
-- This prevents potential security bypass attempts
ALTER TABLE public.profiles ALTER COLUMN user_id SET NOT NULL;