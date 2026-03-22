import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tenant } from '../types/database';

interface TenantContextValue {
  tenant: Tenant | null;
  isLoading: boolean;
  error: string | null;
}

const TenantContext = createContext<TenantContextValue>({
  tenant: null,
  isLoading: true,
  error: null,
});

// Resolves which tenant slug to fall back to on localhost/dev
function resolveFallbackSlug(): string {
  return 'cy';
}

// Injects tenant brand CSS variables onto :root
function applyTenantBranding(tenant: Tenant): void {
  const root = document.documentElement;
  if (tenant.primary_color) {
    root.style.setProperty('--brand-primary', tenant.primary_color);
  }
}

// Determines the hostname-based tenant domain to look up
function resolveHostname(): string | null {
  const hostname = window.location.hostname;
  const isLocal =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.lovable.app') ||
    hostname.endsWith('.lovableproject.com');
  return isLocal ? null : hostname;
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTenant() {
      setIsLoading(true);
      setError(null);

      const hostname = resolveHostname();

      let query = supabase.from('tenants').select('*');

      if (hostname) {
        query = query.eq('domain', hostname);
      } else {
        query = query.eq('slug', resolveFallbackSlug());
      }

      const { data, error: fetchError } = await query.maybeSingle();

      if (fetchError) {
        console.error('[TenantProvider] Error fetching tenant:', fetchError);
        setError(fetchError.message);
        setIsLoading(false);
        return;
      }

      if (data) {
        setTenant(data as Tenant);
        applyTenantBranding(data as Tenant);

        if (data.meta_title) {
          document.title = data.meta_title;
        }
      } else {
        // Absolute fallback: no tenant found, try slug='cy'
        const { data: fallback } = await supabase
          .from('tenants')
          .select('*')
          .eq('slug', 'cy')
          .maybeSingle();
        if (fallback) {
          setTenant(fallback as Tenant);
          applyTenantBranding(fallback as Tenant);
          if (fallback.meta_title) document.title = fallback.meta_title;
        }
      }

      setIsLoading(false);
    }

    fetchTenant();
  }, []);

  return (
    <TenantContext.Provider value={{ tenant, isLoading, error }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant(): TenantContextValue {
  return useContext(TenantContext);
}
