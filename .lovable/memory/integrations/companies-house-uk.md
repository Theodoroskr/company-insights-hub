---
name: Companies House UK integration
description: UK company data via official Companies House API, proxied through edge function with 24h cache, surfaced under Infocredit World as Premium tier with an instant-fulfilment £15 UK Company Report product
type: feature
---

UK is integrated as a Premium coverage country in the Infocredit World tenant (not a separate tenant).

## Backend
- Edge function: `supabase/functions/companies-house-uk/index.ts` (CH proxy w/ 24h cache)
- Edge function: `supabase/functions/fulfill-uk-report/index.ts` (instant fulfilment)
- Secret: `COMPANIES_HOUSE_UK_API_KEY` (HTTP Basic, key as username, empty password)
- Base URL: `https://api.company-information.service.gov.uk`
- Cache: profile responses cached in `companies` table with `country_code='GB'`, `icg_code='GB:{companyNumber}'`, 24h TTL

## Actions supported (companies-house-uk)
- `search` — by name/number, logs to `search_logs`
- `profile` — full profile + officers, cached
- `officers` — live
- `filing-history` — live
- `charges` — live
- `psc` — Persons with Significant Control, live

## Frontend client
`src/lib/companiesHouseUK/client.ts` — typed wrapper around `supabase.functions.invoke('companies-house-uk', { action, ...})`

## Country record
`countries.code='GB'`, `iso2='gb'`, `coverage_tier='premium'`, `risk_band='low'`, `is_featured=true`, `api4all_supported=false`.

## Search routing
`SearchWidget` on the global Infocredit World tenant queries `search-companies` once with the selected country, and additionally fires a parallel `country=gb` query when no specific country is selected — UK results merge in alongside API4ALL results, deduped by id, with a country flag chip on every row.

## Profile UI
`<UKCompanySections>` renders Filings, Charges, and PSC for any `country_code='GB'` company on `CompanyProfilePage`, gated via `<GatedContent>` pointing to the structure-report order modal.

## UK Company Report product
- Slug: `uk-company-report`, type `kyb`, tenant: `icw` (Infocredit World only)
- Price: £15, instant (`is_instant=true`, no `api4all_product_code`)
- Fulfilment: `stripe-webhook` detects `payment_intent.succeeded`, finds order_items whose product slug is `uk-company-report`, and POSTs each to `fulfill-uk-report`. That function pulls profile + officers + filings + charges + PSC from Companies House, stores the bundle in `generated_reports.api4all_raw_json`, and marks the item `fulfilled` with `verified_by='system:companies-house-uk'`.
- The existing `create-api4all-order` call still runs for any other items in the same cart — it already filters out items without an `api4all_product_code`.
