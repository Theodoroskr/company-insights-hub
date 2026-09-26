# My Account landing page

Build a real landing page at `/account` (currently a "Coming soon" placeholder) and unify it for every tenant. One codebase serves all instances — Cyprus, Greece, Malta, Romania, Dubai, Infocredit World — so this page is automatically the same everywhere, with each instance's branding applied through the existing CSS variables.

## What the page shows

1. **Greeting header** — "Welcome back, {first name}" with the user's email, styled like the rest of the account area.
2. **Summary cards** (row of 4):
   - Total orders
   - In progress (orders with status `processing` or `pending`)
   - Completed reports
   - Saved companies count
   Each card links to its section.
3. **Recent orders** — the 3 most recent orders with order reference, date, status chip and total, reusing the same status chip styling and status vocabulary as the Reports page. Each row links to its order detail page; "View all reports" links to `/account/orders`. Empty state points new users to search a company.
4. **Saved companies preview** — up to 3 saved companies with name and country; "View all" links to `/account/saved`. Empty state invites bookmarking from search.
5. **Quick links** — cards for Profile, Downloads, Invoices, Saved Companies.

## Sidebar change

Add "Overview" as the first item in the account sidebar (`/account`), so the landing page is reachable and highlighted when active.

## Data sources (existing tables, read-only)

- `orders` + `order_items` (filtered by the signed-in user's id) — same query pattern as `AccountOrdersPage`.
- `saved_companies` with joined `companies` — same pattern as `AccountSavedPage`.
- Profile name/email from `profiles`, as `AccountLayout` already does.

All queries are scoped to `auth.uid()` and rely on the RLS already in place; no schema changes.

## Files

- `src/pages/account/AccountDashboard.tsx` — replace the placeholder with the real page (uses `AccountLayout`).
- `src/components/layout/AccountLayout.tsx` — add the "Overview" nav item.

## Verification

- `npx tsgo --noEmit -p tsconfig.app.json` clean; build OK.
- Playwright against the preview: sign in, open `/account`, confirm greeting, counts, recent orders and saved companies render, and cards link to the right sections.
