

## Assessment: Using Lead & Contact Hub as Super Admin for Tenants

### The Short Answer: No — they are separate projects with separate backends

The [Lead & Contact Hub](/projects/d05456da-e86d-4685-b971-61ddeb125387) and this Infocredit project run on **completely independent backends**. They have different databases, different auth systems, and different user tables. The Hub has no knowledge of your tenants, orders, or products.

### What the Hub Does Today

- Manages **leads** and **contacts** received via webhook from any website
- Has a **websites** concept (each website gets an API key) — this is similar to tenants but not the same thing
- Dashboard with stats filtered by website
- Settings page to manage websites and API keys

### Why It Won't Work Directly

| Requirement | Hub has it? |
|---|---|
| Access to `tenants` table | No — different database |
| Access to `orders`, `products` | No |
| Shared login (SSO) | No — separate auth |
| Tenant branding management | No |
| Revenue/order KPIs per tenant | No |

### Two Realistic Paths Forward

**Path A — Build Super Admin here (recommended, fastest)**
Add `/admin/tenants` to this project. You already have the `super_admin` role, the `tenants` table, and all the order/product data. This is 1-2 hours of work.

**Path B — Make the Hub the central admin (complex, slower)**
This requires:
1. Pointing the Hub at this project's backend (same database URL + anon key)
2. Migrating the Hub's `leads`/`contacts`/`websites` tables into this database
3. Adding tenant management pages to the Hub
4. Merging auth so one login works for both

This is a multi-day effort and risks breaking both projects.

### Recommendation

Build the Super Admin Tenants page **inside this project** now. Later, connect the Hub via webhook (it already supports this) so leads from all tenants flow into the Hub automatically. That gives you:

- **This project** = admin for tenants, orders, products, fulfillment
- **Hub** = CRM for leads and contacts from all tenants

Each project does what it's best at, connected via API keys.

---

Want me to proceed with building the `/admin/tenants` Super Admin page in this project?

