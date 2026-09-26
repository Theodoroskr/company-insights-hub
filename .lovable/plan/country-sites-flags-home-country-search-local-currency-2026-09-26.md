# Country sites: flags, home-country search, local currency

Applies to the five country sites (Cyprus, Greece, Malta, Romania, Dubai). Infocredit World stays global (globe icon, all-country search, EUR).

## What visitors will see
1. **Flag next to the site name** in the top menu and on the home page headline (e.g. 🇨🇾 Companies House Cyprus).
2. **Search defaults to the home country** — the country box shows the flag + country name, and every search (box, dropdown suggestions, "see all results", results page) goes to that country's registry automatically.
3. **Prices in the local currency symbol by default**:
   - Cyprus, Greece, Malta: € (EUR)
   - Romania: lei (RON) — new currency added
   - Dubai: AED
   - A visitor's own currency choice from the currency picker still wins once they pick one.

## Technical details
- `src/lib/tenantConfig.ts`: add per-tenant `flag` and `defaultCurrency` map keyed by slug (cy/gr/mt/ro/ae → EUR/EUR/EUR/RON/AED; icw → 🌍/EUR).
- `CurrencyContext.tsx`: add `RON` (symbol "lei", suffix style, fallback rate ~4.97); initial currency = persisted user choice (per-tenant storage key) else tenant default. Prices stay stored in EUR and still flow through `src/lib/pricing.ts`; only display conversion changes.
- `Navbar.tsx` + `HomePage.tsx` hero: render the tenant flag beside the brand.
- `SearchWidget.tsx` already locks the country on country sites; ensure `SearchResultsPage.tsx` also defaults `country` to the tenant's country when the URL has none (instead of multi-country), and the "see all results" link always includes it.
- Checkout/Stripe charge remains in EUR; show a small "charged in EUR" note when display currency differs.
