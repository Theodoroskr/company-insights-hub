// ============================================================
// useTenantSites — loads all active tenant sites (slug, brand,
// domain) once per session and builds cross-site navigation URLs.
// Production: absolute https://<domain> links.
// Preview/localhost: ?tenant=<slug> override (persisted by
// TenantProvider's resolveFallbackSlug).
// ============================================================

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getTenantLocale } from '@/lib/tenantConfig';

export interface TenantSite {
  slug: string;
  brandName: string;
  domain: string;
  flag: string;
}

export function isPreviewHost(): boolean {
  const h = window.location.hostname;
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h.endsWith('.lovable.app') ||
    h.endsWith('.lovableproject.com')
  );
}

export function getTenantSiteUrl(site: TenantSite): string {
  if (isPreviewHost()) {
    const url = new URL(window.location.href);
    url.searchParams.set('tenant', site.slug);
    return url.toString();
  }
  return `https://${site.domain}`;
}

// Module-level cache so every component shares one fetch.
let cachedSites: TenantSite[] | null = null;
let inflight: Promise<TenantSite[]> | null = null;

async function loadSites(): Promise<TenantSite[]> {
  if (cachedSites) return cachedSites;
  if (!inflight) {
    inflight = supabase
      .from('tenants')
      .select('slug, brand_name, domain')
      .eq('is_active', true)
      .order('slug', { ascending: true })
      .then(({ data }) => {
        const sites: TenantSite[] = (data ?? []).map((t) => ({
          slug: t.slug as string,
          brandName: (t.brand_name as string) ?? (t.slug as string),
          domain: t.domain as string,
          flag: getTenantLocale(t.slug as string).flag,
        }));
        cachedSites = sites;
        return sites;
      })
      .catch(() => [] as TenantSite[]);
  }
  return inflight;
}

export function useTenantSites(): TenantSite[] {
  const [sites, setSites] = useState<TenantSite[]>(cachedSites ?? []);

  useEffect(() => {
    let cancelled = false;
    loadSites().then((s) => {
      if (!cancelled) setSites(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return sites;
}
