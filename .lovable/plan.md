# Order modal: "Add Another Report" closes and goes to search

## Goal
In the order report popup, the "Add Another Report" button currently resets the popup and keeps it open. Instead it should close the popup and take the user to the company search page so they can look up the next company.

## Change
One file: `src/components/orders/OrderReportModal.tsx`.

- The "Add Another Report" button (shown in the "Added to cart" state) will call a new handler that closes the modal and navigates to `/company/search`.
- Navigation uses the existing router hook already imported in this component.
- "Go to Cart" keeps its current behavior (closes and goes to the cart).

## Verification
- Open a company profile, order a report, click "Add Another Report": the popup closes and the search page opens.
- Confirm no build errors.
