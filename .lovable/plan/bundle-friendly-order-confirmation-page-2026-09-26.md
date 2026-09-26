# Bundle-friendly order confirmation page

## Problem (confirmed)

When an order contains a credit bundle, the confirmation page (`src/pages/CheckoutSuccessPage.tsx`) still shows report-delivery copy: "Your report will be delivered to…", "Download link valid for 30 days", "Track my order" — none of which applies to account credit. The payment page already includes bundle names in `productNames` but passes no flag saying the order is credit-only.

## What we'll build

1. **Pass bundle details to the confirmation page** — `CheckoutPaymentPage.tsx` adds a `bundles` array (name, amount paid, bonus, total credit) to the `checkout_success` payload.
2. **Credit-only orders get their own confirmation** — when the order contains only bundles (no reports/certificates), the page shows:
   - Heading: "Credit Added!"
   - The bundle name and total credit added (e.g. "€550.00 added to your account — €500 + €50 bonus")
   - "Your credit is ready to use on every country site · valid for one year"
   - Buttons: "View my credit →" (Account → Billing) and "Order a report"
   - No delivery/download/analyst lines.
3. **Mixed orders (bundle + reports)** keep the existing report copy, with one extra line noting the credit that was added.

## Technical details

- Files: `src/pages/CheckoutPaymentPage.tsx` (payload), `src/pages/CheckoutSuccessPage.tsx` (rendering branch).
- No database or payment-flow changes; credit is already added by the existing `purchase_credit_bundle` call after payment.
