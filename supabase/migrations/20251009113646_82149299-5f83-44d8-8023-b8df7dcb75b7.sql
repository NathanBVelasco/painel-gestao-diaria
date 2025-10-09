-- Adicionar política RLS para gestores visualizarem todas as conversas
CREATE POLICY "Gestors can view all conversations"
ON ai_conversations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'gestor'
  )
);