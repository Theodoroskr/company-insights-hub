# Fix: profile country says "saved" but isn't stored

## Root cause (confirmed)

On the Profile page (`src/pages/account/AccountProfilePage.tsx`):

- The **Save** button only writes `full_name` and `phone` to the database — the selected **country** (and VAT number) are never sent, so the "Profile saved" message appears but the country is lost on reload.
- The `profiles` table has no column to hold a country (only email, name, phone, role), so there is nowhere to save it today.
- The **Company details** section has the same problem: its save button shows a success message without saving anything at all.

## What we'll build

1. **Add storage for the missing fields** — new `country` and `vat_no` columns on the user's profile, plus a `company_details` field (company name, registration number, VAT, country) so the company section can really persist.
2. **Profile page saves and loads everything** — Save writes name, phone, country and VAT; on page load the saved country/VAT are pre-selected. Company details save for real and reload pre-filled.
3. **Honest feedback** — the success message only appears after the database confirms the save; errors show a clear message.

## Technical details

- Migration: `ALTER TABLE public.profiles ADD COLUMN country text, ADD COLUMN vat_no text, ADD COLUMN company_details jsonb` (no new table, existing RLS policies on `profiles` already cover users updating their own row).
- `AccountProfilePage.tsx`: include the new fields in the `select` and `update` calls; initialize state from the loaded profile.
- No changes to checkout — the checkout form keeps its own billing address as today.

## Out of scope

- Using the profile country to pre-fill checkout billing country (can be a follow-up if wanted).
