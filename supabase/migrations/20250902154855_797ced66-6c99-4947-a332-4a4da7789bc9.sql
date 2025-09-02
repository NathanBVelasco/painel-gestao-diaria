-- Add prize criteria columns to prizes table
ALTER TABLE public.prizes 
ADD COLUMN criteria_type TEXT CHECK (criteria_type IN ('sales_amount', 'onboarding', 'packs_vendidos', 'cross_selling', 'sketchup_renewed', 'chaos_renewed')),
ADD COLUMN criteria_target NUMERIC DEFAULT 0,
ADD COLUMN criteria_period TEXT DEFAULT 'week' CHECK (criteria_period IN ('day', 'week', 'month'));

-- Add index for better query performance
CREATE INDEX idx_prizes_criteria ON public.prizes(criteria_type, is_active) WHERE criteria_type IS NOT NULL;