# Visitor-facing country/tenant navigation

## Goal
Give visitors a way to move between the six sites (Cyprus, Greece, Malta, Romania, Dubai, Infocredit World) from any page — replacing the hidden dev-only switcher with a real navigation element.

## Changes

### 1. Shared tenant list — `src/lib/tenantConfig.ts`
- Add a `TENANT_SITES` list: slug, display name, flag (from existing `TENANT_LOCALE`), and production domain.
- Domains come from the `tenants` table `domain` column at runtime (already used for hostname resolution); the list is enriched once the tenant record loads.

### 2. Navbar "Countries" dropdown — `src/components/layout/Navbar.tsx`
- New globe/flag menu item in the desktop bar (and a section in the mobile menu) listing all six sites with flag + name.
- Current site marked with a check; clicking another site navigates to it.

### 3. Footer country links — `src/components/layout/Footer.tsx`
- Add a "Our countries" row/column in the navy footer with flag + name links to all six sites.

### 4. Navigation behaviour
- **Production** (real domains): link to `https://<tenant-domain>` — a full browser navigation to the other site.
- **Preview/localhost** (`.lovable.app`, localhost): keep the existing `?tenant=<slug>` + localStorage mechanism so QA switching keeps working.
- Detection reuses the same `isPreviewHost` logic already in `TenantSwitcher`.

### 5. Dev switcher
- Keep the bottom-right `TenantSwitcher` as-is (dev/QA tool, preview hosts only).

## Technical details
- Tenant domains: fetch all tenants (`slug`, `name`, `domain`) once via the existing Supabase client in a small hook (`useTenantSites`), cached for the session.
- No hardcoded colors; flags via `TENANT_LOCALE`, styles via existing CSS variables.

## Verification
- Typecheck + build green.
- Preview: dropdown and footer links switch tenant via `?tenant=`; flag and name update.
- Confirm the current site is highlighted and the menu works on mobile.
