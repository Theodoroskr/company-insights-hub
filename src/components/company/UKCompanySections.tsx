import { useEffect, useState } from 'react';
import { FileText, Shield, Users } from 'lucide-react';
import GatedContent from '@/components/ui/GatedContent';
import { companiesHouseUK } from '@/lib/companiesHouseUK/client';

interface UKCompanySectionsProps {
  companyNumber: string;
  /** Treat the user as a paying customer for this company */
  isUnlocked?: boolean;
  onOrderReport?: () => void;
}

interface FilingItem {
  type?: string;
  category?: string;
  description?: string;
  date?: string;
  links?: { document_metadata?: string };
}

interface ChargeItem {
  charge_code?: string;
  classification?: { description?: string };
  status?: string;
  delivered_on?: string;
  persons_entitled?: Array<{ name: string }>;
}

interface PscItem {
  name?: string;
  kind?: string;
  natures_of_control?: string[];
  notified_on?: string;
  ceased_on?: string;
}

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-lg border p-5 ${className}`}
      style={{ borderColor: 'var(--bg-border)', backgroundColor: '#fff' }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ icon, children, count }: { icon: React.ReactNode; children: React.ReactNode; count?: number }) {
  return (
    <h2 className="font-semibold text-base mb-3 flex items-center gap-2" style={{ color: 'var(--text-subheading)' }}>
      {icon}
      {children}
      {typeof count === 'number' && (
        <span
          className="text-xs px-2 py-0.5 rounded-full ml-1 font-normal"
          style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
        >
          {count} record{count === 1 ? '' : 's'}
        </span>
      )}
    </h2>
  );
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function UKCompanySections({
  companyNumber,
  isUnlocked = false,
  onOrderReport,
}: UKCompanySectionsProps) {
  const [filings, setFilings] = useState<FilingItem[]>([]);
  const [filingsTotal, setFilingsTotal] = useState(0);
  const [filingCategory, setFilingCategory] = useState<string>('all');
  const [filingsLoading, setFilingsLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [charges, setCharges] = useState<ChargeItem[]>([]);
  const [chargesTotal, setChargesTotal] = useState(0);
  const [psc, setPsc] = useState<PscItem[]>([]);
  const [pscTotal, setPscTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const FILING_PAGE = 25;
  const FILING_CATEGORIES: Array<{ key: string; label: string; apiCategory?: string }> = [
    { key: 'all', label: 'All' },
    { key: 'mortgage', label: 'Mortgages & charges', apiCategory: 'mortgage' },
    { key: 'accounts', label: 'Accounts', apiCategory: 'accounts' },
    { key: 'officers', label: 'Officers', apiCategory: 'officers' },
    { key: 'resolution', label: 'Resolutions', apiCategory: 'resolution' },
    { key: 'other', label: 'Other' },
  ];

  const fetchFilings = async (category: string, startIndex: number, append: boolean) => {
    const cat = FILING_CATEGORIES.find((c) => c.key === category);
    const apiCategory =
      cat?.apiCategory ?? (category === 'other' ? undefined : undefined);
    // 'all' and 'other' both fetch unfiltered; 'other' filters client-side
    const res = await companiesHouseUK.filingHistory(companyNumber, {
      itemsPerPage: FILING_PAGE,
      startIndex,
      category: apiCategory,
    });
    let items = (res.items ?? []) as FilingItem[];
    if (category === 'other') {
      const known = new Set(['mortgage', 'accounts', 'officers', 'resolution']);
      items = items.filter((f) => !known.has(f.category ?? ''));
    }
    setFilingsTotal(res.total_count ?? 0);
    setFilings((prev) => (append ? [...prev, ...items] : items));
  };

  useEffect(() => {
    if (!companyNumber) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setFilingsLoading(true);
      const [f, c, p] = await Promise.allSettled([
        fetchFilings('all', 0, false),
        companiesHouseUK.charges(companyNumber),
        companiesHouseUK.psc(companyNumber),
      ]);
      if (cancelled) return;

      if (c.status === 'fulfilled') {
        setCharges((c.value.items ?? []) as ChargeItem[]);
        setChargesTotal(c.value.total_count ?? 0);
      }
      if (p.status === 'fulfilled') {
        setPsc((p.value.items ?? []) as PscItem[]);
        setPscTotal(p.value.total_results ?? 0);
      }
      setFilingsLoading(false);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [companyNumber]);

  const onSelectCategory = async (key: string) => {
    if (key === filingCategory || filingsLoading) return;
    setFilingCategory(key);
    setFilingsLoading(true);
    try {
      await fetchFilings(key, 0, false);
    } finally {
      setFilingsLoading(false);
    }
  };

  const onLoadMore = async () => {
    setLoadingMore(true);
    try {
      await fetchFilings(filingCategory, filings.length, true);
    } finally {
      setLoadingMore(false);
    }
  };

  // Group filings by year for a timeline feel
  const filingsByYear: Array<[string, FilingItem[]]> = (() => {
    const map = new Map<string, FilingItem[]>();
    for (const f of filings) {
      const year = f.date ? String(new Date(f.date).getFullYear()) : 'Undated';
      if (!map.has(year)) map.set(year, []);
      map.get(year)!.push(f);
    }
    return Array.from(map.entries());
  })();

  return (
    <>
      {/* Filings & Documents (UK) */}
      <SectionCard>
        <SectionTitle icon={<FileText className="w-4 h-4" />} count={filingsTotal}>
          UK Filing History
        </SectionTitle>

        {/* Category filter chips */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {FILING_CATEGORIES.map((c) => {
            const active = filingCategory === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => onSelectCategory(c.key)}
                className="text-xs px-2.5 py-1 rounded-full border transition-colors"
                style={{
                  borderColor: active ? 'var(--brand-accent)' : 'var(--bg-border)',
                  backgroundColor: active
                    ? 'color-mix(in srgb, var(--brand-accent) 10%, transparent)'
                    : 'transparent',
                  color: active ? 'var(--brand-accent)' : 'var(--text-muted)',
                  fontWeight: active ? 600 : 400,
                }}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        {filingsLoading ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading filings…</p>
        ) : filings.length === 0 ? (
          <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>No filings on record.</p>
        ) : (
          <GatedContent
            isUnlocked={isUnlocked}
            message="Order the UK Company Report to download original filing PDFs"
            ctaLabel="Order Report"
            onCta={onOrderReport}
          >
            <div className="text-sm">
              {filingsByYear.map(([year, items]) => (
                <div key={year}>
                  <div
                    className="text-xs font-semibold uppercase tracking-wide mt-4 first:mt-0 mb-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {year}
                  </div>
                  {items.map((f, i) => {
                    const label = (f.description ?? f.type ?? '')
                      .replace(/-/g, ' ')
                      .replace(/^./, (s) => s.toUpperCase());
                    return (
                      <div
                        key={`${year}-${i}`}
                        className="flex items-baseline gap-3 py-1.5 border-b last:border-0"
                        style={{ borderColor: 'var(--bg-border)' }}
                      >
                        <span
                          className="whitespace-nowrap text-xs w-20 shrink-0"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {formatDate(f.date)}
                        </span>
                        <span className="flex-1" style={{ color: 'var(--text-body)' }}>
                          {label}
                        </span>
                        <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
                          {f.category ?? ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {filings.length < filingsTotal && (
              <button
                type="button"
                onClick={onLoadMore}
                disabled={loadingMore}
                className="mt-3 text-sm font-medium px-4 py-1.5 rounded-md border transition-colors disabled:opacity-50"
                style={{
                  borderColor: 'var(--brand-accent)',
                  color: 'var(--brand-accent)',
                }}
              >
                {loadingMore
                  ? 'Loading…'
                  : `Load more (${filings.length} of ${filingsTotal.toLocaleString()})`}
              </button>
            )}
          </GatedContent>
        )}
      </SectionCard>

      {/* Charges & Mortgages */}
      <SectionCard>
        <SectionTitle icon={<Shield className="w-4 h-4" />} count={chargesTotal}>
          Charges &amp; Mortgages
        </SectionTitle>

        {loading ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading charges…</p>
        ) : charges.length === 0 ? (
          <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>
            No secured debts registered against this company.
          </p>
        ) : (
          <GatedContent
            isUnlocked={isUnlocked}
            message="Order the UK Company Report for full charge details and creditor information"
            ctaLabel="Order Report"
            onCta={onOrderReport}
          >
            <div className="space-y-2">
              {charges.slice(0, 5).map((c, i) => (
                <div
                  key={i}
                  className="text-sm py-2 border-b last:border-0"
                  style={{ borderColor: 'var(--bg-border)' }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ color: 'var(--text-body)' }}>
                      {c.classification?.description ?? c.charge_code ?? 'Charge'}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: c.status === 'satisfied' ? 'var(--bg-subtle)' : 'rgba(239,68,68,0.1)',
                        color: c.status === 'satisfied' ? 'var(--text-muted)' : 'rgb(185,28,28)',
                      }}
                    >
                      {c.status ?? 'outstanding'}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Filed {formatDate(c.delivered_on)}
                    {c.persons_entitled && c.persons_entitled.length > 0 && ` · In favour of: ${c.persons_entitled[0].name}`}
                  </p>
                </div>
              ))}
            </div>
          </GatedContent>
        )}
      </SectionCard>

      {/* Persons with Significant Control */}
      <SectionCard>
        <SectionTitle icon={<Users className="w-4 h-4" />} count={pscTotal}>
          Persons with Significant Control (PSC)
        </SectionTitle>

        <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
          Beneficial owners with 25%+ ownership, voting rights, or significant influence.
        </p>

        {loading ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading PSC data…</p>
        ) : psc.length === 0 ? (
          <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>No PSC declarations on file.</p>
        ) : (
          <GatedContent
            isUnlocked={isUnlocked}
            message="Order the UK Company Report for full PSC details including addresses and nationalities"
            ctaLabel="Order Report"
            onCta={onOrderReport}
          >
            <div className="space-y-2">
              {psc.slice(0, 5).map((p, i) => {
                const isCeased = !!p.ceased_on;
                return (
                  <div
                    key={i}
                    className="text-sm py-2 border-b last:border-0"
                    style={{ borderColor: 'var(--bg-border)', opacity: isCeased ? 0.6 : 1 }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium" style={{ color: 'var(--text-body)' }}>
                        {p.name ?? '—'}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
                      >
                        {(p.kind ?? '').replace(/-/g, ' ')}
                      </span>
                    </div>
                    {p.natures_of_control && p.natures_of_control.length > 0 && (
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        {p.natures_of_control.slice(0, 2).map((n) => n.replace(/-/g, ' ')).join(' · ')}
                      </p>
                    )}
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {isCeased ? `Ceased ${formatDate(p.ceased_on)}` : `Notified ${formatDate(p.notified_on)}`}
                    </p>
                  </div>
                );
              })}
            </div>
          </GatedContent>
        )}
      </SectionCard>
    </>
  );
}
