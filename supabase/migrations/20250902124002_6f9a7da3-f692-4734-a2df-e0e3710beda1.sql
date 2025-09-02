-- Update user role to gestor for vendas19@totalcad.com.br
UPDATE public.profiles 
SET role = 'gestor'::user_role 
WHERE email = 'vendas19@totalcad.com.br';