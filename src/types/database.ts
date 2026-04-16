// ============================================================
// Database types — Companies House Platform
// Mirrors all Supabase tables exactly.
// ============================================================

export type RiskBand = 'low' | 'medium' | 'high' | 'very_high' | 'critical';
export type CoverageTier = 'premium' | 'standard' | 'on_request';

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'completed'
  | 'cancelled'
  | 'refunded';

export type FulfillmentStatus =
  | 'pending'
  | 'submitted'
  | 'processing'
  | 'completed'
  | 'failed';

export type ProductType =
  | 'extract'
  | 'structure'
  | 'kyb'
  | 'credit'
  | 'certificate'
  | 'monitoring';

export type UserRole = 'user' | 'admin' | 'super_admin';

// ── Tenant ──────────────────────────────────────────────────

export interface Tenant {
  id: string;
  slug: string;
  domain: string;
  brand_name: string;
  country_code: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  meta_title: string | null;
  meta_description: string | null;
  footer_disclaimer: string | null;
  is_active: boolean;
  created_at: string;
}

// ── Country ──────────────────────────────────────────────────

export interface Country {
  code: string;
  iso2: string | null;
  name: string;
  flag_emoji: string | null;
  region: string | null;
  subregion: string | null;
  is_featured: boolean;
  api4all_supported: boolean;
  display_order: number;
  risk_band: RiskBand | null;
  risk_score: number | null;
  political_risk: RiskBand | null;
  economic_risk: RiskBand | null;
  sanctions_risk: RiskBand | null;
  aml_risk: RiskBand | null;
  coverage_tier: CoverageTier | null;
  business_climate_score: number | null;
  currency_code: string | null;
}

// ── Profile ──────────────────────────────────────────────────

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  created_at: string;
}

// ── Company ──────────────────────────────────────────────────

export interface DirectorEntry {
  name: string;
  role: string;
}

export interface Company {
  id: string;
  tenant_id: string | null;
  icg_code: string;
  country_code: string;
  name: string;
  reg_no: string | null;
  vat_no: string | null;
  status: string | null;
  legal_form: string | null;
  registered_address: string | null;
  slug: string | null;
  raw_source_json: Record<string, unknown> | null;
  directors_json: DirectorEntry[] | null;
  cached_at: string;
  meta_title: string | null;
  meta_description: string | null;
}

// ── Product ──────────────────────────────────────────────────

export interface ProductSpeed {
  label: string;
  code: string;
  price_delta: number;
  sla_hours: number;
}

export interface Product {
  id: string;
  tenant_id: string | null;
  name: string;
  slug: string;
  api4all_product_code: string | null;
  type: ProductType;
  description: string | null;
  what_is_included: string[];
  base_price: number;
  service_fee: number;
  vat_on_full_price: boolean;
  vat_on_fee_only: boolean;
  is_instant: boolean;
  delivery_sla_hours: number;
  available_speeds: ProductSpeed[];
  sample_pdf_url: string | null;
  product_image_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

// ── Order ────────────────────────────────────────────────────

export interface Order {
  id: string;
  tenant_id: string | null;
  user_id: string | null;
  order_ref: string | null;
  status: OrderStatus;
  subtotal: number;
  vat_amount: number;
  total: number;
  currency: string;
  stripe_payment_intent_id: string | null;
  guest_email: string | null;
  guest_details: Record<string, unknown> | null;
  discount_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── Order Item ───────────────────────────────────────────────

export interface OrderItem {
  id: string;
  order_id: string | null;
  product_id: string | null;
  company_id: string | null;
  speed: string;
  unit_price: number;
  vat_amount: number;
  fresh_investigation: boolean;
  fulfillment_status: FulfillmentStatus;
  api4all_order_id: string | null;
  api4all_item_code: string | null;
  sla_deadline: string | null;
  created_at: string;
}

// ── Generated Report ─────────────────────────────────────────

export interface GeneratedReport {
  id: string;
  order_item_id: string | null;
  company_id: string | null;
  report_type: string | null;
  api4all_raw_json: Record<string, unknown> | null;
  pdf_storage_path: string | null;
  download_token: string;
  download_expires_at: string | null;
  generated_at: string;
  version: number;
}

// ── Monitoring Subscription ───────────────────────────────────

export interface MonitoringSubscription {
  id: string;
  tenant_id: string | null;
  user_id: string | null;
  company_id: string | null;
  plan: string;
  frequency: string;
  active: boolean;
  stripe_subscription_id: string | null;
  next_check_at: string | null;
  created_at: string;
}

// ── Change Event ─────────────────────────────────────────────

export interface ChangeEvent {
  id: string;
  subscription_id: string | null;
  company_id: string | null;
  severity: string | null;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  detected_at: string;
  notified_at: string | null;
}

// ── Search Log ───────────────────────────────────────────────

export interface SearchLog {
  id: string;
  tenant_id: string | null;
  user_id: string | null;
  query: string | null;
  country_code: string | null;
  results_count: number | null;
  created_at: string;
}

// ── Audit Log ────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  tenant_id: string | null;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}
