-- Adicionar política para gestores visualizarem perfis de outros usuários
CREATE POLICY "Gestors can view all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'gestor'
  )
);