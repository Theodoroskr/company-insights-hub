ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS certificates_enabled boolean NOT NULL DEFAULT false;
GRANT UPDATE (certificates_enabled) ON public.countries TO authenticated;
CREATE POLICY "Admins can update countries" ON public.countries FOR UPDATE TO authenticated USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');