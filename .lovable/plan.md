# Remove leftover "Subscribe to monitoring" prompt

## Goal
The monitoring upsell was removed earlier, but one prompt remains on every company page, on all tenants: the "Want real-time alerts when registry data changes? Subscribe to monitoring →" strip inside the Change & Activity Timeline.

## Changes

### `src/components/company/CompanyChangeTimeline.tsx`
- Delete the promo strip at the bottom of the timeline (the box with "Want real-time alerts when registry data changes?" and the "Subscribe to monitoring →" button).
- Change the subtitle under the "Change & Activity Timeline" heading from "Synthetic timeline · subscribe to monitoring for live change detection" to a neutral line: "Baseline timeline built from registry data".

## Out of scope
- The timeline itself stays (incorporation, status, officers, last sync entries).
- The My Account "Monitoring" section and existing customer subscriptions stay untouched, as agreed earlier.

## Verification
- Typecheck clean, build OK.
- Open a company page in the preview and confirm the monitoring strip and subtitle mention are gone.
