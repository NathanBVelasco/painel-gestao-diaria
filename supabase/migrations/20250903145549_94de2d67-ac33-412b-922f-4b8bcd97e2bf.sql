-- Secure sensitive business intelligence in ai_software_knowledge table
-- Drop all existing policies first
DROP POLICY IF EXISTS "All users can view software knowledge" ON ai_software_knowledge;
DROP POLICY IF EXISTS "Users can view basic software info" ON ai_software_knowledge;
DROP POLICY IF EXISTS "Only gestors can access full software knowledge" ON ai_software_knowledge;

-- Drop existing view if it exists
DROP VIEW IF EXISTS ai_software_basic_info;

-- Create a secure function to check if user can access sensitive business data
CREATE OR REPLACE FUNCTION can_access_sensitive_business_data()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only gestors can access sensitive business intelligence
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'gestor'
  );
END;
$$;

-- Create new restrictive policy - only gestors can access the full table with sensitive data
CREATE POLICY "Only gestors can access sensitive business data"
ON ai_software_knowledge
FOR SELECT
TO authenticated
USING (
  is_active = true AND can_access_sensitive_business_data()
);

-- Create a safe view for regular users that only exposes non-sensitive fields
CREATE VIEW ai_software_basic_info AS
SELECT 
  id,
  software_name,
  category,
  description,
  differentials,
  target_audience,
  use_cases,
  integration_benefits,
  is_active,
  created_at,
  updated_at
FROM ai_software_knowledge
WHERE is_active = true;

-- Grant select permission on the view to authenticated users
GRANT SELECT ON ai_software_basic_info TO authenticated;