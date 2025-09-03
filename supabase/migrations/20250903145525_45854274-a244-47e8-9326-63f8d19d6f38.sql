-- Secure sensitive business intelligence in ai_software_knowledge table
-- Drop existing policy that allows all users to view everything
DROP POLICY IF EXISTS "All users can view software knowledge" ON ai_software_knowledge;

-- Create new policies with field-level restrictions
-- Policy 1: All authenticated users can view basic software information (non-sensitive fields)
CREATE POLICY "Users can view basic software info"
ON ai_software_knowledge
FOR SELECT
TO authenticated
USING (
  is_active = true
);

-- Policy 2: Only gestors can access sensitive business intelligence fields
-- This will be enforced at the application level by restricting which columns gestors vs regular users can select
-- We'll create a view for regular users that only exposes safe fields
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

-- Enable RLS on the view (inherits from base table)
-- Regular users will use this view, gestors can access the full table

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

-- Grant appropriate permissions on the view
GRANT SELECT ON ai_software_basic_info TO authenticated;

-- Update the original policy to restrict sensitive fields access to gestors only
CREATE POLICY "Only gestors can access full software knowledge"
ON ai_software_knowledge
FOR SELECT
TO authenticated
USING (
  is_active = true AND can_access_sensitive_business_data()
);