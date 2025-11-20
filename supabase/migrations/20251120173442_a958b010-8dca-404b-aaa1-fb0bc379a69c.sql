-- Update Rachel Rodrigues to gestor role in profiles
UPDATE public.profiles 
SET role = 'gestor', updated_at = now()
WHERE user_id = '801a2603-fa82-4526-a851-890f65691759';

-- Add gestor role in user_roles table
INSERT INTO public.user_roles (user_id, role)
VALUES ('801a2603-fa82-4526-a851-890f65691759', 'gestor')
ON CONFLICT (user_id, role) DO NOTHING;