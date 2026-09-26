# Fix the three flow issues from the audit

## 1. Certificate-only orders can't check out (high priority)
- Checkout details and payment pages both stop with "Your cart is empty" when the cart holds only certificates.
- Fix: treat the cart as empty only when there are no reports AND no certificate orders.
- Payment page: include certificate orders in the totals shown and in the order that gets created (one order line per certificate, with apostille, urgent and courier add-ons), priced through the shared pricing module.
- Confirmation page lists the certificates too.

## 2. Certificates shown on every country site
- Top menu shows "Certificates · Cyprus" on all six sites, and the certificates page always says "Order Official Cyprus Certificates".
- Fix: show the certificates menu column (desktop and mobile) only on sites where certificates are switched on (today: Cyprus). On other sites, opening the certificates page shows a short "Certificates are not yet available in this country" message with a link back to reports.

## 3. Duplicate reports on Cyprus company pages
- Confirm on a Cyprus company page and the Cyprus pricing page which report cards show.
- Make sure Cyprus companies show only the Cyprus Company Profile and Cyprus Credit Report (plus EDD and AML screening), UK companies only UK reports, and every other country the Global reports — on company pages, the order pop-up and the pricing page.

## Verification
- Put a certificate-only order through checkout on Cyprus in the preview.
- Switch to Greece and Dubai: no certificates menu; certificates page shows the not-available message.
- Open a Cyprus company: no Global Structure/Credit duplicates.

## Technical details
- `CheckoutDetailsPage.tsx` ~188 and `CheckoutPaymentPage.tsx` ~66: `items.length === 0 && certificateOrders.length === 0`; payment page uses `useCart().certificateOrders`, `priceCertificateOrder`, and inserts `order_items` for certificate products.
- `Navbar.tsx` ~354 and ~774 gated by `certificates_enabled` via `src/lib/certificateAvailability.ts`; `CertificatesPage.tsx` gated likewise.
- Product visibility via `src/lib/tenantConfig.ts` filters (line ~271 already hides bare global duplicates for Cyprus tenant); apply the same rule by company country on company page / modal / pricing queries.
