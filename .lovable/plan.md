# Admin credit balances and editable bundle/add-on pricing

## What you will get
1. **Customer credit drawer** (Admin → Customers): open any customer to see their current credit balance, expiry date and full credit history. An "Adjust balance" button lets you add or remove credit (refunds, loyalty bonuses, wire transfers) with a required reason.
2. **Credit balances list** (Admin → Billing): a new "Prepaid credit" section listing every customer with credit, their balance and last activity, with the same Adjust and History actions.
3. **Pricing settings card** (Admin → Settings): edit the three bundle tiers (price paid + bonus %) and the compliance screening add-on price. Changes apply to the site straight away, without code changes.
4. Every adjustment and pricing change is recorded in the audit log with who did it and why.

## Who can do what
- Viewing balances/history: staff with "customers" view rights.
- Adjusting balances and editing pricing: staff with "customers" (for credit) or "products" (for pricing) edit rights, as set on the User Rights screen.
- Customers still cannot change their own balance.

## Technical details
- **New RPC `admin_adjust_user_wallet(_user_id, _amount, _reason)`** — SECURITY DEFINER, checks `has_permission(auth.uid(),'customers',true)`, requires non-empty reason and non-zero amount, locks the wallet row, blocks going below €0, upserts `user_wallets`, inserts `wallet_transactions` (type `adjustment`, note = reason, balance_after), and writes `audit_logs`.
- **Staff read access:** add SELECT policies on `user_wallets` and `wallet_transactions` using `has_permission(auth.uid(),'customers',false)`.
- **New table `pricing_settings`** (single-row keyed config: bundle tiers jsonb `[{tier,pay,bonus_pct}]`, `screening_addon_eur`), with GRANTs, public read, edit via `has_permission(...,'products',true)`; seeded with current values (250/5%, 500/10%, 1000/15%, €45).
- **`purchase_credit_bundle`** rewritten to read tier price/bonus from `pricing_settings` instead of hardcoded values, so the charge always matches what admins set.
- **Frontend:** `src/lib/pricing.ts` stays the single source — it gains a `usePricingSettings()` loader that overrides `screeningAddon` and bundle tiers (falling back to current constants); `src/lib/billing.ts` `CREDIT_BUNDLES` derived from it; cart/checkout/screening use the loaded values. Stripe payment intent amount for screening/bundles checked server-side against the same table.
- **UI:** `AdminCustomersPage.tsx` side panel gains a Credit section + Adjust dialog; `AdminBillingPage.tsx` gains Prepaid credit table; `AdminSettingsPage.tsx` gains Pricing card.
- Record the new rule in AGENTS.md (admin wallet changes only via `admin_adjust_user_wallet`; bundle/add-on prices live in `pricing_settings`).
- Verify: adjust a test balance up and down, check ledger/audit rows, change the screening price and confirm cart shows it.
