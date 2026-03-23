
## Plan: Correct Search Route + Layout + OrderReportModal

### Summary of changes
1. **`App.tsx`** — add `/company/search` route pointing to `SearchResultsPage`, keep `/search` as a redirect to `/company/search` for backwards compatibility
2. **`SearchResultsPage.tsx`** — rebuild the left sidebar to exactly match the spec (radio buttons for Legal Type, "Dicover" international CTA, RESET link) and update the right column title to "Companies" with the correct empty state
3. **`OrderReportModal.tsx`** — create the modal; the search button navigates to `/company/search?q={query}` instead of searching inline

---

### 1. App.tsx changes (lines 62 area)

- Change `/search` route to `/company/search`  
- Add `/search` as `<Navigate to="/company/search" replace />` for backwards compat
- Keep `/company/:slug` — note: the new `/company/search` route must come BEFORE `/company/:slug` to avoid React Router treating "search" as a slug

```
<Route path="/company/search" element={<SearchResultsPage />} />
<Route path="/company/:slug" element={<CompanyProfilePage />} />
```

---

### 2. SearchResultsPage.tsx — sidebar rebuild

The current sidebar has: search input + Search button, Status radio (all/active/dissolved), Legal Type checkboxes, Country checkboxes (ICW only).

The spec wants:
- Section "Search Company": input pre-filled with `q` param + dark square search button
- Section "Filters": radio group for Legal Type (Business Name, Limited Company, Partnership, Old Partnership, Overseas Company) — **fixed options**, not dynamic from results
- "Looking for similar companies internationally?" card with "Dicover ↗" button (exact spelling) → `https://www.infocreditworld.com/#{q}/blank&c`
- "RESET" link in teal, clears filters and search

Right column: title changes from `"{N} companies found"` to just `"Companies"` (H2), empty state uses `<EmptyState message="No Companies yet" />`.

**Key change**: Legal Type filter switches from dynamic checkboxes (derived from results) to **fixed radio buttons** with the 5 preset options. Selected radio filters `filtered` array by `company.legal_form`.

State changes:
- Remove `selectedLegalTypes`, `legalTypes` (dynamic arrays)
- Add `legalTypeFilter: string | null` — null = all
- Keep `statusFilter` (but remove it from sidebar UI per spec — spec shows only Legal Type radios)
- Keep `selectedCountries` for ICW

---

### 3. OrderReportModal.tsx — create new

Props: `isOpen`, `onClose`, `preselectedProduct?: Product`, `preselectedCompany?: Company`

**Company search behavior per spec**: "The modal search button navigates to `/company/search?q={modalQuery}` when clicked — it does NOT search inline in the modal."

So the modal has:
- A text input for company name search
- A search button (dark square, search icon) that `navigate('/company/search?q=${query}')`
- If `preselectedCompany` is passed: show the company chip (teal bg, white text, name + reg_no, X to clear)
- No live dropdown results in modal

Products dropdown: load from Supabase `products WHERE tenant_id = tenant.id AND is_active = true ORDER BY display_order`

Add to Cart logic:
```ts
cartContext.addItem(selectedProduct, selectedCompany, selectedProduct.available_speeds?.[0]?.code ?? 'Normal')
onClose()
navigate('/cart')
```

Footer: Total price left, "Add to Cart" (disabled if no company) + "Cancel" right.

---

### Files to edit/create

```
EDIT    src/App.tsx                          (route fix: /company/search, redirect /search)
EDIT    src/pages/SearchResultsPage.tsx      (sidebar rebuild, right column title + empty state)
CREATE  src/components/orders/OrderReportModal.tsx
```

No DB changes. No migration needed.
