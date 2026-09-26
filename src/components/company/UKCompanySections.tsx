import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ChevronDown, FileText, Shield, Users } from 'lucide-react';
import GatedContent from '@/components/ui/GatedContent';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { companiesHouseUK } from '@/lib/companiesHouseUK/client';
import { corporatePscHref, isCorporatePsc, resolveCorporatePscs } from '@/lib/companiesHouseUK/corporatePsc';

interface UKCompanySectionsProps {
  companyNumber: string;
  /** Treat the user as a paying customer for this company */
  isUnlocked?: boolean;
  onOrderReport?: () => void;
}

interface FilingItem {
  type?: string;
  category?: string;
  subcategory?: string;
  description?: string;
  date?: string;
  action_date?: string;
  pages?: number;
  description_values?: Record<string, string | undefined>;
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
  identification?: { registration_number?: string };
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

function titleCase(value?: string): string {
  if (!value) return '';
  return value
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getFilingTitle(filing: FilingItem): string {
  const values = filing.description_values ?? {};
  if (values.officer_name && filing.subcategory === 'termination') {
    return `Director termination — ${values.officer_name}`;
  }
  if (values.officer_name && filing.category === 'officers') {
    return `Director appointment — ${values.officer_name}`;
  }
  if (values.charge_number) return `Mortgage or charge — ${values.charge_number}`;
  if (filing.category === 'accounts') return 'Company accounts filed';
  if (filing.category === 'resolution') return 'Company resolution filed';
  return titleCase(filing.description ?? filing.type) || 'Company filing';
}

function getFilingDetails(filing: FilingItem): string[] {
  const values = filing.description_values ?? {};
  const details: string[] = [];
  if (filing.type) details.push(`Form ${filing.type}`);
  if (filing.action_date && filing.action_date !== filing.date) {
    details.push(`Effective ${formatDate(filing.action_date)}`);
  }
  if (values.charge_creation_date && values.charge_creation_date !== filing.action_date) {
    details.push(`Created ${formatDate(values.charge_creation_date)}`);
  }
  const periodStart = values.period_start_date ?? values.from_date;
  const periodEnd = values.period_end_date ?? values.made_up_date ?? values.to_date;
  if (periodStart && periodEnd) details.push(`Period ${formatDate(periodStart)}–${formatDate(periodEnd)}`);
  else if (periodEnd) details.push(`Made up to ${formatDate(periodEnd)}`);
  if (values.resolution_type) details.push(titleCase(values.resolution_type));
  if (filing.pages) details.push(`${filing.pages} page${filing.pages === 1 ? '' : 's'}`);
  return details;
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
  const [filingsOpen, setFilingsOpen] = useState(false);
  const [filingsLoaded, setFilingsLoaded] = useState(false);
  const [charges, setCharges] = useState<ChargeItem[]>([]);
  const [chargesTotal, setChargesTotal] = useState(0);
  const [psc, setPsc] = useState<PscItem[]>([]);
  const [pscTotal, setPscTotal] = useState(0);
  const [pscHrefs, setPscHrefs] = useState<Record<string, string>>({});
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
    setFilingsLoaded(true);
  };

  useEffect(() => {
    if (!companyNumber) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      const [f, c, p] = await Promise.allSettled([
        companiesHouseUK.filingHistory(companyNumber, { itemsPerPage: 1, startIndex: 0 }),
        companiesHouseUK.charges(companyNumber),
        companiesHouseUK.psc(companyNumber),
      ]);
      if (cancelled) return;

      if (f.status === 'fulfilled') setFilingsTotal(f.value.total_count ?? 0);
      if (c.status === 'fulfilled') {
        setCharges((c.value.items ?? []) as ChargeItem[]);
        setChargesTotal(c.value.total_count ?? 0);
      }
      if (p.status === 'fulfilled') {
        const pscItems = (p.value.items ?? []) as PscItem[];
        setPsc(pscItems);
        setPscTotal(p.value.total_results ?? 0);
        resolveCorporatePscs(pscItems)
          .then((resolved) => {
            if (cancelled) return;
            const map: Record<string, string> = {};
            for (const entry of resolved) map[entry.name.toUpperCase()] = corporatePscHref(entry);
            setPscHrefs(map);
          })
          .catch(() => undefined);
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [companyNumber]);

  const onFilingsOpenChange = async (open: boolean) => {
    setFilingsOpen(open);
    if (!open || filingsLoaded || filingsLoading) return;
    setFilingsLoading(true);
    try {
      await fetchFilings(filingCategory, 0, false);
    } finally {
      setFilingsLoading(false);
    }
  };

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
      <div className="flex flex-col gap-4">
      {/* Filings & Documents (UK) */}
      <div className="order-3">
      <SectionCard>
        <Collapsible open={filingsOpen} onOpenChange={onFilingsOpenChange}>
        <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 text-left">
          <span className="font-semibold text-base flex items-center gap-2" style={{ color: 'var(--text-subheading)' }}>
            <FileText className="w-4 h-4" />
            UK Filing History
            <span
              className="text-xs px-2 py-0.5 rounded-full ml-1 font-normal"
              style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
            >
              {filingsTotal.toLocaleString()} record{filingsTotal === 1 ? '' : 's'}
            </span>
          </span>
          <ChevronDown
            className={`w-4 h-4 shrink-0 transition-transform ${filingsOpen ? 'rotate-180' : ''}`}
            style={{ color: 'var(--text-muted)' }}
          />
        </CollapsibleTrigger>

        <CollapsibleContent className="pt-4">

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
            message="Order the UK Company Report to view the detailed filing history"
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
                    const label = getFilingTitle(f);
                    const details = getFilingDetails(f);
                    return (
                      <div
                        key={`${year}-${i}`}
                        className="grid grid-cols-[5rem_minmax(0,1fr)] sm:grid-cols-[5rem_minmax(0,1fr)_auto] gap-x-3 gap-y-1 py-2.5 border-b last:border-0"
                        style={{ borderColor: 'var(--bg-border)' }}
                      >
                        <span
                          className="whitespace-nowrap text-xs w-20 shrink-0"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {formatDate(f.date)}
                        </span>
                        <span className="min-w-0" style={{ color: 'var(--text-body)' }}>
                          <span className="block font-medium">{label}</span>
                          {details.length > 0 && (
                            <span className="block text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              {details.join(' · ')}
                            </span>
                          )}
                        </span>
                        <span className="col-start-2 sm:col-start-3 text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
                          {titleCase(f.subcategory ?? f.category)}
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
        </CollapsibleContent>
        </Collapsible>
      </SectionCard>
      </div>

      {/* Charges & Mortgages */}
      <div className="order-2">
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
      </div>

      {/* Persons with Significant Control */}
      <div className="order-1">
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
      </div>
      </div>
    </>
  );
}
