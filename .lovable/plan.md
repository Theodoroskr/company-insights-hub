# UK Filing History — manageable timeline for large registries

## Problem
Companies like Barclays have 1,398 filings. Today the page shows only the latest 10 as a flat, repetitive list ("Mortgage create with deed…" repeated), with a total count and one link to the official register. There is no way to browse older filings or filter by type.

## What we will build

### 1. Category filter chips
Above the list, small filter chips based on the filing categories Companies House returns:
- All
- Mortgages & charges
- Accounts
- Officers
- Resolutions
- Other

Clicking a chip filters the list instantly. Counts shown per chip where known.

### 2. Paged timeline instead of a fixed top-10
- Show the latest 25 filings, grouped under year headings (2026, 2025, …) so long histories read as a timeline.
- A "Load more" button fetches the next page from Companies House (the API supports paging), instead of dumping all 1,398 rows at once.
- The header keeps the total count ("UK Filing History · 1,398 records").

### 3. Links behaviour (answering your question: links or just timeline?)
- **Both, in the right places.** The timeline stays the primary view on our page.
- Each filing row links to its original PDF on the official Companies House viewer — but only after the visitor has bought the UK Company Report (current rule, unchanged). Before purchase, rows stay locked behind the report prompt.
- The "View on official register" link at the bottom stays, so anyone can always jump to the full 1,398-record register on Companies House.

## Technical details
- File: `src/components/company/UKCompanySections.tsx` (filing section only; charges and PSC sections untouched).
- `companiesHouseUK.filingHistory(companyNumber, …)` gains page/category parameters; the edge function already proxies Companies House, which supports `items_per_page`, `start_index` and `category` filters — so filtering happens server-side, not by downloading everything.
- Year grouping derived from each filing's date; no new dependencies.
- Gating (`GatedContent`) and the existing unlock behaviour stay exactly as they are.

## Verification
- Open the Barclays page: header shows 1,398 records, chips filter, Load more pages through older years, PDF links work when unlocked, official-register link intact.
- Type check clean.
