# Map purchased Cyprus/global reports into the whole company page

The LAIKO report data is stored correctly, but only the bottom panel reads it. The rest of the page still shows empty or locked placeholders. Fix the mapping so every section uses the purchased report.

## What changes on the page (when a report is owned)

1. **Top summary strip**
   - Company Age: from Registration Date (2012-10-09 -> "13 years").
   - Directors: count of active officers (6).
   - Sector: first activity description (e.g. "Wholesale of beverages").
   - Last update: supplier's DateUpdated instead of "-1m ago".
2. **Director Relationship Graph**: build from officers + shareholders (6 directors, secretary role for Michalis Parides, 2 corporate shareholders as PSC-type nodes), full names unmasked.
3. **Change & Activity Timeline**: add real dated events — registration, officer appointments, charges/mortgages registered, last annual report, last return.
4. **Mortgages & charges**: fix the empty "Charge 1" — list each charge and mortgage separately with type, beneficiary (Bank of Cyprus), amount + currency, date registered, mortgage number.
5. **Company details**: add Registration date, Last annual report date, Last return date; share capital also shows the share class breakdown.
6. **Remove locked teasers when owned**: hide the "Registered Address —" and masked "Directors & Secretaries" blocks (the report already shows the real data). The Compliance & AML upsell stays unless screening was bought.
7. Officers: merge duplicate roles (Director / Secretary) — kept as today.

## Technical details

- New `src/lib/api4all/normalize.ts`: `normalizeApi4AllReport(bundle)` -> `{ registrationDate, lastUpdated, officers[{name, roles[], appointed, nationality, address}], shareholders[{name, isCompany, pct, shares, address}], activities[], charges[{kind:'charge'|'mortgage', type, beneficiary, amount, currency, prepared, registered, number}], capital, dates[] }`. Handles `MortgagesCharges[0].Charges` / `.Mortgages` nesting and `Active` flags.
- `Api4AllReportPanel.tsx` renders from the normalized object.
- `CompanyProfilePage.tsx`: when an API4ALL bundle is owned, feed normalized values into `IntelligenceKpiStrip`, `DirectorRelationshipGraph` (existing officer shape), `CompanyChangeTimeline`, and skip the locked Registered Address / Directors teaser sections.
- Frontend only; no database changes.

## Verification
- Typecheck; Playwright (signed-in session) on `/company/laiko-cosmos-trading-limited-c313185`: KPI strip filled, graph shows 8 nodes, 4 charge/mortgage rows, no masked teasers.
