DROP POLICY IF EXISTS "Staff can read all orders" ON public.orders;
DROP POLICY IF EXISTS "Staff can update orders" ON public.orders;
CREATE POLICY "Staff can read all orders" ON public.orders FOR SELECT TO authenticated USING (public.has_permission(auth.uid(),'orders') OR public.has_permission(auth.uid(),'fulfillment'));
CREATE POLICY "Staff can update orders" ON public.orders FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(),'orders',true));

DROP POLICY IF EXISTS "Staff can read all order items" ON public.order_items;
DROP POLICY IF EXISTS "Staff can update order items" ON public.order_items;
CREATE POLICY "Staff can read all order items" ON public.order_items FOR SELECT TO authenticated USING (public.has_permission(auth.uid(),'orders') OR public.has_permission(auth.uid(),'fulfillment'));
CREATE POLICY "Staff can update order items" ON public.order_items FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(),'orders',true) OR public.has_permission(auth.uid(),'fulfillment',true));

DROP POLICY IF EXISTS "Admins can manage fulfillment tasks" ON public.fulfillment_tasks;
CREATE POLICY "Staff can view fulfillment tasks" ON public.fulfillment_tasks FOR SELECT TO authenticated USING (public.has_permission(auth.uid(),'fulfillment'));
CREATE POLICY "Staff can manage fulfillment tasks" ON public.fulfillment_tasks FOR ALL TO authenticated USING (public.has_permission(auth.uid(),'fulfillment',true)) WITH CHECK (public.has_permission(auth.uid(),'fulfillment',true));

DROP POLICY IF EXISTS "Staff can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Staff can update profiles" ON public.profiles;
CREATE POLICY "Staff can read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_permission(auth.uid(),'customers') OR public.has_permission(auth.uid(),'orders') OR public.has_permission(auth.uid(),'roles'));
CREATE POLICY "Staff can update profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(),'customers',true));

DROP POLICY IF EXISTS "Staff can read audit logs" ON public.audit_logs;
CREATE POLICY "Staff can read audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_permission(auth.uid(),'audit_logs'));

DROP POLICY IF EXISTS "Admins can view all screening results" ON public.screening_results;
DROP POLICY IF EXISTS "Admins can insert screening results" ON public.screening_results;
DROP POLICY IF EXISTS "Admins can update screening results" ON public.screening_results;
CREATE POLICY "Staff can view all screening results" ON public.screening_results FOR SELECT TO authenticated USING (public.has_permission(auth.uid(),'orders') OR public.has_permission(auth.uid(),'fulfillment'));
CREATE POLICY "Staff can insert screening results" ON public.screening_results FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(),'fulfillment',true));
CREATE POLICY "Staff can update screening results" ON public.screening_results FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(),'fulfillment',true));

DROP POLICY IF EXISTS "Admins can view all screening hits" ON public.screening_entity_hits;
DROP POLICY IF EXISTS "Admins can insert screening hits" ON public.screening_entity_hits;
CREATE POLICY "Staff can view all screening hits" ON public.screening_entity_hits FOR SELECT TO authenticated USING (public.has_permission(auth.uid(),'orders') OR public.has_permission(auth.uid(),'fulfillment'));
CREATE POLICY "Staff can insert screening hits" ON public.screening_entity_hits FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(),'fulfillment',true));