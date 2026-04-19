# Memory: index.md
Updated: just now

# Project Memory

## Core
- Platform: "Companies House" ecommerce for company intelligence. Stack: React, TS, Tailwind, Supabase, Stripe.
- Multi-tenant architecture (Cyprus, Greece, Malta, Romania, Dubai, Global) via hostname. Local default: 'cy'.
- Design: Stripe-like light mode, navy hero/footer, bright blue CTAs, Inter font.
- No hardcoded hex/HSL colors; use document root CSS variables exclusively for tenant branding.
- RLS: Never use recursive policies. Use SECURITY DEFINER functions (e.g., `get_my_role()`).

## Memories
- [Multi-tenancy](mem://architecture/multi-tenancy) — Multi-tenant architecture using single React codebase and Supabase
- [Design system](mem://style/design-system) — UI aesthetics, Stripe-inspired layout, and CSS variable constraints
- [API4ALL integration](mem://integrations/api4all) — API4ALL v3 secure Supabase Edge Function requests and basic auth
- [Companies House UK](mem://integrations/companies-house-uk) — UK company data via official CH API, proxied edge function, 24h cache, Premium tier under ICW
- [Data caching](mem://architecture/data-caching) — 24h TTL stale-while-revalidate pattern for API4ALL company data
- [SEO strategy](mem://features/seo-strategy) — react-helmet-async and JSON-LD structured data for profiles
- [Gating strategy](mem://ux/gating-strategy) — Blurred placeholders for sensitive data to incentivize purchases
- [Access control](mem://auth/access-control) — Supabase Auth, mandatory verification, and returnTo logic
- [Fulfillment workflow](mem://features/fulfillment-workflow) — Cron-triggered task system for API4ALL order fulfillment
- [Auditing & monitoring](mem://architecture/auditing-monitoring) — Audit logs and change monitoring with specific color severities
- [Search logic](mem://ux/search-logic) — Fixed radio filters, EmptyState text, and instant search updates
- [Order report modal](mem://ux/order-report-modal) — Config for product reports and bypass rules for setup forms
- [Company profile sidebar](mem://ux/company-profile-sidebar) — Sidebar categories, pill badges, and intentional 'Dicover' typo button
- [Ecommerce flow](mem://features/ecommerce-flow) — LocalStorage cart, real-time VAT calculation, and EU VIES validation
- [Admin backoffice](mem://features/admin-backoffice) — Order fulfillment auto-refresh and SLA tracking colors
- [Service products](mem://features/service-products) — Setup services bypassing modal, cart clearing requirements
- [Product catalog](mem://features/product-catalog) — Dynamic landing page templates with sticky tabs and accordions
- [Footer structure](mem://style/footer-structure) — Persistent 4-column navy grid with tenant-specific disclaimer
- [Visual signatures](mem://ux/visual-signatures) — 50ms character typing animation on main hero sections
- [Legal pages](mem://features/legal-pages) — Singular 'Terms and condition' naming constraint and PageLayout wrapper
- [Supabase security](mem://architecture/supabase-security) — SECURITY DEFINER function pattern to avoid RLS infinite loops
- [User account management](mem://features/user-account-management) — Secure downloads, self-service tools, and legacy dashboard redirects
- [Navbar structure](mem://ux/navbar-structure) — Three-tabbed dropdown panel for Reports, Certificates, and Register
- [Routing conventions](mem://architecture/routing-conventions) — Search and profile routing slugs, reg_no, and redirects
- [Alphabetical directory](mem://features/alphabetical-directory) — A-Z directory for secondary navigation and crawlers
- [Contact system](mem://features/contact-system) — Public insert logic for contact_messages table
- [Saved companies](mem://features/saved-companies) — User bookmarks via SaveCompanyButton, listed at /account/saved
