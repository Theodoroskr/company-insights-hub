# Give each country instance its own hero

## What I found
The headline does change per country ("Search and Verify Cyprus Companies", "…Greece…", etc.), but everything else is identical on all five country sites: same subtitle, no badge, same typing words, same layout. That's why they feel like the same hero. There's also a grammar bug: the UAE hero reads "Search and Verify **the UAE** Companies".

## Change (`src/lib/tenantConfig.ts` — `getTenantHero`)

Give each country tenant its own hero block, like ICW already has:

- **Cyprus** — badge "Official registry data · Instant reports"; subtitle mentions Cyprus registry, certificates and KYB; typing words: Structure Report, Credit Report, Certificates, Due Diligence.
- **Greece** — subtitle references Greek companies (GEMI registry), credit and structure reports.
- **Malta** — Malta Business Registry angle, certificates and compliance.
- **Romania** — Romanian companies (ONRC registry), structure and credit reports.
- **UAE / Dubai** — fix grammar to "Search and Verify UAE Companies"; Dubai/UAE company intelligence angle.
- Each gets a distinct badge line and subtitle; typing words tuned per market (e.g. certificates only where certificates are sold).
- ICW hero unchanged.

## Verification
- Load `?tenant=cy`, `gr`, `mt`, `ro`, `ae`, `icw` and screenshot each hero — each shows its own badge, headline and subtitle.
- Type check clean.
