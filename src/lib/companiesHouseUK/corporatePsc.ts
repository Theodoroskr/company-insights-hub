import { supabase } from '@/integrations/supabase/client';

export interface RawPscLike {
  name?: string;
  kind?: string;
  ceased_on?: string;
  ceased?: boolean;
  natures_of_control?: string[];
  identification?: {
    registration_number?: string;
    legal_form?: string;
    country_registered?: string;
    place_registered?: string;
  };
}

export interface CorporatePsc {
  /** Name exactly as filed at Companies House */
  sourceName: string;
  name: string;
  regNo: string;
  naturesOfControl: string[];
  ceased: boolean;
  /** Profile slug when the entity already exists in our index, otherwise null */
  slug: string | null;
  companyId: string | null;
}

/** Companies House UK company numbers are 8 characters, zero padded when numeric. */
export function normaliseUkCompanyNumber(value?: string): string | null {
  if (!value) return null;
  const trimmed = value.trim().toUpperCase();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return trimmed.padStart(8, '0');
  return trimmed;
}

export function isCorporatePsc(p: RawPscLike): boolean {
  return (p.kind ?? '').includes('corporate-entity');
}

/**
 * Resolve corporate PSC owners (parent companies) to profiles in our index.
 * Entities not yet indexed come back with slug === null so the caller can fall
 * back to a registry search link.
 */
export async function resolveCorporatePscs(
  items: RawPscLike[],
  tenantId?: string,
): Promise<CorporatePsc[]> {
  const corporates = items.filter(isCorporatePsc);
  if (corporates.length === 0) return [];

  const entries: CorporatePsc[] = corporates.map((p) => ({
    sourceName: p.name ?? '—',
    name: p.name ?? '—',
    regNo: normaliseUkCompanyNumber(p.identification?.registration_number) ?? '',
    naturesOfControl: p.natures_of_control ?? [],
    ceased: !!p.ceased_on || p.ceased === true,
    slug: null,
    companyId: null,
  }));

  const regNos = entries.map((e) => e.regNo).filter(Boolean);
  if (regNos.length === 0) return entries;

  let query = supabase
    .from('companies')
    .select('id, name, slug, reg_no')
    .eq('country_code', 'GB')
    .in('reg_no', regNos);
  if (tenantId) query = query.eq('tenant_id', tenantId);

  const { data } = await query;
  if (!data) return entries;

  const bySlug = new Map(data.map((c) => [c.reg_no ?? '', c]));
  for (const entry of entries) {
    const match = bySlug.get(entry.regNo);
    if (match) {
      entry.slug = match.slug ?? match.id;
      entry.companyId = match.id;
      if (match.name) entry.name = match.name;
    }
  }
  return entries;
}

/** Where a corporate PSC card should navigate to. */
export function corporatePscHref(entry: CorporatePsc): string {
  if (entry.slug) return `/company/${entry.slug}`;
  const q = entry.regNo || entry.name;
  return `/company/search?country=gb&q=${encodeURIComponent(q)}`;
}
