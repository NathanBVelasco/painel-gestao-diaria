-- Permitir que todos os usuários autenticados vejam os achievements da equipe
-- Isso é necessário para a funcionalidade de gamificação e transparência da equipe

-- Remove a política restritiva que só permite ver próprios achievements
DROP POLICY IF EXISTS "Users can view their own achievements" ON prize_achievements;

-- Cria nova política que permite todos os usuários autenticados verem todos os achievements
CREATE POLICY "Authenticated users can view all achievements"
ON prize_achievements
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Mantém a política que permite inserir apenas próprios achievements
-- (já existe: "Users can insert their own achievements")