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
  return withVat(base, serviceFee, product, vatRate);

  function withVat(b: number, f: number, p: PricedProduct, rate: number): LinePrice {
    const taxable = p.vat_on_fee_only ? f : p.vat_on_full_price === false ? 0 : net;
    const vat = round2(taxable * rate);
    return { base: round2(b), serviceFee: round2(f), net: round2(net), vat, total: round2(net + vat) };
  }
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

export function formatEur(n: number, decimals = 2): string {
  return `€${Number(n).toFixed(decimals)}`;
}
