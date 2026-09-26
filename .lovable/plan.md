# Report disclaimer on every delivered report

## Goal

Every purchased report — View Online page, its printed version, and every downloaded file — ends with a standard disclaimer from Infocredit Group Ltd.

## Current state (verified)

- **View Online** (`src/pages/account/AccountReportViewPage.tsx`) renders all online reports (Structure, Credit, KYB, UK Company Report, etc.) from stored JSON and ends with the sections/screening panel — no legal text at the bottom. The Print button prints the whole page, so a footer in normal flow is included in print automatically.
- **Downloads** go through `supabase/functions/download-report/index.ts`:
  - If a PDF exists in storage (EDD reports, certificates — uploaded by staff), it redirects to that PDF as-is.
  - Otherwise it streams the raw JSON as a `.json` attachment with no disclaimer field.
- No report PDFs are generated in code; the two only surfaces to cover are the online page and the download endpoint.

## Wording (drafted, single source)

Plaintext source of truth in `src/lib/reportDisclaimer.ts` (brand name inserted per tenant; operator identity follows the agreed rule: "registered in the Republic of Cyprus under registration number HE4404" — registration number only, no street address):

> This report was produced by {Brand}, an independent digital service operated by Infocredit Group Ltd, a company registered in the Republic of Cyprus under registration number HE4404. The information contained in this report has been compiled from publicly available registry data and other third-party sources believed to be reliable; however, Infocredit Group Ltd makes no representation or warranty, express or implied, as to the accuracy, completeness, timeliness or fitness for any particular purpose of such information. This report does not constitute legal, financial or professional advice and must not be relied upon as such. © {year} Infocredit Group Ltd. All rights reserved. Unauthorised reproduction, distribution or resale of this report is prohibited. Generated: {date} · Order: {order ref}

## Changes

1. **`src/lib/reportDisclaimer.ts`** — one function `buildReportDisclaimer({ brandName, generatedAt, orderRef })` returning the plaintext, plus a small `ReportDisclaimerFooter` React component (muted small text, top border, uses tenant theme variables) so the view page and any future surface share it.
2. **`src/pages/account/AccountReportViewPage.tsx`** — render the footer component at the very bottom of every report (after sections and the Compliance & AML panel), including the Summary view. It prints, since the only hidden print elements are the navigation controls.
3. **`supabase/functions/download-report/index.ts`**:
   - JSON fallback: add `disclaimer: "..."` (built from product name, company name, generated_at, order ref) to the response payload.
   - Stored PDFs: before redirecting, append a final disclaimer page to the PDF using `pdf-lib` (Deno-compatible) and serve the modified file instead of redirecting — so analyst-uploaded documents (EDD, certificates) also carry the disclaimer without needing to be re-uploaded. Original stored file stays untouched.

## Notes

- Colors on the web footer come from `var(--text-muted)` etc. — no hardcoded hex.
- The disclaimer text is code-held (single source), not database-held, so it stays identical across all six tenant sites.
- Verified after build: open a finished report's View Online page and a download link; check the JSON payload includes the disclaimer and the PDF download shows the added final page.
