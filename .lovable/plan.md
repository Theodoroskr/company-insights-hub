# Automated pricing consistency checks

Catch price and service-fee mismatches before customers see them — both as a back-office screen you can open any time, and as tests that fail the build when a rule is broken.

## What you get

### 1. "Pricing health" screen in the back office
A new admin page listing every problem found, grouped by severity:

- **Wrong service fee** — a certificate product missing the €40 service & delivery fee, or a report/pack that wrongly carries one.
- **Hardcoded price in a page** — a price typed into page text (product landing pages, pricing page, certificates page, country dashboards) that disagrees with the stored product price.
- **Cart/checkout disagreement** — for each active product, the price is recomputed the way the product page, the cart, and checkout each compute it; any difference is flagged.
- **Order maths wrong at the time** — placed orders whose saved subtotal, VAT and total don't add up against the prices saved on that order. Differences caused purely by a later price change are not flagged.

Each row shows the product or order, what was expected, what was found, and a link to fix it (product editor or order detail).

### 2. Build-time tests
The same rule checks run in the test suite over a snapshot of the product catalogue and over the page-text price list, so a future edit that reintroduces a mismatch fails the build instead of reaching the site.

## Notes

- Checks are read-only. Nothing is auto-corrected; you decide each fix.
- The hardcoded-price check works from a maintained registry of prices shown in page text. Any new hardcoded price must be registered or the check can't see it — the review screen shows when a registered entry no longer exists in the page, so the registry stays honest.

## Technical details

- `src/lib/pricingAudit.ts` — pure rule engine. Takes products (+ pricing config, optional orders) and returns typed findings: `{ severity, kind, subject, expected, actual, hint }`. Rules:
  - `certificateFee`: `type === 'certificate'` requires `service_fee === pricing.certificateServiceFee` and `base_price === pricing.certificateFee` (except priced certificates like memorandum, where only the fee is asserted); non-certificates require `service_fee` of 0/null.
  - `vatFlags`: exactly one of `vat_on_full_price` / `vat_on_fee_only` set; certificates use fee-only.
  - `surfaceParity`: runs `priceProduct` for product-page, cart (`calcPrice`) and checkout paths for each active product × speed and asserts identical `net`/`vat`/`total`.
  - `hardcodedPrices`: compares entries in a new `src/lib/pricingAudit.surfaces.ts` registry (`{ file, label, slug, shownPrice }`) against `priceProduct` on the matching product.
  - `orderIntegrity`: recomputes `subtotal + vat_amount === total` and line sums from `order_items.unit_price`/`vat_amount`/`screening_price_eur`; uses only values stored on the order, so historical price changes are never flagged.
- `src/pages/admin/AdminPricingHealthPage.tsx` — loads products (and recent orders), calls the engine, renders grouped findings with counts; route `/admin/pricing-health` inside `AdminRoute`, plus a nav entry alongside Source Health.
- `src/lib/pricingAudit.test.ts` — unit tests per rule (good and bad fixtures) plus a catalogue-snapshot test and a registry test that assert zero findings for the current data, so regressions fail `vitest run`.
- No schema or pricing-behaviour changes; `src/lib/pricing.ts` stays the single source of truth.
