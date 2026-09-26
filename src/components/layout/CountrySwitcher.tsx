// ============================================================
// CountrySwitcher — visitor-facing navigation between the
// tenant sites (Cyprus, Greece, Malta, Romania, Dubai, World).
// Desktop: flag button with dropdown. Mobile: inline list.
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { useTenant } from '@/lib/tenant';
import { getTenantLocale } from '@/lib/tenantConfig';
import { useTenantSites, getTenantSiteUrl, type TenantSite } from '@/lib/useTenantSites';

function SiteRow({
  site,
  isCurrent,
  onNavigate,
}: {
  site: TenantSite;
  isCurrent: boolean;
  onNavigate?: () => void;
}) {
  return (
    <a
      href={getTenantSiteUrl(site)}
      onClick={onNavigate}
      className="flex items-center gap-2.5 px-4 py-2 text-sm transition-colors"
      style={{ color: 'var(--text-body)' }}
      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      <span className="text-base leading-none" aria-hidden>
        {site.flag}
      </span>
      <span className="flex-1 truncate">{site.brandName}</span>
      {isCurrent && (
        <Check className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--brand-accent)' }} />
      )}
    </a>
  );
}

export default function CountrySwitcher() {
  const { tenant } = useTenant();
  const sites = useTenantSites();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (sites.length === 0) return null;

  const currentFlag = getTenantLocale(tenant?.slug).flag;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded transition-colors text-sm font-medium"
        style={{ color: 'var(--text-body)' }}
        aria-label="Switch country site"
        aria-expanded={open}
      >
        <span className="text-base leading-none" aria-hidden>
          {currentFlag}
        </span>
        <Globe className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          style={{ color: 'var(--text-muted)' }}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-lg shadow-xl border z-50 py-1 overflow-hidden"
          style={{ borderColor: 'var(--bg-border)' }}
        >
          <p
            className="px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-muted)' }}
          >
            Our countries
          </p>
          {sites.map((site) => (
            <SiteRow
              key={site.slug}
              site={site}
              isCurrent={site.slug === tenant?.slug}
              onNavigate={() => setOpen(false)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Inline list variant for the mobile menu.
export function CountrySwitcherList({ onNavigate }: { onNavigate?: () => void }) {
  const { tenant } = useTenant();
  const sites = useTenantSites();

  if (sites.length === 0) return null;

  return (
    <div>
      {sites.map((site) => (
        <SiteRow
          key={site.slug}
          site={site}
          isCurrent={site.slug === tenant?.slug}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}
