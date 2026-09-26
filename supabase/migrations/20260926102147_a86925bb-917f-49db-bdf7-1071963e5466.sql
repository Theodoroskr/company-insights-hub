INSERT INTO public.products (tenant_id, name, slug, type, description, what_is_included, base_price, service_fee, vat_on_full_price, vat_on_fee_only, is_instant, delivery_sla_hours, available_speeds, display_order, is_active, country_scope, allowed_countries)
VALUES (
  'ea1fd2cf-7e13-48ff-baf0-938389de2a37',
  'Enhanced Due Diligence (EDD) Report',
  'edd-report',
  'report',
  'An in-depth, analyst-led enhanced due diligence investigation for higher-risk counterparties in any country. Goes beyond standard reports with UBO mapping, sanctions and PEP screening, adverse media in local languages, reputation checks and site verification where feasible.',
  ARRAY[
    'Full corporate structure and ownership chain mapping',
    'Ultimate Beneficial Owner (UBO) identification',
    'Sanctions, enforcement and PEP screening of company, directors and shareholders',
    'Adverse media checks including local-language sources',
    'Historical changes (name, address, directors, shareholders)',
    'Reputation and trade reference checks',
    'Site visit verification where feasible',
    'Analyst summary with risk assessment and findings'
  ],
  750,
  0,
  true,
  false,
  false,
  120,
  '[]'::jsonb,
  7,
  true,
  'global',
  NULL
);