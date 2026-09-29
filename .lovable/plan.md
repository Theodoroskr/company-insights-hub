# Faster report collection

## What happens today
A background check runs every 15 minutes (96 times a day), even when no reports are waiting. A report the supplier finishes in 1 minute can take up to 15 minutes to appear.

## Does "continuous" cost more?
Yes, if done by brute force. Checking every minute means 1,440 runs a day. That keeps the backend awake all day and raises Cloud costs even when nothing is waiting. The supplier also doesn't send us a "ready" message, so we can't be told the instant it happens.

## Recommended approach: check fast only while a report is waiting
- **Right after an order is sent to the supplier**, the site checks that order again at about 30 seconds, 1, 2, 5 and 10 minutes. Most reports (ready within a minute) show up within about a minute.
- **When there's nothing waiting, nothing runs.** The quick checks stop as soon as the report arrives or after 10 minutes.
- **The 15-minute check stays as a backup** for slow reports (supplier "In Progress" for hours). Maximum delay for those is still 15 minutes.
- **"Check now" button** on the customer's Orders page and in the admin Orders page, for reports still "Processing".
- Bell notification fires the moment the report lands (already built).

Extra cost: only a handful of short checks per order, so it's roughly the same as today.

## Technical details
- `poll-order-status` accepts an optional `{ order_item_id, attempt }` body to check a single item; the scheduled run (no body) keeps scanning everything.
- `create-api4all-order` (and fulfill paths that set `api4all_order_id`) kick the first targeted check. Each check reschedules the next hop with a delay only if the item is still `submitted`/`processing`; attempts capped at 5 (depth budget carried in the body).
- Single-flight: skip an item if `fulfillment_tasks.last_attempt_at` is under 20s old, so the cron, the chain and the button can't double-process. Report storage is already idempotent (checks `generated_reports` first).
- "Check now" calls the function for that item; staff or order owner only, rate-limited by the same 20s guard.
- Keep cron at `*/15 * * * *`.
