// ============================================================
// Per-tenant configuration: VAT, hero copy, content localization,
// product catalogue visibility.
//
// Tenant slugs in this project:
//   'cy'  → Cyprus (Companies House Cyprus)
//   'gr'  → Greece
//   'mt'  → Malta
//   'ro'  → Romania
//   'ae'  → UAE / Dubai
//   'icw' → Infocredit World (global)
// ============================================================

import type { ProductContent, TabDef } from '../data/productContent';

// ── VAT ────────────────────────────────────────────────────────
// Per business decision: 19% only on Cyprus, 0% everywhere else
// (Cyprus entity invoices all customers, but cross-border B2C/EU rules
// are handled outside the storefront for now).
export function getVatRate(tenantSlug?: string | null): number {
  if (tenantSlug === 'cy') return 0.19;
  return 0;
}

// ── Country names per tenant slug ─────────────────────────────
const COUNTRY_NAMES: Record<string, { name: string; adjective: string }> = {
  cy: { name: 'Cyprus', adjective: 'Cypriot' },
  gr: { name: 'Greece', adjective: 'Greek' },
  mt: { name: 'Malta', adjective: 'Maltese' },
  ro: { name: 'Romania', adjective: 'Romanian' },
  ae: { name: 'the UAE', adjective: 'UAE' },
};

// ── Hero / brand copy ─────────────────────────────────────────
export interface TenantHero {
  badge?: string;
  h1: string;
  subtitle: string;
  productLandingHeroH1: string;
  productLandingHeroSubtitle: string;
  typingWords: string[];
  metaTitleSuffix: string; // e.g. "Companies House Cyprus" or "Infocredit World"
}

export function getTenantHero(
  tenantSlug?: string | null,
  brandName?: string | null,
): TenantHero {
  const slug = tenantSlug ?? '';
  const country = COUNTRY_NAMES[slug];
  const titleSuffix = brandName ?? 'Companies House';

  if (slug === 'icw') {
    return {
      badge: '200+ Countries · Instant · Pay-Per-Report',
      h1: 'Global company intelligence, on demand.',
      subtitle:
        'Instant KYB and company reports across 200+ jurisdictions. No subscription, no sales call — pay only for the report you need.',
      productLandingHeroH1: 'Global Company Intelligence',
      productLandingHeroSubtitle:
        'Instant company reports, KYB intelligence and compliance screening across 200+ jurisdictions.',
      typingWords: [
        'Unlocking',
        'Global KYB Report',
        'Global Structure',
        'UK Company Report',
        'Compliance Screening',
      ],
      metaTitleSuffix: titleSuffix,
    };
  }

  if (country) {
    return {
      h1: `Search and Verify ${country.name} Companies`,
      subtitle:
        'Instant access to official registry data, structure reports, KYB intelligence and official certificates',
      productLandingHeroH1: `Company Insights in ${country.name}`,
      productLandingHeroSubtitle: `Explore comprehensive company structure and ownership information in ${country.name}. Ensure invoicing accuracy and secure your business future.`,
      typingWords: [
        'Unlocking',
        'Structure Report',
        'Credit Report',
        'Due Diligence',
        'Certificates',
      ],
      metaTitleSuffix: titleSuffix,
    };
  }

  // Fallback (no tenant resolved yet)
  return {
    h1: 'Search and Verify Companies',
    subtitle: 'Instant access to official registry data and company intelligence.',
    productLandingHeroH1: 'Company Intelligence',
    productLandingHeroSubtitle:
      'Comprehensive company structure, ownership and compliance reports.',
    typingWords: ['Unlocking', 'Company Reports', 'KYB Intelligence'],
    metaTitleSuffix: titleSuffix,
  };
}

// ── Localize Cyprus-specific copy for other countries ─────────
// Cheap text replacement so we don't have to maintain 6 copies of every
// description. For 'cy' returns content unchanged.
export function localizeContent(
  content: ProductContent,
  tenantSlug?: string | null,
): ProductContent {
  const slug = tenantSlug ?? '';
  if (slug === 'cy' || !slug) return content;

  // For ICW (global) and other countries, neutralize Cyprus references.
  const country = COUNTRY_NAMES[slug];
  const countryName = country?.name ?? 'the company\'s jurisdiction';
  const adjective = country?.adjective ?? '';

  const replace = (s: string): string => {
    let out = s;
    // Order matters — most specific first
    out = out.replace(/Companieshousecyprus\.com/gi, 'Our team');
    out = out.replace(/Department of Registrar of Companies and Official Receiver/gi, 'the local company registry');
    out = out.replace(/Department of Registrar of Companies/gi, 'the local company registry');
    out = out.replace(/registered in Cyprus/gi, `registered in ${countryName}`);
    out = out.replace(/Cypriot company/gi, adjective ? `${adjective} company` : 'company');
    out = out.replace(/Cypriot legal entity/gi, adjective ? `${adjective} legal entity` : 'legal entity');
    out = out.replace(/Cypriot/gi, adjective || '');
    out = out.replace(/in Cyprus/gi, `in ${countryName}`);
    out = out.replace(/Cyprus companies/gi, `${countryName} companies`);
    out = out.replace(/Cyprus company/gi, `${countryName} company`);
    out = out.replace(/Cyprus/gi, countryName);
    // Tidy double spaces left from empty replacements
    out = out.replace(/\s{2,}/g, ' ').trim();
    return out;
  };

  return {
    description: content.description.map(replace),
    sectionHeading: replace(content.sectionHeading),
    accordionItems: content.accordionItems.map((it) => ({
      title: replace(it.title),
      body: replace(it.body),
    })),
    deliveryNote: replace(content.deliveryNote),
  };
}

// ── Product catalogue visibility per tenant ───────────────────
// Cyprus-only certificate slugs (issued by the Cyprus Registrar)
const CYPRUS_ONLY_SLUGS = new Set([
  'certificate_of_director',
  'certificate_shareholder',
  'certificate_incorporation',
  'certificate_registered_address',
  'certificate_good_standing',
  'certificate_memorandum',
  'certificate_bankruptcy',
  'certificate_change_name',
  'certificate_share_capital',
  'certificate_historic',
]);

// Slugs that only make sense for the global tenant
const GLOBAL_ONLY_SLUGS = new Set([
  'global-structure-report',
  'global-kyb-report',
]);

export function filterTabsForTenant(tabs: TabDef[], tenantSlug?: string | null): TabDef[] {
  const slug = tenantSlug ?? 'cy';
  if (slug === 'cy') {
    // Cyprus shows everything except the bare global-* duplicates
    return tabs.filter((t) => !GLOBAL_ONLY_SLUGS.has(t.slug));
  }
  if (slug === 'icw') {
    // Global: hide Cyprus-only certs; lead with global products
    const filtered = tabs.filter((t) => !CYPRUS_ONLY_SLUGS.has(t.slug));
    // Re-order: globals first
    return filtered.sort((a, b) => {
      const aGlobal = GLOBAL_ONLY_SLUGS.has(a.slug) ? 0 : 1;
      const bGlobal = GLOBAL_ONLY_SLUGS.has(b.slug) ? 0 : 1;
      return aGlobal - bGlobal;
    });
  }
  // Other countries: hide Cyprus-only certs and global-only too
  return tabs.filter(
    (t) => !CYPRUS_ONLY_SLUGS.has(t.slug) && !GLOBAL_ONLY_SLUGS.has(t.slug),
  );
}

export function isCyprusTenant(tenantSlug?: string | null): boolean {
  return tenantSlug === 'cy';
}

export function isGlobalTenant(tenantSlug?: string | null): boolean {
  return tenantSlug === 'icw';
}
