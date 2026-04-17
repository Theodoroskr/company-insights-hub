---
name: Multi-tenancy
description: Per-tenant content split — VAT (CY 19%, others 0%), hero copy, typing words, product catalogue filtering via src/lib/tenantConfig.ts
type: feature
---
- All tenant differences live in `src/lib/tenantConfig.ts`:
  - `getVatRate(slug)` — 19% only for `cy`, 0% elsewhere (Cyprus entity invoices all)
  - `getTenantHero(slug, brandName)` — h1, subtitle, typing words, meta-title suffix per tenant
  - `localizeContent(content, slug)` — string-replaces "Cyprus/Cypriot" → country name in shared productContent
  - `filterTabsForTenant(tabs, slug)` — hides Cyprus-only certs on non-CY; surfaces Global products on `icw`
- VAT is read in `CartContext` via `useTenant()`; cart re-VATs items when tenant changes
- `PriceDisplay` derives VAT from tenant by default; pass `vatRate` to override
- ICW homepage gets badge + global hero + WorldCoverageMap; CY/country tenants get `${countryName}` hero
- Cyprus-only certificate slugs: certificate_of_director, _shareholder, _incorporation, _registered_address, _good_standing, _memorandum, _bankruptcy, _change_name, _share_capital, _historic
- Global-only slugs: global-structure-report, global-kyb-report
