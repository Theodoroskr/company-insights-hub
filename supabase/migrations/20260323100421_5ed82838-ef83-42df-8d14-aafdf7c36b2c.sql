-- Fix infinite recursion in profiles RLS policies
-- The admin policies on profiles were self-referencing profiles to check role → infinite loop.
-- Fix: use a SECURITY DEFINER function to check role without triggering RLS.

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Drop recursive policies on profiles
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;

-- Recreate using the security definer function (no recursion)
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.get_my_role() = ANY(ARRAY['admin','super_admin']));

CREATE POLICY "Admins can update profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.get_my_role() = ANY(ARRAY['admin','super_admin']));

-- Also fix audit_logs admin policy (same recursion pattern)
DROP POLICY IF EXISTS "Admins can read audit logs" ON public.audit_logs;
CREATE POLICY "Admins can read audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.get_my_role() = ANY(ARRAY['admin','super_admin']));