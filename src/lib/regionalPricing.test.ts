import { describe, it, expect } from 'vitest';
import { applyRegionalPricing, isRegionallyAvailable, getZoneTerms } from './regionalPricing';

const p = (slug: string) => ({ slug, base_price: 1, delivery_sla_hours: 0, is_instant: true }) as any;

describe('regional pricing', () => {
  it('credit report is €150 in Middle East, €130 in Western Europe, €70 cost offshore', () => {
    expect(applyRegionalPricing(p('global-credit-report'), 'AE').base_price).toBe(150);
    expect(applyRegionalPricing(p('global-credit-report'), 'GR').base_price).toBe(130);
    expect(getZoneTerms('KY').creditCost).toBe(70);
  });
  it('profile report is €65 and unavailable in BM, BS, KY, VG', () => {
    expect(applyRegionalPricing(p('global-structure-report'), 'US').base_price).toBe(65);
    for (const c of ['BM', 'BS', 'KY', 'VG']) expect(isRegionallyAvailable(p('global-structure-report'), c)).toBe(false);
  });
  it('due diligence is €750 everywhere', () => {
    expect(applyRegionalPricing(p('edd-report'), 'BR').base_price).toBe(750);
  });
});
