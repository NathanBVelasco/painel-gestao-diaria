-- Remove the insecure public policy that allows anyone to view prizes
DROP POLICY IF EXISTS "Everyone can view active prizes" ON public.prizes;

-- Create secure policy for gestors to view all active prizes
CREATE POLICY "Gestors can view all active prizes" 
ON public.prizes 
FOR SELECT 
USING (
  is_active = true 
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'gestor'::user_role
  )
);

-- Create secure policy for sellers to view only their relevant active prizes
CREATE POLICY "Sellers can view their relevant active prizes" 
ON public.prizes 
FOR SELECT 
USING (
  is_active = true 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'vendedor'::user_role
  )
  AND (
    is_for_all = true 
    OR (target_users IS NOT NULL AND auth.uid()::text = ANY(target_users))
  )
);