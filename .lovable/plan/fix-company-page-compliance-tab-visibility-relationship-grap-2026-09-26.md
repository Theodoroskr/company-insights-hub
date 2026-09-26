# Fix company page: compliance tab visibility + relationship graph

## 1. Compliance & AML tab — Premium highlight (direction picked: v2)

`src/pages/CompanyProfilePage.tsx`, tab strip (~lines 867–884).

- **Compliance & AML tab (locked):** compact rounded pill with a soft brand-accent tinted background that deepens on hover; replace the lock emoji with a crisp SVG lock icon in the brand accent; label in semibold dark text.
- **Unlocked (screening purchased):** same pill treatment, shield icon instead of the lock — premium look persists without the paywall cue.
- **Active state:** pill keeps the accent underline/border the Overview tab uses.
- **Overview tab:** unchanged.
- All colors from CSS variables (`var(--brand-accent)`, `var(--text-main)`, `var(--text-muted)`, `var(--bg-border)`) so every tenant's branding applies.

## 2. Director Relationship Graph — Radial spoke diagram (direction picked: v1)

`src/components/company/DirectorRelationshipGraph.tsx` (212 lines, currently uses `react-force-graph-2d` physics, which overlaps all labels).

Replace the physics simulation with a **deterministic static radial layout** rendered with SVG lines + positioned elements:

- Company node at the center (accent-filled circle with the company name).
- Officers/directors/secretaries/PSCs evenly spaced on a circle around it, straight connecting lines, each node with a role-colored dot and its name below it (truncated, no collisions — labels anchored outside the ring).
- Node colors keep the existing type legend (Company / Director / Secretary / PSC) using tenant CSS variables instead of hardcoded hex where possible.
- **Locked state:** masked names (`maskLabel` logic stays) + the existing dark "Unlock full names & relationships" pill on hover position at the bottom.
- **Unlocked:** full names.
- **Scales with data:** 0 officers → existing empty message; few → single ring; many (30+) → two concentric rings with smaller nodes so nothing overlaps.
- Header/footer updated: remove "Drag any node · scroll to zoom" (no interaction anymore) and show the count badge; keep the card title and legend.
- Remove the `react-force-graph-2d` usage from this component (package stays installed; other usages are none — confirm before removing import only).

## 3. SIC codes — show the real business activity, not just the number

On UK company pages (`src/components/company/UKCompanyFactsPanel.tsx`), each SIC chip falls back to italic "SIC code 64191" because `sic_codes_descriptions` is never populated anywhere — the field is dead code today. The intro paragraph already exists.

- Add a curated UK SIC 2007 description lookup (`src/lib/sicCodes.ts`): the full 21 section-level descriptions plus the ~150 most common 5-digit codes, including **64191 → "Activities of banking holding companies"** (Barclays Bank PLC).
- Wire it into `UKCompanyFactsPanel` so every code renders its official description, with the section-level description as fallback and the plain "SIC code NNNNN" as last resort.
- Use the same lookup in `SearchWidget`'s "Sector" result line (currently shows raw "SIC 64191") so search results are readable too.
- No backend changes needed — Companies House's API returns codes only; the mapping lives in the app.

## Verification

- `npx tsgo --noEmit -p tsconfig.app.json`.
- Playwright on `/company/barclays-bank-plc-01026167`: element screenshots of the tab strip (pill treatment, lock icon while locked) and the new radial graph (labels readable, no overlap, masked names while locked), and click the compliance tab to confirm the panel still opens.
