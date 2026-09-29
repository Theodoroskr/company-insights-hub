# Real AML screening flow (€30 company / €45 company + directors)

## What the customer gets
1. Buys screening (card, prepaid credit or monthly invoice).
2. Check runs automatically within seconds; order shows "Screening in progress".
3. When done: bell notification "AML screening complete — Clear / Review / Hit" linking to the results.
4. Results page in My Account: overall status, entities screened, sanctions / PEP / enforcement counts, and each match (name, role, list, strength). Same results also appear in the company page Compliance tab.
5. If the check fails: order marked failed, bell notification "Screening could not be completed — our team has been alerted", staff can re-run from admin.

## Changes
- **Start screening for every payment method** — today it only starts after card payment. Credit and invoice checkouts will also start it, plus the add-on screening on reports that don't go through the report supplier.
- **Notify on completion** — the screening service writes a bell notification (kinds `screening_ready` / `screening_failed`), deduped per ordered item; attempts the email too (sends once an email domain is set up).
- **Account results view** — the ordered-report view page shows a Screening results section for screening items (and for reports with the add-on); Orders page shows status "Clear / Review / Hit" instead of generic "Completed".
- **Admin** — "Re-run screening" button on the order detail for failed/pending screening items.
- **Safety net** — the 15-minute background check also picks up paid screening items with no result older than 5 minutes and runs them.

## Technical details
- `complyadvantage-screen`: after insert, call a `notifyCustomer` helper (same shape as poll-order-status); on error set `screening_results.overall_status='error'`, `order_items.fulfillment_status='failed'`, notify failed. Standalone items set `processing` at start.
- Allow `notifications.kind` values `screening_ready`, `screening_failed` (migration if a check constraint exists); NotificationBell picks an icon per kind.
- `CheckoutPaymentPage.tsx`: after wallet/invoice RPC success, invoke `complyadvantage-screen` for standalone screening items (auth token passes the ownership check already in the function).
- `poll-order-status`: sweep for paid standalone screening items with no non-error result.
- `AccountReportViewPage.tsx` / `AccountOrdersPage.tsx`: read `screening_results` + `screening_entity_hits` (existing RLS) and render.
- `AdminOrderDetailPage.tsx`: re-run button invoking the function (service checks staff via has_permission 'fulfillment').
- Deploy complyadvantage-screen, poll-order-status.

## Not included
- Ongoing monitoring / re-screening schedules.
- Email delivery until a sending domain is configured.
