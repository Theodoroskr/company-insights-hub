---
name: Companies House UK integration
description: UK company data via official Companies House API, proxied through edge function with 24h cache, surfaced under Infocredit World as Premium tier
type: feature
---

UK is integrated as a Premium coverage country in the Infocredit World tenant (not a separate tenant).

## Backend
- Edge function: `supabase/functions/companies-house-uk/index.ts`
- Secret: `COMPANIES_HOUSE_UK_API_KEY` (HTTP Basic, key as username, empty password)
- Base URL: `https://api.company-information.service.gov.uk`
- Cache: profile responses cached in `companies` table with `country_code='GB'`, `icg_code='GB:{companyNumber}'`, 24h TTL (matches API4ALL pattern)

## Actions supported
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

## Not yet wired
- Global SearchWidget does not yet route GB queries to this client (still TODO)
- Company profile page does not yet render filings/charges/PSC sections for GB companies
- `/country/gb` dashboard already renders from the countries table data
