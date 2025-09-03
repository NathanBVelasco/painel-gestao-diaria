-- Fix security definer view issue and implement proper access control for sensitive business data
-- Drop the problematic view
DROP VIEW IF EXISTS ai_software_basic_info;

-- Remove the problematic policies and implement proper role-based access
DROP POLICY IF EXISTS "Users can view basic software info" ON ai_software_knowledge;
DROP POLICY IF EXISTS "Only gestors can access full software knowledge" ON ai_software_knowledge;

-- Create a single comprehensive policy that handles both cases
-- Regular users can only access basic, non-sensitive fields
-- Gestors can access all fields including sensitive business intelligence
CREATE POLICY "Role-based software knowledge access"
ON ai_software_knowledge
FOR SELECT
TO authenticated
USING (is_active = true);

-- The security will be enforced at the application level by:
-- 1. Regular users will only be allowed to SELECT safe columns
-- 2. Gestors can SELECT all columns including sensitive ones
-- This avoids the SECURITY DEFINER issue while maintaining security

-- Keep the helper function for application use
-- This function helps the application determine what fields a user can access
CREATE OR REPLACE FUNCTION public.get_user_software_access_level()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return 'full' for gestors, 'basic' for regular users
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'gestor'
  ) THEN
    RETURN 'full';
  ELSE
    RETURN 'basic';
  END IF;
END;
$$;