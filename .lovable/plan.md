# Make the Compliance & AML tab stand out

## What changes

The company profile page currently renders the tab strip as plain text: "Overview" (accent underline) and "Compliance & AML 🔒" (muted gray with a lock emoji). The compliance tab blends in, so visitors miss the upsell.

Selected direction: **Premium highlight** (user picked it from prototypes).

### Tab strip treatment (src/pages/CompanyProfilePage.tsx, tab strip at ~lines 867–884)

- **Compliance & AML tab (locked):** render as a compact rounded pill with a soft brand-accent tinted background (`brand-accent` at low opacity), hover deepens the tint; replace the lock emoji with a crisp SVG lock icon in the brand accent; label in semibold dark text.
- **Compliance & AML tab (unlocked / when screening is purchased):** same pill treatment but with a shield icon instead of the lock, so the premium look persists without the paywall cue.
- **Active state:** when the compliance tab is selected, it keeps the pill plus the accent underline/border the Overview tab uses, so the active state stays obvious.
- **Overview tab:** unchanged (accent underline, standard treatment).

### Guardrails

- All colors from CSS variables (`var(--brand-accent)`, `var(--text-main)`, `var(--text-muted)`, `var(--bg-border)`) — no hardcoded hex, so every tenant's brand colors apply automatically.
- Scope stays on the tab strip only; the tab panel contents are untouched.

## Verification

- Type-check with `npx tsgo --noEmit -p tsconfig.app.json`.
- Playwright check on the Barclays page (`/company/barclays-bank-plc-01026167`): element screenshot of the tab strip, confirm the pill treatment renders with the tenant accent, the lock icon shows while locked, and both tabs still switch panels correctly.
