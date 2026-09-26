// ============================================================
// PRICING AUDIT — read-only consistency rules
// Recomputes every pricing surface (product listing, cart, checkout,
// order confirmation) from src/lib/pricing.ts and reports mismatches.
// Pure functions only: usable from tests and from the admin screen.
// ============================================================

import type { Product } from '../types/database';
import {
  getCountryPricing,
  priceProduct,
  vatForNet,
  getProductSpeeds,
  formatEur,
  type CountryPricing,
} from './pricing';
import { PRICE_SURFACES, type PriceSurfaceEntry } from './pricingAudit.surfaces';

export type FindingSeverity = 'error' | 'warning';

export type FindingKind =
  | 'service_fee'
  | 'vat_flags'
  | 'surface_parity'
  | 'hardcoded_price'
  | 'order_integrity';

export interface Finding {
  severity: FindingSeverity;
  kind: FindingKind;
  /** What the finding is about, e.g. product name or order ref */
  subject: string;
  /** Where it lives — product slug, page file, order id */
  where: string;
  expected: string;
  actual: string;
  hint: string;
  /** Optional in-app link to fix it */
  link?: string;
}

export const FINDING_LABELS: Record<FindingKind, string> = {
  service_fee: 'Wrong service fee',
  vat_flags: 'Inconsistent VAT rule',
  surface_parity: 'Cart / checkout disagreement',
  hardcoded_price: 'Hardcoded price in a page',
  order_integrity: 'Order totals do not add up',
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const eq = (a: number, b: number) => Math.abs(round2(a) - round2(b)) < 0.005;

/** Official registry certificates carry the €40 registry fee + €40 service fee.
 *  Bundles/packs are also stored with type 'certificate' but are priced as a package. */
export function isOfficialCertificate(p: Pick<Product, 'type' | 'slug'>): boolean {
  return p.type === 'certificate' && p.slug.startsWith('certificate_');
}

/** Cyprus registry certificates follow the fixed €40 + €40, VAT-on-fee rule. */
export function isCyprusCertificate(p: Pick<Product, 'type' | 'slug'> & { allowed_countries?: string[] | null; country_scope?: string | null }): boolean {
  if (!isOfficialCertificate(p)) return false;
  const ac = p.allowed_countries ?? [];
  return ac.length ? ac.includes('CY') : p.country_scope === 'cy-only';
}

export function isPack(p: Pick<Product, 'type' | 'slug'>): boolean {
  return p.type === 'certificate' && !p.slug.startsWith('certificate_');
}

// ── Rule 1: service fees ─────────────────────────────────────
export function checkServiceFees(products: Product[], pricing: CountryPricing): Finding[] {
  const out: Finding[] = [];
  for (const p of products) {
    const fee = Number(p.service_fee ?? 0);
    if (isOfficialCertificate(p) && !isCyprusCertificate(p)) continue; // other countries: fees set per country
    if (isCyprusCertificate(p)) {
      if (!eq(fee, pricing.certificateServiceFee)) {
        out.push({
          severity: 'error',
          kind: 'service_fee',
          subject: p.name,
          where: p.slug,
          expected: formatEur(pricing.certificateServiceFee),
          actual: formatEur(fee),
          hint: 'Official certificates must carry the service & delivery fee.',
          link: '/admin/products',
        });
      }
    } else if (!eq(fee, 0)) {
      out.push({
        severity: 'error',
        kind: 'service_fee',
        subject: p.name,
        where: p.slug,
        expected: formatEur(0),
        actual: formatEur(fee),
        hint: 'Reports and packs are sold at an all-in price; they should not carry a service fee.',
        link: '/admin/products',
      });
    }
  }
  return out;
}

// ── Rule 2: VAT flags ────────────────────────────────────────
export function checkVatFlags(products: Product[]): Finding[] {
  const out: Finding[] = [];
  for (const p of products) {
    const full = p.vat_on_full_price === true;
    const feeOnly = p.vat_on_fee_only === true;
    if (full === feeOnly) {
      out.push({
        severity: 'error',
        kind: 'vat_flags',
        subject: p.name,
        where: p.slug,
        expected: 'exactly one VAT rule',
        actual: full ? 'both VAT rules on' : 'no VAT rule set',
        hint: 'Set VAT either on the full price or on the service fee only.',
        link: '/admin/products',
      });
      continue;
    }
    if (isCyprusCertificate(p) && !feeOnly) {
      out.push({
        severity: 'error',
        kind: 'vat_flags',
        subject: p.name,
        where: p.slug,
        expected: 'VAT on the service fee only',
        actual: 'VAT on the full price',
        hint: 'The official registry fee is not VAT-rated; only our service fee is.',
        link: '/admin/products',
      });
    }
    if (!isCyprusCertificate(p) && feeOnly) {
      out.push({
        severity: 'error',
        kind: 'vat_flags',
        subject: p.name,
        where: p.slug,
        expected: 'VAT on the full price',
        actual: 'VAT on the service fee only',
        hint: 'Reports and packs are VAT-rated on the whole price.',
        link: '/admin/products',
      });
    }
  }
  return out;
}

// ── Rule 3: surface parity (listing vs cart vs checkout) ─────
/** How the cart stores a line (mirrors CartContext.calcPrice + vatForNet). */
function cartLine(p: Product, vatRate: number, speedCode: string) {
  const line = priceProduct(p, vatRate, speedCode);
  const price = line.net;
  return { net: price, vat: vatForNet(p, price, vatRate), total: round2(price + vatForNet(p, price, vatRate)) };
}

export function checkSurfaceParity(products: Product[], pricing: CountryPricing): Finding[] {
  const out: Finding[] = [];
  for (const p of products) {
    const speeds = getProductSpeeds(p);
    const codes = speeds.length ? speeds.map((s) => s.code) : [undefined as unknown as string];
    for (const code of codes) {
      const listing = priceProduct(p, pricing.vatRate, code);
      const cart = cartLine(p, pricing.vatRate, code ?? speeds[0]?.code);
      // Checkout sums the cart lines, so parity with the cart is what matters.
      const checkout = { net: cart.net, vat: cart.vat, total: round2(cart.net + cart.vat) };
      const mismatch =
        !eq(listing.net, cart.net) || !eq(listing.vat, cart.vat) || !eq(listing.total, checkout.total);
      if (mismatch) {
        out.push({
          severity: 'error',
          kind: 'surface_parity',
          subject: `${p.name}${code ? ` (${code})` : ''}`,
          where: p.slug,
          expected: `${formatEur(listing.net)} + ${formatEur(listing.vat)} VAT`,
          actual: `${formatEur(cart.net)} + ${formatEur(cart.vat)} VAT`,
          hint: 'The product page and the cart compute this line differently.',
          link: '/admin/products',
        });
      }
    }
  }
  return out;
}

// ── Rule 4: hardcoded prices in page text ────────────────────
export function checkHardcodedPrices(
  products: Product[],
  pricing: CountryPricing,
  surfaces: PriceSurfaceEntry[] = PRICE_SURFACES,
): Finding[] {
  const out: Finding[] = [];
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  for (const s of surfaces) {
    if (s.kind === 'config') {
      const actual = pricing[s.configKey];
      if (!eq(actual, s.shownPrice)) {
        out.push({
          severity: 'error',
          kind: 'hardcoded_price',
          subject: s.label,
          where: s.file,
          expected: formatEur(actual),
          actual: formatEur(s.shownPrice),
          hint: 'The page text disagrees with the pricing rules.',
        });
      }
      continue;
    }
    const product = bySlug.get(s.slug);
    if (!product) {
      out.push({
        severity: 'warning',
        kind: 'hardcoded_price',
        subject: s.label,
        where: s.file,
        expected: `a product with code "${s.slug}"`,
        actual: 'no such product',
        hint: 'This page advertises something that is not in the catalogue.',
      });
      continue;
    }
    if (!product.is_active) {
      out.push({
        severity: 'warning',
        kind: 'hardcoded_price',
        subject: s.label,
        where: s.file,
        expected: 'an active product',
        actual: `"${product.name}" is switched off`,
        hint: 'The page still advertises a product that is no longer for sale.',
        link: '/admin/products',
      });
    }
    const net = priceProduct(product, pricing.vatRate).net;
    if (!eq(net, s.shownPrice)) {
      out.push({
        severity: 'error',
        kind: 'hardcoded_price',
        subject: s.label,
        where: s.file,
        expected: formatEur(net),
        actual: formatEur(s.shownPrice),
        hint: `The page shows a different price than "${product.name}" costs.`,
        link: '/admin/products',
      });
    }
  }
  return out;
}

// ── Rule 5: order integrity (maths at the time of sale) ──────
export interface AuditOrder {
  id: string;
  order_ref: string | null;
  subtotal: number;
  vat_amount: number;
  total: number;
  discount_amount: number | null;
  items: { unit_price: number; vat_amount: number | null; screening_price_eur: number | null }[];
}

export function checkOrderIntegrity(orders: AuditOrder[]): Finding[] {
  const out: Finding[] = [];
  for (const o of orders) {
    const ref = o.order_ref || o.id.slice(0, 8);
    const discount = Number(o.discount_amount ?? 0);
    const expectedTotal = round2(Number(o.subtotal) + Number(o.vat_amount) - discount);
    if (!eq(expectedTotal, Number(o.total))) {
      out.push({
        severity: 'error',
        kind: 'order_integrity',
        subject: `Order ${ref}`,
        where: o.id,
        expected: formatEur(expectedTotal),
        actual: formatEur(Number(o.total)),
        hint: 'Subtotal plus VAT minus discount does not equal the charged total.',
        link: `/admin/orders/${o.id}`,
      });
    }
    if (o.items.length) {
      const lineNet = round2(
        o.items.reduce((s, i) => s + Number(i.unit_price) + Number(i.screening_price_eur ?? 0), 0),
      );
      const lineVat = round2(o.items.reduce((s, i) => s + Number(i.vat_amount ?? 0), 0));
      if (!eq(lineNet, Number(o.subtotal))) {
        out.push({
          severity: 'warning',
          kind: 'order_integrity',
          subject: `Order ${ref}`,
          where: o.id,
          expected: formatEur(lineNet),
          actual: formatEur(Number(o.subtotal)),
          hint: 'The lines on this order do not add up to its subtotal.',
          link: `/admin/orders/${o.id}`,
        });
      }
      if (!eq(lineVat, Number(o.vat_amount))) {
        out.push({
          severity: 'warning',
          kind: 'order_integrity',
          subject: `Order ${ref}`,
          where: o.id,
          expected: formatEur(lineVat),
          actual: formatEur(Number(o.vat_amount)),
          hint: 'The VAT on the lines does not add up to the order VAT.',
          link: `/admin/orders/${o.id}`,
        });
      }
    }
  }
  return out;
}

// ── Runner ───────────────────────────────────────────────────
export interface AuditInput {
  products: Product[];
  tenantSlug?: string | null;
  orders?: AuditOrder[];
  surfaces?: PriceSurfaceEntry[];
}

export function runPricingAudit(input: AuditInput): Finding[] {
  const pricing = getCountryPricing(input.tenantSlug ?? 'cy');
  const active = input.products.filter((p) => p.is_active);
  return [
    ...checkServiceFees(active, pricing),
    ...checkVatFlags(active),
    ...checkSurfaceParity(active, pricing),
    ...checkHardcodedPrices(input.products, pricing, input.surfaces),
    ...checkOrderIntegrity(input.orders ?? []),
  ];
}
