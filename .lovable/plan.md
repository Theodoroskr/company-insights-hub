# Let existing customers sign in at checkout

## Problem
On the checkout details step, the "I have an account" tab only changes colour — it shows the same guest form and never lets the customer sign in.

## What changes
- **Not signed in + "I have an account"**: show a short sign-in panel instead of the guest form:
  - Email + password fields and a "Sign in" button (signs in right there, no page change).
  - "Forgot password?" link and "Continue with Google" button.
  - "No account? Create one" link.
  - Basket is kept throughout.
- **After sign-in**: stay on checkout, switch to the account view, and autofill name, email, phone and saved billing details (existing autofill logic).
- **Already signed in**: hide the Guest/Account tabs and show "Signed in as name@email · Not you? Sign out".
- Cart page: add a small "Have an account? Sign in" link for guests that returns them to the basket.
- Credit bundles keep requiring sign-in; the sign-in panel is shown automatically when the basket contains a bundle.

## Technical details
- `src/pages/CheckoutDetailsPage.tsx`: render an inline login form when `tab === 'account' && !session` using `supabase.auth.signInWithPassword`; Google via existing OAuth with redirect to `/checkout/details`; existing `onAuthStateChange`/profile load handles autofill. Show friendly error text for wrong password / unconfirmed email.
- Links to `/register?returnTo=/checkout/details` and `/login?returnTo=/cart` (LoginPage/RegisterPage already honour `returnTo`).
- Verify with Playwright: guest → sign in at checkout → fields autofill → continue to payment with basket intact.
