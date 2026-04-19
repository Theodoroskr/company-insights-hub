import { describe, it, expect } from 'vitest';
import { isProductVisibleForTenant } from './tenantConfig';

describe('isProductVisibleForTenant', () => {
  describe('global products', () => {
    it('shows on every country tenant', () => {
      const product = { country_scope: 'global' };
      expect(isProductVisibleForTenant(product, 'CY')).toBe(true);
      expect(isProductVisibleForTenant(product, 'GB')).toBe(true);
      expect(isProductVisibleForTenant(product, 'AE')).toBe(true);
    });

    it('shows on Infocredit World (no country_code)', () => {
      expect(isProductVisibleForTenant({ country_scope: 'global' }, null)).toBe(true);
      expect(isProductVisibleForTenant({ country_scope: 'global' }, undefined)).toBe(true);
    });

    it('treats missing scope as global', () => {
      expect(isProductVisibleForTenant({}, 'CY')).toBe(true);
      expect(isProductVisibleForTenant({ country_scope: null }, null)).toBe(true);
    });
  });

  describe('cy-only products', () => {
    const product = { country_scope: 'cy-only', allowed_countries: ['CY'] };

    it('shows on Cyprus tenant', () => {
      expect(isProductVisibleForTenant(product, 'CY')).toBe(true);
      expect(isProductVisibleForTenant(product, 'cy')).toBe(true); // case-insensitive
    });

    it('hides on Infocredit World (no country_code)', () => {
      expect(isProductVisibleForTenant(product, null)).toBe(false);
      expect(isProductVisibleForTenant(product, undefined)).toBe(false);
    });

    it('hides on other country tenants', () => {
      expect(isProductVisibleForTenant(product, 'GR')).toBe(false);
      expect(isProductVisibleForTenant(product, 'GB')).toBe(false);
      expect(isProductVisibleForTenant(product, 'AE')).toBe(false);
    });
  });

  describe('uk-only products', () => {
    const product = { country_scope: 'uk-only', allowed_countries: ['GB'] };

    it('shows on GB and UK', () => {
      expect(isProductVisibleForTenant(product, 'GB')).toBe(true);
      expect(isProductVisibleForTenant(product, 'UK')).toBe(true);
    });

    it('hides elsewhere', () => {
      expect(isProductVisibleForTenant(product, 'CY')).toBe(false);
      expect(isProductVisibleForTenant(product, null)).toBe(false);
    });
  });

  describe('eu-only products', () => {
    const product = { country_scope: 'eu-only' };

    it('shows on EU member states', () => {
      expect(isProductVisibleForTenant(product, 'CY')).toBe(true);
      expect(isProductVisibleForTenant(product, 'DE')).toBe(true);
      expect(isProductVisibleForTenant(product, 'MT')).toBe(true);
    });

    it('hides on non-EU countries', () => {
      expect(isProductVisibleForTenant(product, 'GB')).toBe(false);
      expect(isProductVisibleForTenant(product, 'AE')).toBe(false);
      expect(isProductVisibleForTenant(product, null)).toBe(false);
    });
  });

  describe('custom scope with allowed_countries array', () => {
    it('matches when tenant country is in the array', () => {
      const product = { country_scope: 'custom', allowed_countries: ['CY', 'GR', 'MT'] };
      expect(isProductVisibleForTenant(product, 'CY')).toBe(true);
      expect(isProductVisibleForTenant(product, 'GR')).toBe(true);
      expect(isProductVisibleForTenant(product, 'MT')).toBe(true);
    });

    it('rejects when tenant country is not in the array', () => {
      const product = { country_scope: 'custom', allowed_countries: ['CY', 'GR'] };
      expect(isProductVisibleForTenant(product, 'GB')).toBe(false);
      expect(isProductVisibleForTenant(product, 'AE')).toBe(false);
    });

    it('handles lowercase array entries (case-insensitive)', () => {
      const product = { country_scope: 'custom', allowed_countries: ['cy', 'gr'] };
      expect(isProductVisibleForTenant(product, 'CY')).toBe(true);
      expect(isProductVisibleForTenant(product, 'GR')).toBe(true);
    });

    it('hides when allowed_countries is empty or missing', () => {
      expect(isProductVisibleForTenant({ country_scope: 'custom', allowed_countries: [] }, 'CY')).toBe(false);
      expect(isProductVisibleForTenant({ country_scope: 'custom' }, 'CY')).toBe(false);
      expect(isProductVisibleForTenant({ country_scope: 'custom', allowed_countries: null }, 'CY')).toBe(false);
    });
  });

  describe('unknown scope tags', () => {
    it('falls back to allowed_countries match when present', () => {
      const product = { country_scope: 'middle-east-only', allowed_countries: ['AE', 'SA'] };
      expect(isProductVisibleForTenant(product, 'AE')).toBe(true);
      expect(isProductVisibleForTenant(product, 'CY')).toBe(false);
    });

    it('hides when no allowed_countries provided', () => {
      expect(isProductVisibleForTenant({ country_scope: 'unknown-tag' }, 'CY')).toBe(false);
    });
  });
});
