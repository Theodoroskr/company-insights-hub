// Regional retail prices (SRP), supplier costs and delivery terms for the
// global reports (Profile/Structure, Credit, Due Diligence), keyed by the
// subject company's country. Cyprus/UK own-registry products are untouched.
import type { Product } from '../types/database';

export type PricingZone =
  | 'middle_east' | 'western_europe' | 'eastern_europe' | 'asia' | 'pacific'
  | 'australia' | 'africa' | 'americas' | 'brazil' | 'caribbean' | 'bermuda' | 'offshore';

export interface ZoneTerms {
  label: string;
  creditCost: number; creditSrp: number;
  /** null = Profile report not available in this zone */
  profileCost: number | null; profileSrp: number | null;
  ddSrp: number;
  /** Delivery terms in hours (0 = instant) */
  profileSlaHours: number; creditSlaHours: number; ddSlaHours: number;
}

const STD = { profileCost: 15, profileSrp: 65, ddSrp: 750, profileSlaHours: 0, ddSlaHours: 168 };

export const ZONES: Record<PricingZone, ZoneTerms> = {
  middle_east:    { label: 'Middle East', creditCost: 25, creditSrp: 150, ...STD, creditSlaHours: 120 },
  western_europe: { label: 'Western Europe & Turkey', creditCost: 28, creditSrp: 130, ...STD, creditSlaHours: 48 },
  eastern_europe: { label: 'Eastern Europe', creditCost: 35, creditSrp: 130, ...STD, creditSlaHours: 48 },
  asia:           { label: 'Asia', creditCost: 37, creditSrp: 150, ...STD, creditSlaHours: 120 },
  pacific:        { label: 'Pacific (excl. Australia)', creditCost: 40, creditSrp: 130, ...STD, creditSlaHours: 48 },
  australia:      { label: 'Australia', creditCost: 45, creditSrp: 130, ...STD, creditSlaHours: 48 },
  africa:         { label: 'Africa', creditCost: 45, creditSrp: 150, ...STD, creditSlaHours: 120 },
  americas:       { label: 'Americas', creditCost: 35, creditSrp: 130, ...STD, creditSlaHours: 48 },
  brazil:         { label: 'Brazil', creditCost: 25, creditSrp: 130, ...STD, creditSlaHours: 48 },
  caribbean:      { label: 'Caribbean', creditCost: 45, creditSrp: 130, ...STD, creditSlaHours: 120 },
  bermuda:        { label: 'Bermuda', creditCost: 45, creditSrp: 130, ...STD, profileCost: null, profileSrp: null, creditSlaHours: 120 },
  offshore:       { label: 'Bahamas, Cayman Islands & BVI', creditCost: 70, creditSrp: 150, ...STD, profileCost: null, profileSrp: null, creditSlaHours: 120 },
};

const list = (s: string) => s.split(' ');
const BY_CODE: Record<string, PricingZone> = {};
const put = (zone: PricingZone, codes: string) => list(codes).forEach((c) => (BY_CODE[c] = zone));

put('western_europe', 'GB UK GR MT TR CY IE FR DE NL BE LU AT CH LI IT ES PT AD MC SM VA DK SE NO FI IS GI IM JE GG FO');
put('eastern_europe', 'PL CZ SK HU RO BG HR SI RS BA ME MK AL XK MD UA BY RU EE LV LT GE AM AZ');
put('middle_east', 'AE SA QA KW BH OM YE IQ IR IL PS JO LB SY');
put('africa', 'DZ AO BJ BW BF BI CM CV CF TD KM CG CD CI DJ EG GQ ER SZ ET GA GM GH GN GW KE LS LR LY MG MW ML MR MU MA MZ NA NE NG RW ST SN SC SL SO ZA SS SD TZ TG TN UG ZM ZW');
put('australia', 'AU');
put('pacific', 'NZ FJ PG SB VU WS TO KI TV NR FM MH PW NC PF CK');
put('brazil', 'BR');
put('bermuda', 'BM');
put('offshore', 'BS KY VG');
put('caribbean', 'JM BB TT DO HT CU AG DM GD KN LC VC AW CW SX BQ TC AI MS PR VI GP MQ BL MF');
put('americas', 'US CA MX GT BZ SV HN NI CR PA CO VE EC PE BO PY UY AR CL GY SR');

/** Unknown countries fall back to Asia (all remaining ISO codes are Asian). */
export function getPricingZone(countryCode?: string | null): PricingZone {
  return BY_CODE[(countryCode ?? '').toUpperCase()] ?? 'asia';
}

export function getZoneTerms(countryCode?: string | null): ZoneTerms {
  return ZONES[getPricingZone(countryCode)];
}

type Kind = 'profile' | 'credit' | 'dd';
const KIND_BY_SLUG: Record<string, Kind> = {
  'global-structure-report': 'profile',
  'global-credit-report': 'credit',
  'global-kyb-report': 'credit',
  'edd-report': 'dd',
};

export function regionalKind(slug?: string | null): Kind | null {
  return (slug && KIND_BY_SLUG[slug]) || null;
}

/** False when the product cannot be ordered for this country (Profile in BM/BS/KY/VG). */
export function isRegionallyAvailable(product: Pick<Product, 'slug'>, countryCode?: string | null): boolean {
  if (!countryCode || regionalKind(product.slug) !== 'profile') return true;
  return getZoneTerms(countryCode).profileSrp !== null;
}

/** Returns the product with regional price and delivery terms applied (unchanged for non-global products). */
export function applyRegionalPricing<T extends Product>(product: T, countryCode?: string | null): T {
  const kind = regionalKind(product.slug);
  if (!kind || !countryCode) return product;
  const z = getZoneTerms(countryCode);
  const price = kind === 'profile' ? z.profileSrp : kind === 'credit' ? z.creditSrp : z.ddSrp;
  if (price === null) return product;
  const sla = kind === 'profile' ? z.profileSlaHours : kind === 'credit' ? z.creditSlaHours : z.ddSlaHours;
  return { ...product, base_price: price, delivery_sla_hours: sla, is_instant: sla === 0 };
}

/** Apply regional terms to a catalogue and drop products unavailable for the country. */
export function regionalCatalogue<T extends Product>(products: T[], countryCode?: string | null): T[] {
  return products.filter((p) => isRegionallyAvailable(p, countryCode)).map((p) => applyRegionalPricing(p, countryCode));
}
