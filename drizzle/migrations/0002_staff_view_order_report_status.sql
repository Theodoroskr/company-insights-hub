GRANT SELECT ON public.generated_reports TO authenticated;
CREATE POLICY "Staff can view order report status"
ON public.generated_reports FOR SELECT TO authenticated
USING (public.has_permission(auth.uid(), 'orders', false));