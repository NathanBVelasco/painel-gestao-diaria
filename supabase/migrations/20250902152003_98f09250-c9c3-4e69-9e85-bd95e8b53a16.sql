-- Add onboarding details field to daily_reports table
ALTER TABLE public.daily_reports 
ADD COLUMN onboarding_details TEXT;