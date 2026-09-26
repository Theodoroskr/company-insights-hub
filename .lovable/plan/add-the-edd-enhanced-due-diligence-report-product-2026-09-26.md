# Add the EDD (Enhanced Due Diligence) Report product

## Why
No product named "EDD" or "Enhanced Due Diligence" exists in the catalogue or anywhere on the site — that is why it does not appear in Products. The closest items are the Due Diligence Report (€750, Cyprus only) and the Enhanced UK KYB Report (€59, UK only).

## What we will build

### 1. Create the product in the catalogue (database)
- New product: **Enhanced Due Diligence (EDD) Report**
- Slug: `edd-report`, type: `report`
- Price: **€750**, no separate service fee
- Scope: **global** — shows on companies from every country, on all six sites
- Delivery: **5 business days** (120 hours), manual fulfilment (not instant)
- Active and visible in the admin Products screen and on company pages

### 2. Give it a product page
- Add an `edd-report` entry to `src/data/productContent.ts` so it gets its own landing page (description, what's included, FAQs) like the other reports, and appears in the /report tabs.
- Content will be drafted by us — you can review and adjust the wording after.

### 3. Make it appear where buyers look
- Company profile pages: it will show automatically for companies in every country (the existing country filter already handles global products).
- The "Which report?" AI recommender will be able to suggest it, since it only recommends active products.

### 4. Verify
- Typecheck and build pass.
- Check the product appears in admin Products and on a company page in the preview.

## Technical details
- One `INSERT` into `public.products` (tenant: icw/global catalogue, `country_scope='global'`, `allowed_countries=NULL`, `base_price=750`, `service_fee=0`, `is_instant=false`, `delivery_sla_hours=120`, `is_active=true`).
- Pricing flows through `src/lib/pricing.ts` automatically, so listings, cart, checkout and confirmations stay consistent.
- No changes to existing products, prices, or past orders.
