# Certificates per country, with an admin on/off switch

## What you get
- **Cyprus stays exactly as today.** The current certificates, packs and €40 + €40 pricing are unchanged. They only appear on Cyprus companies.
- **A new "Certificates" screen in admin.** It lists each country with one switch: *Certificates available*. Only Cyprus starts switched on.
- **UK certificates created but switched off.** A starter set of UK Companies House certificates is added with no price. They stay hidden until you set prices and switch the UK on.
- **Any country can be added later.** Add its certificates on the same screen, price them, then flip the switch.

## Fixes along the way
- The "Order Official Certificates" card on a company page currently doesn't check the company's country. It could show on non-Cyprus companies whose company type looks similar. It will now only show when that company's country has certificates switched on.
- Search results already hide certificate shortcuts outside Cyprus. They will use the same switch, so enabling a country later works everywhere at once.

## Where certificates appear (all follow the country switch)
- Company page: the certificate list in the sidebar and the "Order Official Certificates" card.
- Search results: the certificate shortcut chips.
- The Certificates page and the menu stay Cyprus-branded for now. If a second country goes live, that page will need its own version for that country; that's a separate step.

## UK starter set (created switched off, no price)
- Certificate of Incorporation (certified copy)
- Certificate of Good Standing
- Certified Copy of Articles of Association
- Certified Filing History / Company Documents
- Certificate of Incorporation on Change of Name

The names can be adjusted on the admin screen before launch.

## Technical details
- Migration: add `certificates_enabled boolean not null default false` to `countries`. Add an admin-only update policy using `get_my_role() = 'admin'`, since updates are currently denied. `GRANT UPDATE` goes to authenticated.
- Data (via SQL, not migration): set `certificates_enabled = true` for `CY`. Insert the UK products with `type='certificate'`, slugs `certificate_uk_*`, `country_scope='uk-only'`, `allowed_countries={GB}`, `is_active=false`, `base_price=0`, `service_fee=0`, `vat_on_full_price=true` under the icw tenant.
- `src/lib/certificateAvailability.ts` (new): `useCertificateCountries()` loads the enabled country codes (cached). `certificatesAvailableFor(countryCode, enabledSet)` checks one country.
- `CompanyProfilePage.tsx`: filter `certificateProducts` and gate the "Order Official Certificates" card with `certificatesAvailableFor(company.country_code)`. The card also keeps its Cyprus-only company-type mapping.
- `SearchResultsPage.tsx`: replace the hardcoded `=== 'CY'` with the same check.
- `src/pages/admin/AdminCertificatesPage.tsx` (new) at `/admin/certificates`, with a nav entry in `AdminLayout`. It has a country switch list, plus the certificates for each country with inline name, price, service fee and active edits. It blocks activating a product priced at €0.
- Pricing audit: the service-fee rule for official certificates applies per country. The €40 + €40 rule stays Cyprus-only (UK fees are whatever you set), and inactive products are already skipped. Update the tests for this.
- Verify with typecheck, vitest, and a Playwright check that a UK company shows no certificates and a Cyprus company still does.
