# Remember billing address at checkout for signed-in customers

## Problem
When signed in, the checkout Details step only pre-fills name, email and phone. Country, street, city, state, postcode and business details (company name, reg no, VAT) are blank every time, and nothing typed is saved for next time.

## What changes
- Signed-in customers get their last-used address and business details pre-filled at checkout.
- On "Continue to payment", the entered address and business details are saved to their account (so they also show on the Profile page country/VAT/company fields).
- A small "Save these details to my account" checkbox (ticked by default) lets them opt out.
- Guests are unaffected.

## Technical details
- `CheckoutDetailsPage.tsx`: extend the profile query to `full_name, email, phone, country, vat_no, company_details`; pre-fill `country`, `vatNumber`, `companyName`, `companyReg`, `isBusiness` (true if company name exists), and address from `company_details.billing_address` `{street, city, state, postcode}`. Only fill empty fields.
- In `handleContinue`, when signed in and checkbox ticked, update `profiles` (own row; existing RLS allows self-update) with `phone`, `country`, `vat_no`, and merged `company_details` (keep existing keys `name/reg/vat/country`, add `billing_address`). Non-blocking — errors don't stop checkout.
- No database changes needed (`company_details` is jsonb).
