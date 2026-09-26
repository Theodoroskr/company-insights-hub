import { useEffect, useState } from 'react';
import { api4all } from '@/lib/api4all/client';

/** Report code → last archived date ('' = none). Cached per company for the session. */
type DatesMap = Record<string, string>;
const cache = new Map<string, Promise<DatesMap>>();

function loadDates(icgCode: string): Promise<DatesMap> {
  let p = cache.get(icgCode);
  if (!p) {
    p = api4all
      .getReportDates(icgCode)
      .then((res) => {
        const map: DatesMap = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const r of ((res as any)?.reports ?? []) as { code?: string | number; date?: string }[]) {
          if (r.code != null) map[String(r.code)] = r.date ?? '';
        }
        return map;
      })
      .catch(() => {
        cache.delete(icgCode);
        return {};
      });
    cache.set(icgCode, p);
  }
  return p;
}

/** Fetches API4ALL archive dates for a company. Skipped for UK (Companies House is live). */
export function useReportDates(icgCode: string | null | undefined, countryCode: string | null | undefined) {
  const skip = !icgCode || (countryCode ?? '').toUpperCase() === 'GB';
  const [dates, setDates] = useState<DatesMap | null>(null);
  useEffect(() => {
    if (skip) { setDates(null); return; }
    let alive = true;
    loadDates(icgCode!).then((d) => alive && setDates(d));
    return () => { alive = false; };
  }, [icgCode, skip]);
  return dates;
}

export type Availability =
  | { kind: 'instant' }
  | { kind: 'archive'; date: string }
  | { kind: 'on_update' }
  | null;

interface ProductLike { is_instant?: boolean | null; api4all_product_code?: string | null }

/**
 * Per-country rule: products flagged instant (e.g. UK Company Report from the live
 * Companies House feed) are always instant; API4ALL products depend on whether an
 * archived copy exists for this company; anything else keeps its catalogue SLA (null).
 */
export function getAvailability(product: ProductLike, dates: DatesMap | null): Availability {
  const code = product.api4all_product_code;
  // API4ALL products are only instant when an archived copy exists — the catalogue
  // is_instant flag applies to live feeds (e.g. Companies House UK) only.
  if (!code) return product.is_instant ? { kind: 'instant' } : null;
  if (!dates) return null;
  const date = dates[String(code)];
  return date ? { kind: 'archive', date } : { kind: 'on_update' };
}

export function formatArchiveDate(d: string): string {
  const parsed = new Date(d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : d);
  return isNaN(parsed.getTime()) ? d : parsed.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

export const URGENT_LABEL = 'Urgent · 24–48 hours';
