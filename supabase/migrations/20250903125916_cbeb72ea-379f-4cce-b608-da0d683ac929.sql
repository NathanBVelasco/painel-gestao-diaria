-- Create function to calculate user positions in rankings without exposing other users' data
CREATE OR REPLACE FUNCTION public.get_user_ranking_positions()
RETURNS TABLE(
  sales_position INTEGER,
  renewals_position INTEGER,
  cross_selling_position INTEGER,
  packs_position INTEGER,
  onboarding_position INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_id UUID := auth.uid();
BEGIN
  -- Return user positions for each metric based on last 30 days of data
  RETURN QUERY
  WITH user_metrics AS (
    SELECT 
      p.user_id,
      p.name,
      COALESCE(SUM(dr.sales_amount), 0) as total_sales,
      COALESCE(SUM(dr.chaos_renewed + dr.sketchup_renewed), 0) as total_renewals,
      COALESCE(SUM(dr.cross_selling), 0) as total_cross_selling,
      COALESCE(SUM(dr.packs_vendidos), 0) as total_packs,
      COALESCE(SUM(dr.onboarding), 0) as total_onboarding
    FROM profiles p
    LEFT JOIN daily_reports dr ON p.user_id = dr.user_id 
      AND dr.date >= CURRENT_DATE - INTERVAL '30 days'
    WHERE p.email != 'vendas19@totalcad.com.br' -- Exclude system user
    GROUP BY p.user_id, p.name
  ),
  rankings AS (
    SELECT 
      user_id,
      ROW_NUMBER() OVER (ORDER BY total_sales DESC, name ASC) as sales_rank,
      ROW_NUMBER() OVER (ORDER BY total_renewals DESC, name ASC) as renewals_rank,
      ROW_NUMBER() OVER (ORDER BY total_cross_selling DESC, name ASC) as cross_selling_rank,
      ROW_NUMBER() OVER (ORDER BY total_packs DESC, name ASC) as packs_rank,
      ROW_NUMBER() OVER (ORDER BY total_onboarding DESC, name ASC) as onboarding_rank
    FROM user_metrics
  )
  SELECT 
    sales_rank::INTEGER,
    renewals_rank::INTEGER,
    cross_selling_rank::INTEGER,
    packs_rank::INTEGER,
    onboarding_rank::INTEGER
  FROM rankings
  WHERE user_id = current_user_id;
END;
$$;