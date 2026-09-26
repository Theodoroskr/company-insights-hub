# Time-limited report access with "already bought" note

## What was happening
There is no bug. The page unlocked because this account bought the UK Company Report for Creditsafe Information Services on 17 Apr 2026 (order ICG-2026-5448). Right now a purchase unlocks the company page forever. The change below adds a time limit.

## New behaviour
1. **Access window.** A purchase unlocks the company page for as long as that report's download is valid, which is 30 days from when it was generated. That matches the "Expires" date already shown on the order.
2. **While access lasts:** a slim note appears at the top of the company page: "You bought this report on 17 Apr 2026 · Order ICG-2026-5448 · Access until 17 May 2026". It has a "View order" link.
3. **After it expires:**
   - The company page locks again, with the blurred sections and order buttons, as if nothing had been bought.
   - The note changes to: "Your report from 17 Apr 2026 has expired. Company data may have changed. Order an updated report." The button opens the normal order window with the same report selected, at the normal price.
   - The order stays in My Account → Orders as a permanent record. When it has expired, the download button there is replaced with "Order updated report".
4. **Compliance & AML results** follow the same rule. After the access window ends they are hidden on the company page and the screening can be bought again. The saved results stay on file for the record.

## Technical details
- `CompanyProfilePage.tsx` `checkUnlock`: select `created_at`, `orders(order_ref)` and `generated_reports(download_expires_at)`. An item counts as active only if at least one of its reports has `download_expires_at > now()`. If there is no report row yet, fall back to `order_items.created_at + 30 days`. Unlock using active items only. Keep the most recent expired item so the "expired" note can use it.
- A new small `PurchaseStatusBanner` component shows the active or expired state, using theme variables only.
- `AccountOrderDetailPage.tsx`: when the report has expired, swap Download / View online for "Order updated report", which links to the company page.
- The 30-day window is one constant, `REPORT_ACCESS_DAYS`, in `src/lib/delivery.ts`. It is used only when `download_expires_at` is missing.
- The database structure does not change.
