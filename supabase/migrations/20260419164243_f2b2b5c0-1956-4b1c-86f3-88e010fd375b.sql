-- Add country scope columns to products
ALTER TABLE public.products
  ADD COLUMN country_scope TEXT NOT NULL DEFAULT 'global',
  ADD COLUMN allowed_countries TEXT[] DEFAULT NULL;

CREATE INDEX idx_products_country_scope ON public.products(country_scope);
CREATE INDEX idx_products_allowed_countries ON public.products USING GIN(allowed_countries);

-- Backfill: Cyprus tenant products are CY-only
UPDATE public.products p
SET country_scope = 'cy-only',
    allowed_countries = ARRAY['CY']
FROM public.tenants t
WHERE p.tenant_id = t.id AND t.slug = 'cy';

-- UK Report (icw) → uk-only
UPDATE public.products
SET country_scope = 'uk-only',
    allowed_countries = ARRAY['GB']
WHERE slug = 'uk-company-report';

-- Standalone "Enhanced UK KYB Report" (no tenant) → uk-only
UPDATE public.products
SET country_scope = 'uk-only',
    allowed_countries = ARRAY['GB']
WHERE slug = 'enhanced-uk-kyb-report';