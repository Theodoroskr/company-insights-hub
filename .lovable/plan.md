# Make the Compliance & AML tab stand out

## Goal
The Compliance & AML tab currently looks like an ordinary muted tab (a faint 7% tint pill), so visitors miss the paid screening upsell. Give it a clearly premium, attention-drawing treatment — locked and unlocked states — using only the tenant brand CSS variables so every instance shows its own colors.

## Design (default chosen: "filled lock chip + accent border + soft glow")
- The tab keeps its place in the strip next to Overview, but reads as a distinct premium pill:
  - White pill surface with a 1px brand-accent border (35% strength) and a soft accent-tinted shadow.
  - Lock icon inside a small filled brand-accent chip (white icon on accent) when locked; shield icon in the same chip when screening is unlocked.
  - A tiny pulsing accent dot in the pill's corner while locked (subtle "worth attention" cue), removed when unlocked.
  - On hover the border and glow deepen slightly.
  - When the tab is selected (active), it gains a stronger accent underline like Overview does.
- Overview tab stays exactly as it is.
- All colors via `var(--brand-accent)` + `color-mix` — no hardcoded hex; pulse disabled under `prefers-reduced-motion`.

## Changes
1. `src/index.css` — replace the current `.compliance-tab-pill` block with the stronger treatment (surface, border, glow, hover, active states) and add rules for the lock chip and pulsing dot (`.compliance-tab-pill .lock-chip`, `.compliance-tab-pill .pulse-dot`).
2. `src/pages/CompanyProfilePage.tsx` — update the Compliance & AML tab button markup (lines ~881–892): keep `Lock`/`ShieldCheck` logic, wrap the icon in the chip span, add the pulse dot span when locked, and add the active underline style via `aria-selected` CSS instead of inline classes.

## Scope
- Company profile pages on all six instances (same shared component) — no other pages, no data or checkout changes.

## Verification
- Typecheck clean.
- Playwright on the Barclays company page: screenshot the tab strip locked, and unlocked after restoring the signed-in session; confirm the pill clearly stands out, the pulse dot shows when locked, and the shield + underline show when unlocked and selected.
