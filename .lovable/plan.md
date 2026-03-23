
## Account Dashboard Area — Implementation Plan

### What already exists (do not touch)
- `AccountLayout.tsx` — sidebar with Profile, Reports, Invoices nav links; user card with initials
- `AccountProfilePage.tsx` — fully built
- `AccountOrdersPage.tsx` — fully built
- `AccountOrderDetailPage.tsx` — fully built
- `AccountInvoicesPage.tsx` — fully built
- All routes in `App.tsx` — `/account/*` routes already wired
- `AccountDashboard.tsx` — stub using PageLayout → **needs full replacement**
- `AccountDownloadsPage.tsx` — stub using PageLayout → **needs full replacement**
- `AccountMonitoringPage.tsx` — stub using PageLayout → **needs full replacement**

### What the request adds
1. **AccountLayout update** — add Dashboard, Downloads, Monitoring nav items + Sign Out at bottom
2. **AccountDashboard** — stats cards, recent orders, change alerts
3. **AccountDownloadsPage** — table of `generated_reports` via `order_items` join
4. **AccountMonitoringPage** — subscriptions list + change events timeline
5. **AccountProfilePage update** — add Security section (Change Password, Delete Account), incomplete profile warning
6. **App.tsx** — add `/dashboard` redirect to `/account`

---

### 1. Update AccountLayout (`src/components/layout/AccountLayout.tsx`)

Extend `NAV_ITEMS` to include all 5 links:
- Dashboard → `/account` (LayoutDashboard icon)
- My Orders → `/account/orders` (FileText icon)
- Downloads → `/account/downloads` (Download icon)
- Monitoring → `/account/monitoring` (Eye icon)
- Profile → `/account/profile` (User icon)

Active matching: `/account` exact, `/account/orders` prefix, `/account/downloads` exact, `/account/monitoring` exact, `/account/profile` exact.

Add Sign Out button at sidebar bottom:
- `supabase.auth.signOut()` then `navigate('/')`
- Style: `text-sm text-muted`, hover red

Avatar uses `var(--brand-primary)` bg (not salmon — per spec).

---

### 2. AccountDashboard (`src/pages/account/AccountDashboard.tsx`)

Full replacement. Data fetched on mount:
- **Total Orders**: `SELECT count FROM orders WHERE user_id = uid`
- **Downloads Available**: `SELECT count FROM generated_reports via order_items join WHERE download_expires_at > now()`
- **Active Monitoring**: `SELECT count FROM monitoring_subscriptions WHERE user_id = uid AND active = true`
- **Recent Orders**: last 5 orders with items/company/product join
- **Change Alerts**: `SELECT count FROM change_events via monitoring_subscriptions WHERE user_id = uid AND detected_at > now() - interval '7 days'`

Layout:
- `"Welcome back, {firstName}"` + today's date subtitle
- 3 KPI cards (Orders = blue, Downloads = green, Monitoring = amber)
- Recent orders table (5 rows): Date | Ref | Company | Product | Status | Total
- "View all orders →" link
- If change alerts > 0: amber alert card with link to `/account/monitoring`

---

### 3. AccountDownloadsPage (`src/pages/account/AccountDownloadsPage.tsx`)

Full replacement. Fetch:
```sql
SELECT gr.id, gr.download_token, gr.download_expires_at, gr.generated_at,
       gr.pdf_storage_path, gr.report_type,
       oi.id as item_id,
       p.name as product_name,
       c.name as company_name,
       o.created_at as order_date, o.id as order_id
FROM generated_reports gr
JOIN order_items oi ON oi.id = gr.order_item_id
JOIN orders o ON o.id = oi.order_id
JOIN products p ON p.id = oi.product_id
JOIN companies c ON c.id = oi.company_id
WHERE o.user_id = uid
ORDER BY gr.generated_at DESC
```

In Supabase client query chain: `from('generated_reports').select('..., order_items!inner(order_id, products(name), companies(name), orders!inner(user_id, created_at, id))')`.

Table columns: Report Type | Company | Order Date | Expires | Action
- Download button (green) if `download_expires_at > now()`
- "Expired" badge + "Reorder" link to `/search` if expired
- Empty state: "No downloads available yet"

---

### 4. AccountMonitoringPage (`src/pages/account/AccountMonitoringPage.tsx`)

Full replacement. Two sections:

**Active Subscriptions** — fetch `monitoring_subscriptions WHERE user_id = uid`:
- Each row: Company name+reg (from `companies` join) | Plan badge | Frequency | Next check | Active toggle | Cancel link
- "Add company to monitor" button → opens search modal (simple modal with SearchWidget or text input → navigate to company page)

**Change Events** — fetch `change_events` via subscriptions join, group by company:
- Timeline: severity color (🔴 Critical / 🟠 High / 🟡 Medium / 🟢 Info)
- Field changed | Old → New | Date detected
- Empty state if no events

---

### 5. AccountProfilePage update (`src/pages/account/AccountProfilePage.tsx`)

Add two new sections below existing form:

**Security section** (new card):
- "Change Password" button → calls `supabase.auth.resetPasswordForEmail(email)`, shows toast "Reset email sent"
- "Delete Account" (danger zone, red text) → confirmation dialog before calling delete (no Supabase delete user from client — show "Contact support to delete your account")

**Incomplete profile warning** (amber banner at top of page):
- Show if `!firstName || !phone` after load
- "Complete your profile to speed up checkout" with link to save form

---

### 6. App.tsx update

Add one redirect:
- `/dashboard` → `/account`

No other changes needed (all routes already exist).

---

### Files to create/edit
```
EDIT  src/components/layout/AccountLayout.tsx   (add nav items + sign out)
EDIT  src/pages/account/AccountDashboard.tsx    (full replacement)
EDIT  src/pages/account/AccountDownloadsPage.tsx (full replacement)
EDIT  src/pages/account/AccountMonitoringPage.tsx (full replacement)
EDIT  src/pages/account/AccountProfilePage.tsx  (add security section + warning banner)
EDIT  src/App.tsx                               (add /dashboard redirect)
```

No database migrations needed — all tables exist with correct RLS.
