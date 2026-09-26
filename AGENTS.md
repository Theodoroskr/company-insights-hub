# AGENTS.md

Technical rules for this project.

- SECURITY DEFINER functions that are internal-only (`admin_set_user_password`, `handle_new_user`) must stay revoked from `PUBLIC`, `anon`, and `authenticated` EXECUTE; only `service_role`/owner may call them. `get_my_role` stays callable by all roles on purpose — RLS policies evaluate it as the querying role, so revoking it would break policy evaluation.
- pg_net cannot be relocated out of `public` (platform extension, not relocatable) — its linter warning is expected and ignorable.
- All prices (listings, product pages, cart, checkout, confirmations) must be computed via `src/lib/pricing.ts` (`getCountryPricing`, `priceProduct`, `priceCertificateOrder`) — one source prevents fee/VAT drift between pages.
