import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { Country } from '../types/database';

interface CountriesState {
  countries: Country[];
  featuredCountries: Country[];
  isLoading: boolean;
  error: string | null;
}

export function useCountries(): CountriesState {
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCountries() {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from('countries')
        .select('*')
        .order('display_order', { ascending: true });

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setCountries((data as Country[]) ?? []);
      }
      setIsLoading(false);
    }

    fetchCountries();
  }, []);

  const featuredCountries = countries.filter((c) => c.is_featured);

  return { countries, featuredCountries, isLoading, error };
}
