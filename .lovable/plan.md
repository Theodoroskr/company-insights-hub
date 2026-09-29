# AML Screening: cover all directors, not just the company

## What's happening today

The AML & Compliance screening add-on (+€45) is designed to screen the **company plus every director, shareholder and beneficial owner named in the report** — and that works for UK reports (e.g. 5 entities screened).

But for the Cyprus order (LAIKO - COSMOS TRADING LIMITED, ICG-2026-9861), only **1 entity — the company itself — was screened**. The report contains 6 directors, 2 shareholders and beneficial owners, but the screening code reads only the report's top-level structure (the UK shape) and never looks inside the Cyprus/global report shape where those people live. So the add-on effectively screened the subject only.

## Fix

1. **Teach the screening code the Cyprus/global report shape.** When the report is in the nested `Company[...]` format, extract people from:
   - `Administrators` (directors/officers) — full name, skipping resigned/inactive entries
   - `Shareholders` — full name
   - `UltimateBeneficialOwner` — full name
   Company name comes from the same structure. Same activity/inactive rules as the UK path.

2. **Re-run the screening** for the LAIKO - COSMOS TRADING LIMITED order item so the directors and shareholders are actually checked and the result in the account updates (it will replace the current company-only result).

3. **Verify** by running the screening for that order and confirming more than one entity is screened and results/hits are stored correctly.

## Notes

- The standalone €30 "Company only" AML screening product keeps screening the company only — that's by design.
- UK report screenings are unaffected.
