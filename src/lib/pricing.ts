// ============================================================
// SINGLE SOURCE OF TRUTH FOR PRICING
// Every price shown in listings, product pages, cart, checkout and
// order confirmations must be computed through this module.
// Canonical currency is EUR; display conversion happens in CurrencyContext.
// ============================================================

import type { Product, ProductSpeed } from '../types/database';

export interface CountryPricing {
  /** VAT rate applied at checkout for this tenant/country */
  vatRate: number;
  /** Official registry certificate fee (Cyprus) */
  certificateFee: number;
  /** Our service & delivery fee charged per certificate */
  certificateServiceFee: number;
  apostille: number;
  certifiedTranslation: number;
  urgentDeliveryPerCert: number;
  courierDelivery: number;
  /** Optional ComplyAdvantage screening add-on per report */
  screeningAddon: number;
}

const BASE: CountryPricing = {
  vatRate: 0,
  certificateFee: 40,
  certificateServiceFee: 40,
  apostille: 100,
  certifiedTranslation: 90,
  urgentDeliveryPerCert: 20,
  courierDelivery: 25,
  screeningAddon: 45,
};

/** Keyed by tenant slug. Cyprus is the only tenant charging VAT (19%). */
const PRICING_BY_TENANT: Record<string, CountryPricing> = {
  cy: { ...BASE, vatRate: 0.19 },
  gr: BASE,
  mt: BASE,
  ro: BASE,
  ae: BASE,
  icw: BASE,
};

export function getCountryPricing(tenantSlug?: string | null): CountryPricing {
  return (tenantSlug && PRICING_BY_TENANT[tenantSlug]) || BASE;
}

export function getVatRate(tenantSlug?: string | null): number {
  return getCountryPricing(tenantSlug).vatRate;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

type PricedProduct = Pick<Product, 'base_price'> &
  Partial<Pick<Product, 'service_fee' | 'vat_on_full_price' | 'vat_on_fee_only' | 'available_speeds'>>;

export function getProductSpeeds(product: PricedProduct): ProductSpeed[] {
  return Array.isArray(product.available_speeds) ? (product.available_speeds as ProductSpeed[]) : [];
}

export interface LinePrice {
  /** Report/official fee incl. speed surcharge */
  base: number;
  serviceFee: number;
  /** base + serviceFee (ex VAT) — the "price" shown everywhere */
  net: number;
  vat: number;
  total: number;
}

/** Price one product line. speedCode defaults to the first (cheapest) speed. */
export function priceProduct(
  product: PricedProduct,
  vatRate: number,
  speedCode?: string | null,
): LinePrice {
  const speeds = getProductSpeeds(product);
  const speed = speedCode ? speeds.find((s) => s.code === speedCode) : speeds[0];
  const base = Number(product.base_price) + Number(speed?.price_delta ?? 0);
  const serviceFee = Number(product.service_fee ?? 0);
  const net = base + serviceFee;
  const vat = vatForNet(product, net, vatRate);
  return { base: round2(base), serviceFee: round2(serviceFee), net: round2(net), vat, total: round2(net + vat) };
}

/** VAT on an arbitrary net amount (e.g. upgrade price overrides) using the product's VAT rule. */
export function vatForNet(product: PricedProduct, net: number, vatRate: number): number {
  if (product.vat_on_fee_only) return round2(Number(product.service_fee ?? 0) * vatRate);
  if (product.vat_on_full_price === false) return 0;
  return round2(net * vatRate);
}

export interface CertificateOrderInput {
  certificates: { price: number; apostille: boolean }[];
  urgentDelivery: boolean;
  courierDelivery: boolean;
}

export function priceCertificateOrder(order: CertificateOrderInput, pricing: CountryPricing) {
  const count = order.certificates.length;
  const certificates = order.certificates.reduce((s, c) => s + c.price, 0);
  const serviceDelivery = count * pricing.certificateServiceFee;
  const apostille = order.certificates.filter((c) => c.apostille).length * pricing.apostille;
  const urgent = order.urgentDelivery ? pricing.urgentDeliveryPerCert * count : 0;
  const courier = order.courierDelivery ? pricing.courierDelivery : 0;
  const subtotal = round2(certificates + serviceDelivery + apostille + urgent + courier);
  const vat = round2(subtotal * pricing.vatRate);
  return { certificates, serviceDelivery, apostille, urgent, courier, subtotal, vat, total: round2(subtotal + vat) };
}

// ---- Admin-editable settings (bundle tiers + screening add-on), loaded before app render ----
export interface CreditBundle { tier: string; name: string; pay: number; bonusPct: number; bonus: number }
const toBundle = (t: { tier: string; pay: number; bonus_pct: number }): CreditBundle => ({
  tier: t.tier, name: t.tier.charAt(0).toUpperCase() + t.tier.slice(1), pay: Number(t.pay),
  bonusPct: Number(t.bonus_pct), bonus: round2(Number(t.pay) * Number(t.bonus_pct) / 100),
});
export const DEFAULT_BUNDLE_TIERS = [
  { tier: 'starter', pay: 250, bonus_pct: 5 },
  { tier: 'professional', pay: 500, bonus_pct: 10 },
  { tier: 'corporate', pay: 1000, bonus_pct: 15 },
];
/** Mutated in place by loadPricingSettings so imports stay valid. */
export const CREDIT_BUNDLES: CreditBundle[] = DEFAULT_BUNDLE_TIERS.map(toBundle);
export let SCREENING_ADDON_PRICE_EUR = BASE.screeningAddon;

export function applyPricingSettings(row: { bundle_tiers?: any; screening_addon_eur?: any } | null) {
  if (!row) return;
  if (Array.isArray(row.bundle_tiers) && row.bundle_tiers.length) {
    CREDIT_BUNDLES.splice(0, CREDIT_BUNDLES.length, ...row.bundle_tiers.map(toBundle));
  }
  const sc = Number(row.screening_addon_eur);
  if (Number.isFinite(sc) && sc >= 0) {
    SCREENING_ADDON_PRICE_EUR = sc;
    BASE.screeningAddon = sc;
    Object.values(PRICING_BY_TENANT).forEach((p) => { p.screeningAddon = sc; });
  }
}

export async function loadPricingSettings() {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data } = await (supabase as any).from('pricing_settings').select('*').eq('id', 'global').maybeSingle();
    applyPricingSettings(data);
  } catch { /* fall back to defaults */ }
}

export function formatEur(n: number, decimals = 2): string {
  return `€${Number(n).toFixed(decimals)}`;
}
