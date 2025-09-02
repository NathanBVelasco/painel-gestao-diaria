-- Allow gestors to update team reports for recent dates
CREATE POLICY "Gestors can update recent team reports" 
ON public.daily_reports 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'gestor'
  ) 
  AND date >= (CURRENT_DATE - INTERVAL '90 days')
);