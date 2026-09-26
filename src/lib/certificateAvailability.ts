import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Countries whose official certificates are switched on (admin → Certificates).
let cache: Set<string> | null = null;
let inflight: Promise<Set<string>> | null = null;

export function loadCertificateCountries(force = false): Promise<Set<string>> {
  if (cache && !force) return Promise.resolve(cache);
  if (inflight && !force) return inflight;
  inflight = (async () => {
    const { data } = await (supabase.from('countries') as any)
      .select('code')
      .eq('certificates_enabled', true);
    cache = new Set<string>(((data ?? []) as { code: string }[]).map((r) => r.code.toUpperCase()));
    inflight = null;
    return cache;
  })();
  return inflight;
}

export function useCertificateCountries(): Set<string> {
  const [set, setSet] = useState<Set<string>>(cache ?? new Set());
  useEffect(() => {
    let alive = true;
    loadCertificateCountries().then((s) => alive && setSet(s));
    return () => {
      alive = false;
    };
  }, []);
  return set;
}

export function certificatesAvailableFor(countryCode: string | null | undefined, enabled: Set<string>): boolean {
  return !!countryCode && enabled.has(countryCode.toUpperCase());
}
