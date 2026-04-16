-- 1. Add screening_enabled flag on products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS screening_enabled boolean NOT NULL DEFAULT false;

-- 2. screening_results table
CREATE TABLE public.screening_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  overall_status text NOT NULL DEFAULT 'pending',
  total_hits int NOT NULL DEFAULT 0,
  sanctions_hits int NOT NULL DEFAULT 0,
  pep_hits int NOT NULL DEFAULT 0,
  adverse_media_hits int NOT NULL DEFAULT 0,
  entities_screened int NOT NULL DEFAULT 0,
  raw_response jsonb,
  error text,
  screened_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_screening_results_order_item ON public.screening_results(order_item_id);
ALTER TABLE public.screening_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Order owners can view their screening results"
  ON public.screening_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE oi.id = screening_results.order_item_id
        AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all screening results"
  ON public.screening_results FOR SELECT
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Admins can insert screening results"
  ON public.screening_results FOR INSERT
  WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "Admins can update screening results"
  ON public.screening_results FOR UPDATE
  USING (public.get_my_role() = 'admin');

-- 3. screening_entity_hits table
CREATE TABLE public.screening_entity_hits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screening_result_id uuid NOT NULL REFERENCES public.screening_results(id) ON DELETE CASCADE,
  entity_name text NOT NULL,
  entity_role text,
  hit_type text NOT NULL,
  match_strength text,
  source_lists text[],
  share_url text,
  raw_match jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_screening_entity_hits_result ON public.screening_entity_hits(screening_result_id);
ALTER TABLE public.screening_entity_hits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Order owners can view their screening hits"
  ON public.screening_entity_hits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.screening_results sr
      JOIN public.order_items oi ON oi.id = sr.order_item_id
      JOIN public.orders o ON o.id = oi.order_id
      WHERE sr.id = screening_entity_hits.screening_result_id
        AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all screening hits"
  ON public.screening_entity_hits FOR SELECT
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Admins can insert screening hits"
  ON public.screening_entity_hits FOR INSERT
  WITH CHECK (public.get_my_role() = 'admin');

-- 4. Seed Enhanced UK KYB Report product (£59) — guarded against duplicates
INSERT INTO public.products (
  slug, name, type, base_price, service_fee, vat_on_full_price,
  description, is_active, screening_enabled, display_order,
  what_is_included, delivery_sla_hours
)
SELECT
  'enhanced-uk-kyb-report',
  'Enhanced UK KYB Report',
  'report',
  59.00,
  0,
  true,
  'Full UK Companies House report PLUS sanctions, PEP and adverse media screening on the company, all active officers and all PSCs. Compliance-grade KYB for regulated industries.',
  true,
  true,
  5,
  ARRAY[
    'Everything in the standard UK Company Report',
    'Sanctions screening against UK OFSI, EU, US OFAC, UN and global lists',
    'PEP (Politically Exposed Persons) screening with relatives and close associates',
    'Adverse media screening across global news sources',
    'Screening applied to the company entity, all active officers and all PSCs',
    'Powered by ComplyAdvantage'
  ],
  24
WHERE NOT EXISTS (
  SELECT 1 FROM public.products WHERE slug = 'enhanced-uk-kyb-report'
);