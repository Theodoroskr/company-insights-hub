import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Search, ExternalLink } from 'lucide-react';
import PageLayout from '../components/layout/PageLayout';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import EmptyState from '../components/ui/EmptyState';
import { useTenant } from '../lib/tenant.tsx';
import { useCountries } from '../lib/countries';
import { supabase } from '@/integrations/supabase/client';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { Company } from '../types/database';

const LEGAL_TYPE_OPTIONS = [
  'Business Name',
  'Limited Company',
  'Partnership',
  'Old Partnership',
  'Overseas Company',
];

export default function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const { countries } = useCountries();

  const q = searchParams.get('q') ?? '';
  const countryParam = searchParams.get('country') ?? '';

  const [results, setResults] = useState<Company[]>([]);
  const [filtered, setFiltered] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [dataSource, setDataSource] = useState<'api4all' | 'cache' | null>(null);
  const [firstCachedAt, setFirstCachedAt] = useState<string | null>(null);

  // Sidebar state
  const [sidebarQuery, setSidebarQuery] = useState(q);
  const [legalTypeFilter, setLegalTypeFilter] = useState<string>('all');
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);

  // Keep sidebarQuery in sync with URL param
  useEffect(() => {
    setSidebarQuery(q);
  }, [q]);

  const getCountryName = (code: string) => {
    const c = countries.find((x) => x.code.toUpperCase() === code.toUpperCase());
    return c ? `${c.flag_emoji ?? ''} ${c.name}` : code;
  };

  const fetchResults = useCallback(
    async (append = false) => {
      if (!q || q.length < 2 || !tenant) return;
      setIsLoading(true);

      try {
        const { data, error } = await supabase.functions.invoke('search-companies', {
          body: {
            q,
            country: countryParam || tenant.country_code || 'cy',
            tenant_id: tenant.id,
          },
        });

        if (!error && data?.results) {
          const companies: Company[] = data.results;
          const newResults = append ? [...results, ...companies] : companies;
          setResults(newResults);
          setHasMore(companies.length === 50);
          setDataSource(data.source ?? null);
          setFirstCachedAt(companies[0]?.cached_at ?? null);
        }
      } finally {
        setIsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q, countryParam, tenant?.id]
  );

  useEffect(() => {
    setResults([]);
    setHasMore(false);
    setLegalTypeFilter('all');
    setSelectedCountries([]);
    setDataSource(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, countryParam, tenant?.id]);

  useEffect(() => {
    if (tenant) fetchResults(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, countryParam, tenant?.id]);

  // Apply filters
  useEffect(() => {
    let f = [...results];
    if (legalTypeFilter !== 'all') {
      f = f.filter((c) => c.legal_form === legalTypeFilter);
    }
    if (tenant?.slug === 'icw' && selectedCountries.length > 0) {
      f = f.filter((c) => selectedCountries.includes(c.country_code));
    }
    setFiltered(f);
  }, [results, legalTypeFilter, selectedCountries, tenant?.slug]);

  const handleSidebarSearch = () => {
    const val = sidebarQuery.trim();
    if (val) {
      const params: Record<string, string> = { q: val };
      if (countryParam) params.country = countryParam;
      setSearchParams(params);
    }
  };

  const handleReset = () => {
    setSidebarQuery('');
    setLegalTypeFilter('all');
    setSelectedCountries([]);
    setSearchParams({});
  };

  const countriesInResults = Array.from(new Set(results.map((c) => c.country_code)));

  return (
    <PageLayout>
      <Helmet>
        <title>
          {q ? `Search results for "${q}"` : 'Search Companies'} —{' '}
          {tenant?.brand_name ?? 'Companies House'}
        </title>
        <meta
          name="description"
          content={`Found ${filtered.length} companies matching '${q}'. Search company registry data instantly.`}
        />
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* ── LEFT SIDEBAR ── */}
          <aside className="w-full lg:w-[280px] shrink-0">
            <div
              className="rounded-lg border p-4 sticky top-24"
              style={{ borderColor: 'var(--bg-border)', backgroundColor: '#fff' }}
            >
              {/* Section: Search Company */}
              <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-subheading)' }}>
                Search Company
              </h2>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={sidebarQuery}
                  onChange={(e) => setSidebarQuery(e.target.value)}
                  placeholder="Enter a Company name"
                  className="flex-1 border rounded-md px-3 py-2 text-sm outline-none focus:border-brand-accent transition-colors"
                  style={{ borderColor: 'var(--bg-border)', color: 'var(--text-body)' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSidebarSearch();
                  }}
                />
                <button
                  onClick={handleSidebarSearch}
                  className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 transition-opacity hover:opacity-80 active:scale-95"
                  style={{ backgroundColor: 'var(--text-heading)' }}
                  aria-label="Search"
                >
                  <Search className="w-4 h-4 text-white" />
                </button>
              </div>

              {/* Section: Filters */}
              <div className="mt-6">
                <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-subheading)' }}>
                  Filters
                </p>

                <RadioGroup
                  value={legalTypeFilter}
                  onValueChange={setLegalTypeFilter}
                  className="gap-2"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="all" id="lt-all" />
                    <Label htmlFor="lt-all" className="text-sm cursor-pointer font-normal" style={{ color: 'var(--text-body)' }}>
                      All types
                    </Label>
                  </div>
                  {LEGAL_TYPE_OPTIONS.map((type) => (
                    <div key={type} className="flex items-center gap-2">
                      <RadioGroupItem value={type} id={`lt-${type}`} />
                      <Label
                        htmlFor={`lt-${type}`}
                        className="text-sm cursor-pointer font-normal"
                        style={{ color: 'var(--text-body)' }}
                      >
                        {type}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Country filter — ICW only */}
              {tenant?.slug === 'icw' && countriesInResults.length > 1 && (
                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                    Country
                  </p>
                  {countriesInResults.map((code) => (
                    <label key={code} className="flex items-center gap-2 mb-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCountries.length === 0 || selectedCountries.includes(code)}
                        onChange={() =>
                          setSelectedCountries((prev) =>
                            prev.includes(code)
                              ? prev.filter((c) => c !== code)
                              : [...prev, code]
                          )
                        }
                        className="accent-blue-600"
                      />
                      <span className="text-sm" style={{ color: 'var(--text-body)' }}>
                        {getCountryName(code)}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {/* International CTA */}
              <div
                className="mt-6 rounded-lg p-4"
                style={{ backgroundColor: 'var(--bg-subtle)' }}
              >
                <p className="text-sm" style={{ color: 'var(--text-body)' }}>
                  Looking for similar companies internationally?
                </p>
                <a
                  href={`https://www.infocreditworld.com/#${encodeURIComponent(q)}/blank&c`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded text-sm font-medium text-white transition-all active:scale-95"
                  style={{ backgroundColor: 'var(--brand-accent)' }}
                >
                  Dicover <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Reset */}
              <button
                onClick={handleReset}
                className="block w-full text-center text-sm mt-6 transition-opacity hover:opacity-70"
                style={{ color: 'var(--brand-accent)' }}
              >
                RESET
              </button>
            </div>
          </aside>

          {/* ── RIGHT: Results ── */}
          <main className="flex-1 min-w-0">
            {/* Header */}
            <div className="mb-5">
              <h2 className="text-xl font-semibold mb-1" style={{ color: 'var(--text-heading)' }}>
                Companies
              </h2>
              {!isLoading && dataSource && (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {dataSource === 'api4all'
                    ? '🟢 Live data from official registry'
                    : `⏱ Cached data · ${firstCachedAt ? new Date(firstCachedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}`}
                </p>
              )}
            </div>

            {/* Loading skeletons */}
            {isLoading && results.length === 0 && (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-lg border p-4"
                    style={{ borderColor: 'var(--bg-border)' }}
                  >
                    <LoadingSkeleton lines={2} />
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!isLoading && filtered.length === 0 && (
              <EmptyState message="No Companies yet" />
            )}

            {/* Results list */}
            {filtered.length > 0 && (
              <div className="space-y-3">
                {filtered.map((company) => (
                  <div
                    key={company.id}
                    className="rounded-lg border p-4 cursor-pointer transition-all hover:shadow-sm group"
                    style={{ borderColor: 'var(--bg-border)', backgroundColor: '#fff' }}
                    onClick={() => navigate(`/company/${company.slug ?? company.id}`)}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.borderColor = 'var(--brand-accent)')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.borderColor = 'var(--bg-border)')
                    }
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3
                          className="text-base font-semibold truncate"
                          style={{ color: 'var(--text-heading)' }}
                        >
                          {company.name}
                        </h3>
                        <div
                          className="flex flex-wrap items-center gap-1.5 mt-1 text-sm"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          <span>{getCountryName(company.country_code)}</span>
                          {company.reg_no && (
                            <>
                              <span>·</span>
                              <span>Reg: {company.reg_no}</span>
                            </>
                          )}
                          {company.legal_form && (
                            <>
                              <span>·</span>
                              <span>{company.legal_form}</span>
                            </>
                          )}
                          {company.status && (
                            <>
                              <span>·</span>
                              <StatusBadge status={company.status} />
                            </>
                          )}
                        </div>
                      </div>

                      <div className="hidden sm:block shrink-0">
                        <button
                          className="px-4 py-2 rounded text-sm font-medium border transition-all group-hover:bg-opacity-10"
                          style={{
                            borderColor: 'var(--brand-accent)',
                            color: 'var(--brand-accent)',
                            borderRadius: '6px',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/company/${company.slug ?? company.id}`);
                          }}
                        >
                          View Profile →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Load more */}
            {hasMore && !isLoading && (
              <div className="mt-6 text-center">
                <button
                  className="px-6 py-2.5 rounded text-sm font-medium border transition-all active:scale-95"
                  style={{
                    borderColor: 'var(--brand-accent)',
                    color: 'var(--brand-accent)',
                    borderRadius: '6px',
                  }}
                  onClick={() => fetchResults(true)}
                >
                  Load more results
                </button>
              </div>
            )}

            {isLoading && results.length > 0 && (
              <div className="mt-4">
                <LoadingSkeleton lines={2} />
              </div>
            )}
          </main>
        </div>
      </div>
    </PageLayout>
  );
}
