-- ============================================================================
-- HRMS Core Schema — Phase 1
-- Run this in your Supabase SQL Editor (Project → SQL Editor → New query)
-- OR commit and run `supabase db push` from the linked GitHub repo.
-- Project: https://tmvdiqeluqyretmemwsr.supabase.co
-- ============================================================================

-- 1. Roles enum
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('owner', 'hr_staff', 'manager', 'employee', 'cashier');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Profiles (1:1 with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 3. User roles (never store roles on profiles — privilege escalation risk)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 4. has_role() — security definer avoids recursive RLS
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- 5. Departments
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read departments" ON public.departments;
CREATE POLICY "Authenticated read departments" ON public.departments
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "HR manages departments" ON public.departments;
CREATE POLICY "HR manages departments" ON public.departments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'hr_staff') OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'hr_staff') OR public.has_role(auth.uid(), 'owner'));

-- 6. Positions
CREATE TABLE IF NOT EXISTS public.positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  title text NOT NULL,
  level text,
  salary_grade numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.positions TO authenticated;
GRANT ALL ON public.positions TO service_role;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read positions" ON public.positions;
CREATE POLICY "Authenticated read positions" ON public.positions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "HR manages positions" ON public.positions;
CREATE POLICY "HR manages positions" ON public.positions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'hr_staff') OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'hr_staff') OR public.has_role(auth.uid(), 'owner'));

-- 7. Employees
CREATE TABLE IF NOT EXISTS public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_code text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  gender text,
  birth_date date,
  address text,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  position_id uuid REFERENCES public.positions(id) ON DELETE SET NULL,
  hire_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'active',
  pos_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Employees read self" ON public.employees;
CREATE POLICY "Employees read self" ON public.employees
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "HR Owner Manager read all employees" ON public.employees;
CREATE POLICY "HR Owner Manager read all employees" ON public.employees
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'hr_staff') OR public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'));

DROP POLICY IF EXISTS "HR manages employees" ON public.employees;
CREATE POLICY "HR manages employees" ON public.employees
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'hr_staff') OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'hr_staff') OR public.has_role(auth.uid(), 'owner'));

-- 8. Auto-create profile + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'employee')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_employees_updated_at ON public.employees;
CREATE TRIGGER set_employees_updated_at BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- After running this: sign up your first user in the app, then promote them:
--   SELECT id FROM auth.users WHERE email = 'you@example.com';
--   INSERT INTO public.user_roles (user_id, role) VALUES ('<that-id>', 'owner');
-- ============================================================================
