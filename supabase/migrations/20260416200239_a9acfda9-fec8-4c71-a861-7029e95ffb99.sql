
INSERT INTO public.products (
  tenant_id, slug, name, type, base_price, service_fee,
  is_instant, is_active, vat_on_full_price, vat_on_fee_only,
  delivery_sla_hours, available_speeds,
  api4all_product_code, display_order, description, what_is_included
) VALUES (
  'ea1fd2cf-7e13-48ff-baf0-938389de2a37',
  'uk-company-report',
  'UK Company Report',
  'kyb',
  15,
  0,
  true,
  true,
  true,
  false,
  0,
  '[]'::jsonb,
  NULL,
  5,
  'Instant company report for any UK limited company, sourced directly from Companies House. Includes registration details, officers, filings, charges and persons with significant control.',
  ARRAY[
    'Full company profile (name, number, status, incorporation date)',
    'Registered office address',
    'All current and resigned officers / directors',
    'Last 25 filings with categories and dates',
    'Charges & mortgages register',
    'Persons with Significant Control (PSC)',
    'Source: Companies House UK official register',
    'Delivered instantly as a downloadable PDF'
  ]
)
ON CONFLICT DO NOTHING;
