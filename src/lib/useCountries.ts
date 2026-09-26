import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CountryOption {
  code: string; // ISO2, uppercase
  name: string;
}

let cache: CountryOption[] | null = null;

/**
 * Loads the full country list (ISO2 code + name) from the countries table.
 * Cached for the session so repeated mounts are instant.
 */
export function useCountries() {
  const [countries, setCountries] = useState<CountryOption[]>(cache ?? []);

  useEffect(() => {
    if (cache) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('countries')
        .select('name, iso2, code')
        .order('name', { ascending: true });
      if (cancelled || !data) return;
      const seen = new Set<string>();
      const list: CountryOption[] = [];
      for (const row of data as { name: string; iso2: string | null; code: string }[]) {
        const iso = (row.iso2 || row.code || '').toUpperCase().slice(0, 2);
        if (!iso || seen.has(iso)) continue;
        seen.add(iso);
        list.push({ code: iso, name: row.name });
      }
      cache = list;
      setCountries(list);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return countries;
}
