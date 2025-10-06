-- Adiciona constraint UNIQUE no user_id da tabela profiles (se não existir)
-- Isso é necessário para permitir foreign keys referenciando user_id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_user_id_key'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Agora adiciona a foreign key entre prize_achievements e profiles
ALTER TABLE prize_achievements 
ADD CONSTRAINT fk_prize_achievements_user_id 
FOREIGN KEY (user_id) 
REFERENCES profiles(user_id) 
ON DELETE CASCADE;