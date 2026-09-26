import { describe, it, expect } from 'vitest';
import {
  checkServiceFees,
  checkVatFlags,
  checkSurfaceParity,
  checkHardcodedPrices,
  checkOrderIntegrity,
  runPricingAudit,
  type AuditOrder,
} from './pricingAudit';
import { PRICE_SURFACES } from './pricingAudit.surfaces';
import { getCountryPricing } from './pricing';
import type { Product } from '../types/database';

const cy = getCountryPricing('cy');

const product = (over: Partial<Product>): Product =>
  ({
    id: over.slug ?? 'p',
    tenant_id: null,
    name: over.name ?? 'Test product',
    slug: 'test-product',
    api4all_product_code: null,
    type: 'kyb',
    description: null,
    what_is_included: [],
    base_price: 100,
    service_fee: 0,
    vat_on_full_price: true,
    vat_on_fee_only: false,
    is_instant: true,
    delivery_sla_hours: 24,
    available_speeds: [],
    sample_pdf_url: null,
    product_image_url: null,
    display_order: 1,
    is_active: true,
    created_at: '',
    ...over,
  }) as Product;

const officialCert = (over: Partial<Product> = {}) =>
  product({
    slug: 'certificate_incorporation',
    name: 'Certificate of Incorporation',
    type: 'certificate',
    country_scope: 'cy-only',
    allowed_countries: ['CY'],
    base_price: 40,
    service_fee: 40,
    vat_on_full_price: false,
    vat_on_fee_only: true,
    ...over,
  });

describe('pricing audit — service fees', () => {
  it('accepts a certificate with the standard service fee', () => {
    expect(checkServiceFees([officialCert()], cy)).toHaveLength(0);
  });
  it('flags a certificate missing its service fee', () => {
    const f = checkServiceFees([officialCert({ service_fee: 0 })], cy);
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ kind: 'service_fee', expected: '€40.00', actual: '€0.00' });
  });
  it('flags a report that wrongly carries a service fee', () => {
    const f = checkServiceFees([product({ service_fee: 15 })], cy);
    expect(f[0]).toMatchObject({ kind: 'service_fee', expected: '€0.00', actual: '€15.00' });
  });
});

describe('pricing audit — non-Cyprus certificates', () => {
  it('does not force the Cyprus €40 fee on other countries', () => {
    const uk = officialCert({ slug: 'certificate_uk_good_standing', allowed_countries: ['GB'], country_scope: 'uk-only', service_fee: 25, vat_on_fee_only: false, vat_on_full_price: true });
    expect(checkServiceFees([uk], cy)).toHaveLength(0);
    expect(checkVatFlags([uk])).toHaveLength(0);
  });
});

describe('pricing audit — VAT flags', () => {
  it('accepts correct flags', () => {
    expect(checkVatFlags([officialCert(), product({})])).toHaveLength(0);
  });
  it('flags both rules set at once', () => {
    const f = checkVatFlags([product({ vat_on_fee_only: true, vat_on_full_price: true })]);
    expect(f[0]).toMatchObject({ kind: 'vat_flags', actual: 'both VAT rules on' });
  });
  it('flags a certificate charged VAT on the full price', () => {
    const f = checkVatFlags([officialCert({ vat_on_fee_only: false, vat_on_full_price: true })]);
    expect(f[0]).toMatchObject({ kind: 'vat_flags', expected: 'VAT on the service fee only' });
  });
});

describe('pricing audit — surface parity', () => {
  it('product page, cart and checkout agree for every speed', () => {
    const p = product({
      available_speeds: [
        { label: 'Normal', code: 'N', price_delta: 0, sla_hours: 24 },
        { label: 'Express', code: 'X', price_delta: 50, sla_hours: 4 },
      ],
    });
    expect(checkSurfaceParity([p, officialCert()], cy)).toHaveLength(0);
  });
});

describe('pricing audit — hardcoded page prices', () => {
  const catalogue = [product({ slug: 'global-credit-report', base_price: 150 })];
  it('accepts a page price that matches the product', () => {
    const f = checkHardcodedPrices(catalogue, cy, [
      { kind: 'product', file: 'x.tsx', label: 'x', slug: 'global-credit-report', shownPrice: 150 },
    ]);
    expect(f).toHaveLength(0);
  });
  it('flags a stale page price', () => {
    const f = checkHardcodedPrices(catalogue, cy, [
      { kind: 'product', file: 'x.tsx', label: 'x', slug: 'global-credit-report', shownPrice: 129 },
    ]);
    expect(f[0]).toMatchObject({ kind: 'hardcoded_price', expected: '€150.00', actual: '€129.00' });
  });
  it('warns when the page advertises a product that does not exist', () => {
    const f = checkHardcodedPrices(catalogue, cy, [
      { kind: 'product', file: 'x.tsx', label: 'x', slug: 'nope', shownPrice: 10 },
    ]);
    expect(f[0]).toMatchObject({ severity: 'warning', actual: 'no such product' });
  });
  it('flags a fee written into page text that differs from the pricing rules', () => {
    const f = checkHardcodedPrices(catalogue, cy, [
      { kind: 'config', file: 'x.tsx', label: 'x', configKey: 'certificateServiceFee', shownPrice: 15 },
    ]);
    expect(f[0]).toMatchObject({ expected: '€40.00', actual: '€15.00' });
  });
});

describe('pricing audit — order integrity', () => {
  const base: AuditOrder = {
    id: 'o1',
    order_ref: 'ICG-1',
    subtotal: 100,
    vat_amount: 19,
    total: 119,
    discount_amount: 0,
    items: [{ unit_price: 100, vat_amount: 19, screening_price_eur: 0 }],
  };
  it('accepts an order whose maths adds up', () => {
    expect(checkOrderIntegrity([base])).toHaveLength(0);
  });
  it('flags a wrong charged total', () => {
    const f = checkOrderIntegrity([{ ...base, total: 130 }]);
    expect(f[0]).toMatchObject({ kind: 'order_integrity', expected: '€119.00', actual: '€130.00' });
  });
  it('ignores later price changes — only stored values are compared', () => {
    const f = checkOrderIntegrity([
      { ...base, subtotal: 30, vat_amount: 5.7, total: 35.7, items: [{ unit_price: 30, vat_amount: 5.7, screening_price_eur: 0 }] },
    ]);
    expect(f).toHaveLength(0);
  });
});

describe('pricing audit — registry sanity', () => {
  it('every registered page price is positive and attributed to a file', () => {
    for (const s of PRICE_SURFACES) {
      expect(s.shownPrice).toBeGreaterThan(0);
      expect(s.file).toMatch(/^src\//);
    }
  });
  it('a clean catalogue produces no errors', () => {
    const findings = runPricingAudit({
      products: [officialCert(), product({ slug: 'global-credit-report', base_price: 150 })],
      tenantSlug: 'cy',
      surfaces: [
        { kind: 'config', file: 'src/x.tsx', label: 'fee', configKey: 'certificateServiceFee', shownPrice: 40 },
        { kind: 'product', file: 'src/x.tsx', label: 'credit', slug: 'global-credit-report', shownPrice: 150 },
      ],
    });
    expect(findings.filter((f) => f.severity === 'error')).toHaveLength(0);
  });
});
