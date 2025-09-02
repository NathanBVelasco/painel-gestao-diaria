-- Add packs_vendidos column to daily_reports table
ALTER TABLE public.daily_reports 
ADD COLUMN packs_vendidos integer DEFAULT 0;