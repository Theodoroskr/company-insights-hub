
## Admin Back-Office — Implementation Plan

### What exists
- All 6 admin stub pages (`AdminDashboard`, `AdminOrdersPage`, `AdminFulfillmentPage`, `AdminProductsPage`, `AdminCustomersPage`, `AdminSettingsPage`) — one-liners using `PageLayout`, need full replacement
- `AdminRoute` guard in `RouteGuards.tsx` — checks `profiles.role` — already works
- App.tsx already has all 6 admin routes wrapped in `AdminRoute`
- Missing routes: `/admin/orders/:id`, `/admin/promo-codes`, `/admin/source-health`, `/admin/audit-logs`
- No `promo_codes` table exists — needs migration

### What to build

**Migration** — `promo_codes` table:
```sql
CREATE TABLE public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  code text NOT NULL,
  discount_type text NOT NULL DEFAULT 'percent', -- 'percent' | 'fixed'
  discount_value numeric NOT NULL,
  max_uses integer,
  uses_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage promo codes" ON public.promo_codes
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')));
```
Also add `assigned_to` (text, nullable) column to `order_items` for fulfillment claim feature.

**New files to create:**

1. `src/components/layout/AdminLayout.tsx` — dark sidebar (220px, `#0F2444`), top bar with tenant name + back-to-site, nav links with active highlight. Wraps all admin pages instead of `PageLayout`.

2. `src/pages/admin/AdminDashboard.tsx` — 4 KPI cards (orders today, revenue today, pending fulfillment, failed), API4All health panel, SLA alerts table, recent 10 orders table.

3. `src/pages/admin/AdminOrdersPage.tsx` — filterable full orders table. Columns: Date, Ref, Tenant, Customer, Company, Product, Status, Total, SLA remaining (color-coded), Actions (View / Refund).

4. `src/pages/admin/AdminOrderDetailPage.tsx` (new) — full order view with per-item retry/mark-complete, raw JSON viewer, internal notes, status override, refund modal.

5. `src/pages/admin/AdminFulfillmentPage.tsx` — auto-refreshing (60s) queue sorted by SLA deadline, row color coding (red/amber/white), Claim/Upload/Mark complete/View order actions.

6. `src/pages/admin/AdminProductsPage.tsx` — tenant-filtered products table, inline active toggle, add/edit slide-in drawer with all product fields including JSON editor for `available_speeds`.

7. `src/pages/admin/AdminCustomersPage.tsx` — users table with search, click-to-open slide-in panel: profile, order history, role selector (super_admin only).

8. `src/pages/admin/AdminPromoCodesPage.tsx` (new) — promo codes table + create modal.

9. `src/pages/admin/AdminSourceHealthPage.tsx` (new) — API4All status card, test buttons, error log table.

10. `src/pages/admin/AdminAuditLogsPage.tsx` (new) — reads from `audit_logs` table, filterable by action/entity.

11. `src/pages/admin/AdminSettingsPage.tsx` — tenant settings form with color picker, live navbar preview.

**App.tsx changes:**
- Add `AdminLayout` wrapper inside `AdminRoute` (using an outlet pattern or wrap each route individually)
- Add new routes: `/admin/orders/:id`, `/admin/promo-codes`, `/admin/source-health`, `/admin/audit-logs`
- Wire to new page components

### Architecture notes

`AdminLayout` is a standalone layout (no `Navbar`/`Footer`). Each admin page imports it directly — same pattern as how `PageLayout` works. This avoids touching `App.tsx` routing structure beyond adding the new routes.

Data access: All admin queries use the Supabase client directly. Admins need access to orders/profiles across users — the existing RLS on `orders` only allows `user_id = auth.uid()`. This means:
- **Orders table**: existing policy `Users can read own orders` restricts admins. Admin pages will query via the service-role path — but since we only have the anon key in the client, we can only read rows where the admin is the user. 
- Best approach: add permissive SELECT policies for admins on `orders`, `order_items`, `profiles` tables using the existing `has_role` pattern.

**Migration will also add:**
```sql
-- Allow admins to read all orders
CREATE POLICY "Admins can read all orders" ON public.orders
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')));

-- Allow admins to update orders (status, notes)
CREATE POLICY "Admins can update orders" ON public.orders
  FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')));

-- Allow admins to read all order_items
CREATE POLICY "Admins can read all order items" ON public.order_items
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')));

-- Allow admins to update order_items (fulfillment_status etc.)
CREATE POLICY "Admins can update order items" ON public.order_items
  FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')));

-- Allow admins to read all profiles
CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin')));

-- Allow admins to update all profiles (for role management)
CREATE POLICY "Admins can update profiles" ON public.profiles
  FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin')));

-- Allow admins to insert audit logs
CREATE POLICY "Admins can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')));

-- Allow admins to manage products
CREATE POLICY "Admins can manage products" ON public.products
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')));
```

Also add `assigned_to text` column to `order_items` for the fulfillment "Claim" feature.

### Files summary
```
CREATE  src/components/layout/AdminLayout.tsx
EDIT    src/pages/admin/AdminDashboard.tsx
EDIT    src/pages/admin/AdminOrdersPage.tsx
CREATE  src/pages/admin/AdminOrderDetailPage.tsx
EDIT    src/pages/admin/AdminFulfillmentPage.tsx
EDIT    src/pages/admin/AdminProductsPage.tsx
EDIT    src/pages/admin/AdminCustomersPage.tsx
CREATE  src/pages/admin/AdminPromoCodesPage.tsx
CREATE  src/pages/admin/AdminSourceHealthPage.tsx
CREATE  src/pages/admin/AdminAuditLogsPage.tsx
EDIT    src/pages/admin/AdminSettingsPage.tsx
EDIT    src/App.tsx  (add 4 new routes, import new pages)
CREATE  supabase/migrations/..._admin_policies.sql
```
