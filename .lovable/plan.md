# Rename "Cyprus Credit Report (KYB)" to "Cyprus Credit Report"

The product name is stored in the database (products table, slug `cyprus-kyb-report`). A small migration renames it:

```sql
UPDATE products SET name = 'Cyprus Credit Report' WHERE slug = 'cyprus-kyb-report';
```

The new name then appears everywhere the product shows up: product pages, search and order popups, the cart, checkout, order confirmations, the Orders page, and the admin back office.

## Notes
- The slug `cyprus-kyb-report` stays unchanged so existing links and orders keep working; only the displayed name changes.
- Past orders keep the old name only where a name was copied into an order record at purchase time; all live listings show the new name.
- Other "KYB" mentions elsewhere on the site (UK report, landing copy) are untouched.
