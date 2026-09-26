import { describe, it, expect } from 'vitest';
import { priceProduct, priceCertificateOrder, getCountryPricing, vatForNet } from './pricing';

describe('pricing', () => {
  it('Cyprus VAT 19%, others 0', () => {
    expect(getCountryPricing('cy').vatRate).toBe(0.19);
    expect(getCountryPricing('icw').vatRate).toBe(0);
  });
  it('report: base + speed delta, VAT on full', () => {
    const p = { base_price: 150, service_fee: 0, vat_on_full_price: true, available_speeds: [{ code: 'N', price_delta: 0 }, { code: 'X', price_delta: 50 }] } as any;
    expect(priceProduct(p, 0.19)).toMatchObject({ net: 150, vat: 28.5, total: 178.5 });
    expect(priceProduct(p, 0.19, 'X').net).toBe(200);
  });
  it('certificate: 40 + 40 fee, VAT on fee only', () => {
    const c = { base_price: 40, service_fee: 40, vat_on_fee_only: true, vat_on_full_price: false } as any;
    expect(priceProduct(c, 0.19)).toMatchObject({ net: 80, vat: 7.6 });
    expect(vatForNet({ base_price: 1, vat_on_full_price: false } as any, 100, 0.19)).toBe(0);
  });
  it('certificate order uses each certificate price', () => {
    const t = priceCertificateOrder({ certificates: [{ price: 40, apostille: false }, { price: 70, apostille: true }], urgentDelivery: false, courierDelivery: false }, getCountryPricing('cy'));
    expect(t.subtotal).toBe(40 + 70 + 80 + 100);
  });
});
