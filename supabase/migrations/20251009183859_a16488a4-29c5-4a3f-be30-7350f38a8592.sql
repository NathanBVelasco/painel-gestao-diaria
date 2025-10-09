-- Create separate roles system to avoid recursive policies on profiles
-- 1) Enum for roles (gestor, vendedor)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'app_role'
  ) THEN
    CREATE TYPE public.app_role AS ENUM ('gestor','vendedor');
  END IF;
END $$;

-- 2) user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- 3) Enable RLS on user_roles and minimal read policy for own roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 4) SECURITY DEFINER function to check role without touching profiles (prevents recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- 5) Seed roles from existing profiles once
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id,
  CASE 
    WHEN p.role = 'gestor'::user_role THEN 'gestor'::app_role
    WHEN p.role = 'vendedor'::user_role THEN 'vendedor'::app_role
  END AS role
FROM public.profiles p
WHERE p.role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 6) Replace recursive profiles policy with one that uses has_role()
DROP POLICY IF EXISTS "Gestors can view all profiles" ON public.profiles;
CREATE POLICY "Gestors can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'gestor'::app_role));