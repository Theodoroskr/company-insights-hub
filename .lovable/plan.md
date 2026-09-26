# Reorder and expand UK filing information

## Layout
- Reorder the UK sections to: Persons with Significant Control, Charges & Mortgages, then UK Filing History.
- Keep Charges and UK Filing History as the final two sections, with Filing History last.
- Make UK Filing History collapsed by default. Its closed header will still show the filing icon and total record count, with a clear expand/collapse chevron.
- Fetch filing records only when the section is first opened, avoiding an unnecessary request while it remains closed.

## Richer filing rows
- Replace the raw hyphenated filing description with a readable event title derived from the filing type and returned details.
- Show useful metadata already returned for each filing where available:
  - filing/form type, such as MR01 or TM01
  - filed date and action/effective date when different
  - officer name, charge number, accounting period, resolution type, or other event-specific values
  - document page count
  - category/subcategory
- Keep each row compact and responsive: primary event text first, supporting facts beneath it, and no external or document links.
- Preserve year grouping, category filters, 25-record paging, and Load more.
- Update the locked message so it describes access to detailed filing history rather than PDF downloads.

## Technical details
- Extend the local filing-item shape to cover `type`, `subcategory`, `action_date`, `pages`, and `description_values` returned by Companies House.
- Add small formatting helpers for event labels and filing-specific details; no new data source or dependency is needed.
- Use the existing collapsible control and current tenant design tokens.

## Verification
- On Barclays, confirm PSC appears first, Charges second, and UK Filing History last and closed initially with 1,398 records shown.
- Expand it and confirm readable details for mortgage and director-termination rows, filtering and Load more still work, and no links appear.
- Confirm the page builds cleanly and remains usable on desktop and mobile.
