DROP POLICY IF EXISTS "Companies are publicly readable" ON public.companies;

CREATE POLICY "Companies on active country sites are readable"
ON public.companies
FOR SELECT
TO anon, authenticated
USING (
  tenant_id IS NULL
  OR EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = companies.tenant_id AND t.is_active IS TRUE
  )
);

CREATE POLICY "Staff can read all companies"
ON public.companies
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));