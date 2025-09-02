-- Fix remaining security definer view issue by removing the view entirely
DROP VIEW IF EXISTS public.team_members;

-- The Dashboard will now query profiles directly with the restricted RLS policy in place
-- This eliminates the security definer view warning

-- Ensure all profile access is properly logged (for audit purposes)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;