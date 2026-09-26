# Add a Certifications section to the About page

## What we will build

### 1. Store the badge image
- Save the uploaded EURO CERT badge as a hosted site asset (CDN), so it loads fast on every instance without bloating the codebase.

### 2. New "Certifications" section on the About page
- A new section below "Why Choose Us" titled **Certifications**.
- Shows the EURO CERT badge image next to a short description:
  - **ISO 22301:2019 — Business Continuity Management System**, certified by EURO CERT (certificate no. 00.24.0127).
- Styled with the existing tenant theme variables, so it matches each instance's branding automatically.

### 3. Verify
- Typecheck and build pass.
- Check the About page in the preview: badge renders crisply on desktop and mobile.

## Notes
- The section appears on all six instances (shared codebase). If a certification should only show on certain sites, tell me and I'll scope it.
- If you have more certifications (e.g. ISO 27001, GDPR seals), send the badges and I'll add them to the same section.

## Technical details
- Asset via `lovable-assets create` from the uploaded file, imported as a pointer JSON in `src/assets/`.
- One edit to `src/pages/AboutPage.tsx`: new `<section>` with the badge (`<img>` with alt text) and copy.
