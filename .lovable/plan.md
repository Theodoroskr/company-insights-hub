# Fix Certificate of Strike Off VAT rule

The Pricing Health screen flags one product: **Certificate of Strike Off** charges VAT on the whole €80, while every other Cyprus certificate charges VAT only on the €40 service fee. The official registry fee is not VAT-rated.

## Change

One database update to the `certificate_strike_off` product:

- `vat_on_full_price` → off
- `vat_on_fee_only` → on

## Effect

- New Strike Off orders charge VAT on the €40 service fee only: €80 + €7.60 VAT = **€87.60** total (was €80 + €15.20 = €95.20).
- The price shown on the certificates page, in the cart and at checkout updates automatically — everything reads from the same pricing source.
- Past orders keep the amounts saved when they were placed; nothing historical changes.
- The Pricing Health screen then shows zero VAT findings, and the automated pricing tests still pass.

## Technical details

- Single `UPDATE products SET vat_on_full_price = false, vat_on_fee_only = true WHERE slug = 'certificate_strike_off'` via a migration.
- No code changes needed; `priceProduct` already handles the fee-only rule.
