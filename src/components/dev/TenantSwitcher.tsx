import { useEffect, useState } from 'react';
import { useTenant } from '@/lib/tenant';

const TENANTS: { slug: string; label: string }[] = [
  { slug: 'cy', label: 'CY' },
  { slug: 'icw', label: 'ICW' },
  { slug: 'gr', label: 'GR' },
  { slug: 'mt', label: 'MT' },
  { slug: 'ro', label: 'RO' },
  { slug: 'ae', label: 'AE' },
];

function isPreviewHost(): boolean {
  const h = window.location.hostname;
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h.endsWith('.lovable.app') ||
    h.endsWith('.lovableproject.com')
  );
}

export default function TenantSwitcher() {
  const { tenant } = useTenant();
  const [visible, setVisible] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setVisible(isPreviewHost());
  }, []);

  if (!visible) return null;

  const switchTo = (slug: string) => {
    try {
      localStorage.setItem('dev_tenant_slug', slug);
    } catch {
      /* ignore */
    }
    const url = new URL(window.location.href);
    url.searchParams.set('tenant', slug);
    window.location.href = url.toString();
  };

  const active = tenant?.slug;

  return (
    <div
      className="fixed bottom-3 right-3 z-[9999] rounded-lg border border-border bg-background/95 shadow-lg backdrop-blur-sm text-xs"
      style={{ fontFamily: 'system-ui, sans-serif' }}
    >
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="w-full px-2 py-1 flex items-center justify-between gap-2 text-muted-foreground hover:text-foreground"
      >
        <span className="font-semibold">
          Tenant: <span className="text-foreground">{active ?? '—'}</span>
        </span>
        <span aria-hidden>{collapsed ? '▸' : '▾'}</span>
      </button>
      {!collapsed && (
        <div className="flex flex-wrap gap-1 p-2 pt-0 max-w-[200px]">
          {TENANTS.map((t) => {
            const isActive = t.slug === active;
            return (
              <button
                key={t.slug}
                type="button"
                onClick={() => switchTo(t.slug)}
                className={`px-2 py-1 rounded border text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-foreground border-border hover:bg-muted'
                }`}
                title={`Switch to ${t.slug}`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
