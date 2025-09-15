-- Update RLS policy for sellers to also see inactive prizes they won
DROP POLICY IF EXISTS "Sellers can view their relevant active prizes" ON prizes;

CREATE POLICY "Sellers can view their relevant prizes" 
ON prizes 
FOR SELECT 
USING (
  (auth.uid() IS NOT NULL) 
  AND (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'vendedor'::user_role)) 
  AND (
    -- Active prizes they can participate in
    (is_active = true AND ((is_for_all = true) OR ((target_users IS NOT NULL) AND ((auth.uid())::text = ANY ((target_users)::text[])))))
    OR
    -- Inactive prizes they won
    (is_active = false AND EXISTS (SELECT 1 FROM prize_achievements pa WHERE pa.prize_id = id AND pa.user_id = auth.uid()))
  )
);