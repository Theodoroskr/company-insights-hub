-- 1. get_my_role now reads the protected user_roles table
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.user_roles
  WHERE user_id = auth.uid()
  ORDER BY CASE role
    WHEN 'super_admin' THEN 1
    WHEN 'admin' THEN 2
    WHEN 'support' THEN 3
    ELSE 4 END
  LIMIT 1;
$$;

-- 2. Replace legacy profiles.role-based policies
DROP POLICY IF EXISTS "Admins can manage promo codes" ON public.promo_codes;
CREATE POLICY "Staff can manage promo codes" ON public.promo_codes
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'promo_codes', false))
  WITH CHECK (public.has_permission(auth.uid(), 'promo_codes', true));

DROP POLICY IF EXISTS "Admins can read all orders" ON public.orders;
CREATE POLICY "Staff can read all orders" ON public.orders
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Staff can update orders" ON public.orders
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins can read all order items" ON public.order_items;
CREATE POLICY "Staff can read all order items" ON public.order_items
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins can update order items" ON public.order_items;
CREATE POLICY "Staff can update order items" ON public.order_items
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Staff can read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Staff can update profiles" ON public.profiles
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_logs;
CREATE POLICY "Staff can insert audit logs" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins can read audit logs" ON public.audit_logs;
CREATE POLICY "Staff can read audit logs" ON public.audit_logs
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Staff can manage products" ON public.products
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'products', false))
  WITH CHECK (public.has_permission(auth.uid(), 'products', true));

DROP POLICY IF EXISTS "Admins can update tenants" ON public.tenants;
CREATE POLICY "Super admins can update tenants" ON public.tenants
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Admins can update countries" ON public.countries;
CREATE POLICY "Staff can update countries" ON public.countries
  FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'certificates', false))
  WITH CHECK (public.has_permission(auth.uid(), 'certificates', true));

-- 3. Block self-promotion via the profile row
CREATE OR REPLACE FUNCTION public.prevent_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND NOT public.has_role(auth.uid(), 'super_admin') THEN
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prevent_profile_role_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS prevent_profile_role_change ON public.profiles;
CREATE TRIGGER prevent_profile_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_role_change();