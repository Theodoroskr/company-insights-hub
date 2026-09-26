# Remove "Register a Company" and Business Name Approval

## What changes for visitors
- The **Register a Company** column disappears from the top menu, on desktop and mobile. It held "Company Set Up" and "Business Name Approval".
- The **Company Set Up** and **Business Name Approval** pages are removed. Old links to them go to the home page, so nobody lands on a broken page.
- These two services can no longer be added to the cart.

## What stays
- **Business Name Certificates** (Registration, Good Standing, Owner, and so on) are official registry certificates, not the name-approval service, so they stay.
- The account sign-up page (`/register`) is unrelated and stays.
- Past orders that included these services stay in order history.

## Technical details
- `src/components/layout/Navbar.tsx`: delete the "Register column" block (around lines 394–427) and the mobile "Register a Company" accordion (around lines 802–810). Change the dropdown grid from 3 columns to 2 so there's no empty gap.
- `src/App.tsx`: remove the imports and routes for `CompanySetUpPage` and `BusinessNameApprovalPage`. Add `<Navigate to="/" replace />` for `/company-set-up` and `/business-name-approval`.
- Delete `src/pages/CompanySetUpPage.tsx` and `src/pages/BusinessNameApprovalPage.tsx`.
- Database: the catalogue has no rows for these services (the pages add cart items directly), so no data changes are needed.
- Tidy up leftover references to service products in the cart/checkout. Then confirm the code compiles and the tests pass.
