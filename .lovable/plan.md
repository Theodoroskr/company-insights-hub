# Make global products (EDD report) visible on every site

## Problem
The Enhanced Due Diligence (EDD) Report is correctly stored as a global product, but every product list on the site only loads products that belong to the current site. Result: the EDD report appears on Infocredit World but not on the Cyprus, Greece, Malta, Romania or Dubai sites.

## Fix
Update the six places that load the product catalogue so they include both the current site's products and any product marked as global:

- Company profile page (report list on each company)
- Order/report modal (the buying pop-up)
- Home page product section
- Pricing page
- Top menu product list
- Product landing pages (so the EDD report's own page opens on every site)

Country rules still apply after this change: UK-only products stay UK-only, Cyprus-only stays Cyprus-only — only products explicitly marked "global" (today: the EDD report) become visible everywhere.

## Technical details
- In each of the six queries, replace `.eq('tenant_id', tenant.id)` with `.or(\`tenant_id.eq.${tenant.id},country_scope.eq.global\`)`.
- Files: `src/pages/CompanyProfilePage.tsx`, `src/components/orders/OrderReportModal.tsx`, `src/pages/HomePage.tsx`, `src/pages/PricingPage.tsx`, `src/components/layout/Navbar.tsx`, `src/pages/ProductLandingPage.tsx`.
- No database changes needed — the EDD product row is already global and active.
- Verify: typecheck, build, then open a Cyprus and a UK company in the preview and confirm the EDD report is offered.
