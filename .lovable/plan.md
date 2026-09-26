# UK section: landing page + menu

## What visitors will see
- A new **UK Companies** page at `/uk`:
  - UK-branded intro with a company search box limited to UK companies.
  - The UK reports that are on sale: UK Company Report (€30) and Enhanced UK KYB Report (€59). Each shows its price and links to buy.
  - A short "why use this" block (official Companies House data, instant delivery) and a few FAQs.
  - No certificates for now. A UK certificates block appears on its own once you switch UK certificates on in admin.
- The **top menu** (desktop and mobile) gets a "UK Companies" link. The Products menu lists Cyprus certificates under a "Cyprus" heading, so it's clear they're Cyprus-only.
- UK company profile pages get a link back to the UK page.

## Technical details
- New `src/pages/UkLandingPage.tsx`, route `/uk` in `App.tsx`. Page title and description are set for search engines.
- Products are loaded where `country_scope='uk-only'` and `is_active`, filtered with `isProductVisibleForTenant(p, 'GB')`. Prices come from `priceProduct` in `src/lib/pricing.ts`, which keeps the single-price-source rule.
- The certificates block only renders when `countries.certificates_enabled` is true for GB and at least one active `certificate_uk_*` product exists.
- The search box sends visitors to `/company/search?country=gb&q=...`.
- In `Navbar.tsx`, the "Cyprus" heading shows next to the existing certificate links, and a "UK Companies" link goes in the desktop bar and in the mobile menu.
- Styling uses only the existing CSS variables, with no hardcoded colours.
- Checks: typecheck, tests, and a Playwright screenshot of `/uk` and the menu.
