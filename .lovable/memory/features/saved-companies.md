---
name: Saved Companies
description: Bookmark companies to /account/saved via SaveCompanyButton on search results and profile pages
type: feature
---

Logged-in users can bookmark companies via `SaveCompanyButton` (icon variant in search result cards, full variant on company profile header).
Stored in `saved_companies` table (user_id + company_id unique). Listed at `/account/saved` with the "Saved Companies" sidebar entry.
Hook `useSavedCompanies` exposes `isSaved(companyId)` and `toggleSaved(companyId, tenantId?)` with in-memory cache + listener pattern so all buttons stay in sync.
Unauthenticated users get a toast prompt to sign in.
