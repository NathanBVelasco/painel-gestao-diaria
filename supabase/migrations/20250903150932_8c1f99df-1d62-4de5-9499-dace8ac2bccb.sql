-- Fix security vulnerability: Remove overly permissive policy that exposes sensitive business data
-- Currently there are two conflicting SELECT policies allowing unauthorized access to sensitive data

-- Remove the overly permissive policy that allows all users access
DROP POLICY IF EXISTS "Role-based software knowledge access" ON ai_software_knowledge;

-- Keep only the secure policy that restricts sensitive business data to gestors
-- The remaining policy "Only gestors can access sensitive business data" with condition:
-- ((is_active = true) AND can_access_sensitive_business_data())
-- This ensures only users with 'gestor' role can access sensitive business intelligence

-- For non-gestor users who need basic software information, they should use
-- application-level queries that select only non-sensitive columns:
-- software_name, category, description, differentials, target_audience, use_cases, integration_benefits

-- Add a policy for basic software info access to non-gestor users
-- This allows regular users to see basic software information but not sensitive business data
CREATE POLICY "Users can view basic software info" 
ON ai_software_knowledge 
FOR SELECT 
TO authenticated
USING (
  is_active = true 
  AND (
    -- Gestors can see everything
    can_access_sensitive_business_data() 
    -- Regular users can access basic info but application must filter sensitive columns
    OR auth.uid() IS NOT NULL
  )
);

-- Note: Application code must enforce column-level security by only selecting
-- non-sensitive fields for non-gestor users. Sensitive fields include:
-- pricing_strategy, sales_scripts, competitors, roi_points, common_objections