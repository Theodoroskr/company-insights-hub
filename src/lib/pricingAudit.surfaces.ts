// ============================================================
// Registry of prices that are written directly into page text.
// Every hardcoded price on a customer-facing page must be listed here so the
// pricing audit can compare it with the catalogue / pricing rules.
// ============================================================

import type { CountryPricing } from './pricing';

interface BaseEntry {
  /** File the price is written in */
  file: string;
  /** Human label shown in the audit */
  label: string;
  /** Price as it appears on the page, EUR ex VAT */
  shownPrice: number;
}

export interface ProductSurfaceEntry extends BaseEntry {
  kind: 'product';
  /** Product code the text refers to */
  slug: string;
}

export interface ConfigSurfaceEntry extends BaseEntry {
  kind: 'config';
  /** Pricing-rule value the text refers to */
  configKey: keyof Omit<CountryPricing, 'vatRate'>;
}

export type PriceSurfaceEntry = ProductSurfaceEntry | ConfigSurfaceEntry;

export const PRICE_SURFACES: PriceSurfaceEntry[] = [
  {
    kind: 'config',
    file: 'src/pages/PricingPage.tsx',
    label: 'Pricing page — "Official Certificates — €40 each"',
    configKey: 'certificateFee',
    shownPrice: 40,
  },
  {
    kind: 'config',
    file: 'src/pages/HomePage.tsx',
    label: 'Home page — certificate registry fee',
    configKey: 'certificateFee',
    shownPrice: 40,
  },
  {
    kind: 'config',
    file: 'src/pages/HomePage.tsx',
    label: 'Home page — certificate service & delivery fee',
    configKey: 'certificateServiceFee',
    shownPrice: 40,
  },
  {
    kind: 'product',
    file: 'src/pages/CertificatesPage.tsx',
    label: 'Certificates page — "Add Cyprus Company Profile"',
    slug: 'cyprus-structure-report',
    shownPrice: 65,
  },
  {
    kind: 'product',
    file: 'src/pages/CountryDashboardPage.tsx',
    label: 'Country dashboard — Global Structure Report',
    slug: 'global-structure-report',
    shownPrice: 49,
  },
  {
    kind: 'product',
    file: 'src/pages/CountryDashboardPage.tsx',
    label: 'Country dashboard — Global Credit Report',
    slug: 'global-credit-report',
    shownPrice: 150,
  },
];
