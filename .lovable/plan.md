# Remove the "UK" link from the top bar

## Goal
The desktop top bar currently shows a "UK" link pushed to the far right, next to the other nav items (About, Contact). Remove it so UK is no longer a first-level menu item.

## Changes
1. `src/components/layout/Navbar.tsx`
   - Delete the desktop `Link to="/uk"` entry ("UK", `order-last`) at the top of the desktop nav (~lines 306–308).

## Left untouched
- The `/uk` page itself stays live and reachable.
- The mobile menu's "🇬🇧 UK Companies" entry stays (it was not part of this request) — say the word if it should go too.
- Company profile pages keep the "All UK company reports" cross-link.

## Verification
- Typecheck (`npx tsgo --noEmit -p tsconfig.app.json`) and build green.
- Preview: top bar shows Products / Pricing / Which report? / About / Contact with no UK item.
