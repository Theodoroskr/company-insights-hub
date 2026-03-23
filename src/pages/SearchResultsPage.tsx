import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import PageLayout from '../components/layout/PageLayout';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import SearchWidget from '../components/search/SearchWidget';
import { useTenant } from '../lib/tenant.tsx';
import { useCountries } from '../lib/countries';
import { supabase } from '@/integrations/supabase/client';
import type { Company } from '../types/database';

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

  // Filter state
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'dissolved'>('all');
  const [legalTypes, setLegalTypes] = useState<string[]>([]);
  const [selectedLegalTypes, setSelectedLegalTypes] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);

  const getCountryName = (code: string) => {
    const c = countries.find((x) => x.code.toUpperCase() === code.toUpperCase());
    return c ? `${c.flag_emoji ?? ''} ${c.name}` : code;
  };

  const countryName = countryParam
    ? countries.find((c) => c.code.toUpperCase() === countryParam.toUpperCase())?.name ?? countryParam
    : 'all countries';

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

          const types = Array.from(
            new Set(newResults.map((c) => c.legal_form).filter(Boolean) as string[])
          );
          setLegalTypes(types);
          if (!append) setSelectedLegalTypes(types);
        }
      } finally {
        setIsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q, countryParam, tenant?.id]
  );

  // Reset + fetch when params change
  useEffect(() => {
    setResults([]);
    setHasMore(false);
    setStatusFilter('all');
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
    if (statusFilter === 'active') f = f.filter((c) => c.status?.toLowerCase() === 'active');
    if (statusFilter === 'dissolved') f = f.filter((c) => c.status?.toLowerCase() === 'dissolved');
    if (selectedLegalTypes.length > 0 && selectedLegalTypes.length < legalTypes.length) {
      f = f.filter((c) => !c.legal_form || selectedLegalTypes.includes(c.legal_form));
    }
    if (tenant?.slug === 'icw' && selectedCountries.length > 0) {
      f = f.filter((c) => selectedCountries.includes(c.country_code));
    }
    setFiltered(f);
  }, [results, statusFilter, selectedLegalTypes, legalTypes, selectedCountries, tenant?.slug]);

  const handleSearch = (newQ: string, newCountry: string) => {
    const params: Record<string, string> = {};
    if (newQ) params.q = newQ;
    if (newCountry) params.country = newCountry;
    setSearchParams(params);
  };

  const toggleLegalType = (type: string) => {
    setSelectedLegalTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const toggleCountry = (code: string) => {
    setSelectedCountries((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const countriesInResults = Array.from(new Set(results.map((c) => c.country_code)));

  return (
    <PageLayout>
      <Helmet>
        <title>
          Search results for "{q}" — {tenant?.brand_name ?? 'Companies House'}
        </title>
        <meta
          name="description"
          content={`Found ${filtered.length} companies matching '${q}'. Search company registry data instantly.`}
        />
        <meta name="robots" content="noindex" />
      </Helmet>

      {/* Compact search bar at top */}
      <div style={{ backgroundColor: 'var(--brand-primary)' }} className="py-6">
        <div className="max-w-5xl mx-auto px-4">
          <SearchWidget
            defaultQuery={q}
            defaultCountry={countryParam}
            onSearch={handleSearch}
            size="compact"
            isGlobal={tenant?.slug === 'icw'}
          />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* ── LEFT: Filters ── */}
          <aside className="w-full lg:w-60 shrink-0">
            <div
              className="rounded-lg border p-4 sticky top-24"
              style={{ borderColor: 'var(--bg-border)', backgroundColor: '#fff' }}
            >
              <h2
                className="text-sm font-semibold mb-3"
                style={{ color: 'var(--text-subheading)' }}
              >
                Refine Search
              </h2>

              {/* Search input */}
              <div className="space-y-2">
                <input
                  type="text"
                  defaultValue={q}
                  id="refine-q"
                  placeholder="Company name…"
                  className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-blue-500"
                  style={{
                    borderColor: 'var(--bg-border)',
                    color: 'var(--text-body)',
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (val) handleSearch(val, countryParam);
                    }
                  }}
                />
                <button
                  className="w-full py-2 rounded text-sm font-medium text-white transition-all active:scale-95"
                  style={{ backgroundColor: 'var(--brand-accent)', borderRadius: '6px' }}
                  onClick={() => {
                    const el = document.getElementById('refine-q') as HTMLInputElement;
                    if (el?.value.trim()) handleSearch(el.value.trim(), countryParam);
                  }}
                >
                  Search
                </button>
              </div>

              {/* Status */}
              <div className="mt-5">
                <h3
                  className="text-xs font-semibold uppercase tracking-wide mb-2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Status
                </h3>
                {(['all', 'active', 'dissolved'] as const).map((s) => (
                  <label key={s} className="flex items-center gap-2 mb-1 cursor-pointer">
                    <input
                      type="radio"
                      name="status-filter"
                      checked={statusFilter === s}
                      onChange={() => setStatusFilter(s)}
                      className="accent-blue-600"
                    />
                    <span className="text-sm capitalize" style={{ color: 'var(--text-body)' }}>
                      {s === 'all' ? 'All' : s === 'active' ? 'Active only' : 'Dissolved only'}
                    </span>
                  </label>
                ))}
              </div>

              {/* Legal type */}
              {legalTypes.length > 0 && (
                <div className="mt-5">
                  <h3
                    className="text-xs font-semibold uppercase tracking-wide mb-2"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Legal Type
                  </h3>
                  {legalTypes.map((type) => (
                    <label key={type} className="flex items-center gap-2 mb-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedLegalTypes.includes(type)}
                        onChange={() => toggleLegalType(type)}
                        className="accent-blue-600"
                      />
                      <span className="text-sm" style={{ color: 'var(--text-body)' }}>
                        {type}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {/* Country — ICW only */}
              {tenant?.slug === 'icw' && countriesInResults.length > 1 && (
                <div className="mt-5">
                  <h3
                    className="text-xs font-semibold uppercase tracking-wide mb-2"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Country
                  </h3>
                  {countriesInResults.map((code) => (
                    <label key={code} className="flex items-center gap-2 mb-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={
                          selectedCountries.length === 0 || selectedCountries.includes(code)
                        }
                        onChange={() => toggleCountry(code)}
                        className="accent-blue-600"
                      />
                      <span className="text-sm" style={{ color: 'var(--text-body)' }}>
                        {getCountryName(code)}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* ── RIGHT: Results ── */}
          <main className="flex-1 min-w-0">
            {/* Header */}
            <div className="mb-5">
              {isLoading && results.length === 0 ? (
                <LoadingSkeleton lines={2} className="max-w-xs" />
              ) : (
                <>
                  <p
                    className="text-lg font-semibold"
                    style={{ color: 'var(--text-heading)' }}
                  >
                    {filtered.length} {filtered.length === 1 ? 'company' : 'companies'} found
                    {q ? ` for "${q}"` : ''}
                  </p>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Showing results from{' '}
                    {countryParam ? countryName : 'all countries'} company registry
                  </p>
                  {dataSource && (
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      {dataSource === 'api4all'
                        ? '🟢 Live data from official registry'
                        : `⏱ Cached data · ${firstCachedAt ? new Date(firstCachedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}`}
                    </p>
                  )}
                </>
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

            {/* Not found */}
            {!isLoading && q && filtered.length === 0 && results.length === 0 && (
              <div
                className="rounded-lg border p-10 text-center"
                style={{ borderColor: 'var(--bg-border)' }}
              >
                <div className="text-5xl mb-4" style={{ color: 'var(--text-muted)' }}>
                  🔍
                </div>
                <h2
                  className="text-xl font-semibold mb-2"
                  style={{ color: 'var(--text-heading)' }}
                >
                  No companies found for "{q}"
                </h2>
                <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                  Try a different spelling or fewer words
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => {
                      setStatusFilter('all');
                      setSelectedLegalTypes(legalTypes);
                      setSelectedCountries([]);
                    }}
                    className="px-5 py-2 rounded text-sm font-medium text-white transition-all active:scale-95"
                    style={{ backgroundColor: 'var(--brand-accent)', borderRadius: '6px' }}
                  >
                    Try a broader search
                  </button>
                  <Link
                    to={`/contact?message=Manual search request for: ${encodeURIComponent(q)}`}
                    className="px-5 py-2 rounded text-sm font-medium border transition-all active:scale-95"
                    style={{
                      borderColor: 'var(--brand-accent)',
                      color: 'var(--brand-accent)',
                      borderRadius: '6px',
                    }}
                  >
                    Request a manual search →
                  </Link>
                </div>
              </div>
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
                      {/* Left */}
                      <div className="flex-1 min-w-0">
                        <h3
                          className="text-lg font-semibold truncate"
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
                          {company.status && (
                            <>
                              <span>·</span>
                              <StatusBadge status={company.status} />
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right — desktop */}
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

            {/* Global search CTA — single-country tenants only */}
            {tenant?.slug !== 'icw' && q && (
              <div
                className="mt-10 rounded-lg border p-6"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  borderColor: 'var(--bg-border)',
                  borderRadius: '8px',
                }}
              >
                <div className="flex items-start gap-4">
                  <span className="text-3xl">🌍</span>
                  <div>
                    <h3
                      className="font-semibold"
                      style={{ color: 'var(--text-heading)' }}
                    >
                      Search for "{q}" globally
                    </h3>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-body)' }}>
                      Find companies with similar names in other countries via the Infocredit global
                      network
                    </p>
                    <a
                      href={`https://www.infocreditworld.com/#${encodeURIComponent(q)}/blank&c`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-4 px-5 py-2 rounded text-sm font-medium text-white transition-all active:scale-95"
                      style={{
                        backgroundColor: 'var(--brand-accent)',
                        borderRadius: '6px',
                      }}
                    >
                      Search Internationally →
                    </a>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </PageLayout>
  );
}
