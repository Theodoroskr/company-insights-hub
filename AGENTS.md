# AGENTS.md

Technical rules for this project.

- SECURITY DEFINER functions that are internal-only (`admin_set_user_password`, `handle_new_user`) must stay revoked from `PUBLIC`, `anon`, and `authenticated` EXECUTE; only `service_role`/owner may call them. `get_my_role` stays callable by all roles on purpose — RLS policies evaluate it as the querying role, so revoking it would break policy evaluation.
- pg_net cannot be relocated out of `public` (platform extension, not relocatable) — its linter warning is expected and ignorable.
- All prices (listings, product pages, cart, checkout, confirmations) must be computed via `src/lib/pricing.ts` (`getCountryPricing`, `priceProduct`, `priceCertificateOrder`) — one source prevents fee/VAT drift between pages.
- AI features call Lovable AI Gateway from Edge Functions via `supabase/functions/_shared/responses.ts` (streamed Responses API, model `openai/gpt-6-astra`, system prompt passed as `instructions`) — one helper keeps gateway headers/options consistent.
- Staff access levels live in `public.user_roles` (enum `app_role`) with per-section rights in `public.role_permissions`, checked via `has_role`/`is_staff`/`has_permission` — never trust `profiles.role`, which is only a display mirror and is user-writable in principle.
- Staff RLS policies use `has_permission(auth.uid(), '<section>', need_edit)` keyed to the admin section (orders, fulfillment, customers, audit_logs, products, promo_codes, certificates) — so the User Rights screen is the single source of who can view or edit each table.
- Prepaid credit and enterprise monthly invoicing are settled only through SECURITY DEFINER RPCs (`purchase_credit_bundle`, `pay_order_with_wallet`, `pay_order_on_account`, `generate_monthly_invoices`) that check `auth.uid()`/`has_permission` internally — wallets and ledgers are never client-writable; their "signed-in users can execute" linter warnings are intentional. Wallet is per user, EUR, shared across all tenants.
