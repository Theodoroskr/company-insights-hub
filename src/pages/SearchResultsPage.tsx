import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Search, ExternalLink, FileText, Award } from 'lucide-react';
import PageLayout from '../components/layout/PageLayout';
import SaveCompanyButton from '../components/company/SaveCompanyButton';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import EmptyState from '../components/ui/EmptyState';
import InvestigationRequest from '../components/search/InvestigationRequest';
import { useTenant } from '../lib/tenant.tsx';
import { useCountries } from '../lib/countries';
import { supabase } from '@/integrations/supabase/client';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { MAX_SEARCH_COUNTRIES, resolveSearchCountries, toggleSearchCountry } from '@/lib/searchCountries';
import type { Company } from '../types/database';
import { useCertificateCountries, certificatesAvailableFor } from '@/lib/certificateAvailability';
import {
  legalFormToEntityType,
  getPrimaryCertificatesForEntity,
  entityTypeLabels,
  CERT_PRICE,
  type EntityType,
} from '@/data/cyprusCertificates';

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
  const certCountries = useCertificateCountries();
  const { tenant } = useTenant();
  const { countries } = useCountries();

  const q = searchParams.get('q') ?? '';
  const countryParam = searchParams.get('country') ?? '';

  const [results, setResults] = useState<Company[]>([]);
  const [filtered, setFiltered] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dataSource, setDataSource] = useState<'api4all' | 'cache' | null>(null);
  const [firstCachedAt, setFirstCachedAt] = useState<string | null>(null);

  // Sidebar state
  const [sidebarQuery, setSidebarQuery] = useState(q);
  const [legalTypeFilter, setLegalTypeFilter] = useState<string>('all');
  const [countrySearch, setCountrySearch] = useState('');
  const [multipleCountries, setMultipleCountries] = useState(false);
  const [countryPrompt, setCountryPrompt] = useState(false);
  const searchGeneration = useRef(0);
  const isGlobal = tenant?.slug === 'icw';
  const selectedCountries = resolveSearchCountries(countryParam, isGlobal ? null : tenant?.country_code);
  const countryKey = selectedCountries.join(',');
  const sortedCountries = [...countries].sort((a, b) => a.name.localeCompare(b.name));
  const selectableCountries = sortedCountries.filter((c) => /^[a-z]{2}$/i.test(c.code));

  // Keep sidebarQuery in sync with URL param
  useEffect(() => {
    setSidebarQuery(q);
  }, [q]);

  const getCountryName = (code: string) => {
    const c = countries.find((x) => x.code.toUpperCase() === code.toUpperCase());
    return c ? `${c.flag_emoji ?? ''} ${c.name}` : code;
  };

  const [registryStatus, setRegistryStatus] = useState<Record<string, 'loading' | 'done' | 'error'>>({});

  useEffect(() => {
    const generation = ++searchGeneration.current;
    setResults([]);
    setDataSource(null);
    setFirstCachedAt(null);
    setLegalTypeFilter('all');
    setRegistryStatus({});
    if (!tenant || q.trim().length < 2 || !countryKey) {
      setIsLoading(false);
      return;
    }
    const codes = countryKey.split(',');
    setIsLoading(true);
    setRegistryStatus(Object.fromEntries(codes.map((cc) => [cc, 'loading'])));
    let anyLive = false;
    Promise.all(codes.map(async (cc) => {
      try {
        const { data, error } = await supabase.functions.invoke('search-companies', {
          body: { q, country: cc, tenant_id: tenant.id },
        });
        if (generation !== searchGeneration.current) return;
        if (error || data?.error || data?.warning) throw new Error(data?.error || data?.warning || error?.message);
        // Never display an upstream/cache fallback from a different country.
        const companies: Company[] = (data?.results ?? []).filter((company: Company) => company.country_code?.toLowerCase() === cc);
        if (data?.source === 'api4all') anyLive = true;
        setResults((previous) => {
          const merged = [...previous, ...companies];
          const seen = new Set<string>();
          return merged.filter((company) => {
            if (seen.has(company.id)) return false;
            seen.add(company.id);
            return true;
          }).sort((a, b) => {
            const query = q.toLowerCase();
            const score = (name: string) => name.toLowerCase() === query ? 0 : name.toLowerCase().startsWith(query) ? 1 : 2;
            return score(a.name) - score(b.name) || a.name.localeCompare(b.name);
          });
        });
        setFirstCachedAt((previous) => previous ?? companies[0]?.cached_at ?? null);
        setRegistryStatus((previous) => ({ ...previous, [cc]: 'done' }));
      } catch {
        if (generation === searchGeneration.current) setRegistryStatus((previous) => ({ ...previous, [cc]: 'error' }));
      }
    })).finally(() => {
      if (generation !== searchGeneration.current) return;
      setDataSource(anyLive ? 'api4all' : 'cache');
      setIsLoading(false);
    });
    return () => { searchGeneration.current++; };
  }, [q, countryKey, tenant?.id]);

  useEffect(() => {
    if (selectedCountries.length > 1) setMultipleCountries(true);
  }, [countryKey]);

  const updateCountries = (codes: string[]) => {
    const params = new URLSearchParams(searchParams);
    if (codes.length) params.set('country', codes.join(','));
    else params.delete('country');
    setSearchParams(params);
    setCountryPrompt(false);
  };

  // Apply filters
  useEffect(() => {
    let f = [...results];
    if (legalTypeFilter !== 'all') {
      f = f.filter((c) => c.legal_form === legalTypeFilter);
    }
    setFiltered(f);
  }, [results, legalTypeFilter]);

  const handleSidebarSearch = () => {
    const val = sidebarQuery.trim();
    if (isGlobal && selectedCountries.length === 0) {
      setCountryPrompt(true);
      return;
    }
    if (val) {
      const params: Record<string, string> = { q: val };
      if (countryKey) params.country = countryKey;
      setSearchParams(params);
    }
  };

  const handleReset = () => {
    setSidebarQuery('');
    setLegalTypeFilter('all');
    setCountrySearch('');
    setMultipleCountries(false);
    setCountryPrompt(false);
    setSearchParams({});
  };

  const failedCountries = selectedCountries.filter((code) => registryStatus[code] === 'error');

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
                  className="flex-1 min-w-0 border rounded-md px-3 py-2 text-sm outline-none focus:border-brand-accent transition-colors"
                  style={{ borderColor: 'var(--bg-border)', color: 'var(--text-body)' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSidebarSearch();
                  }}
                />
                <Button variant="ghost"
                  onClick={handleSidebarSearch}
                  className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 transition-opacity hover:opacity-80 active:scale-95"
                  style={{ backgroundColor: 'var(--text-heading)' }}
                  aria-label="Search"
                >
                  <Search className="w-4 h-4 text-white" />
                </Button>
              </div>

              <div className="mt-5">
                {isGlobal ? (
                  <>
                    <Label htmlFor="search-country" className="text-sm font-medium">Country</Label>
                    {!multipleCountries && selectedCountries.length <= 1 && (
                      <select
                        id="search-country"
                        aria-label="Search country"
                        value={selectedCountries[0] ?? ''}
                        onChange={(event) => updateCountries(event.target.value ? [event.target.value] : [])}
                        className="mt-2 w-full rounded-md border border-input bg-background p-2 text-sm text-foreground"
                      >
                        <option value="">Select country</option>
                        {selectableCountries.map((country) => (
                          <option key={country.code} value={country.code.toLowerCase()}>{country.flag_emoji} {country.name}</option>
                        ))}
                      </select>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      <Checkbox id="multi-country" checked={multipleCountries} onCheckedChange={(checked) => {
                        setMultipleCountries(checked === true);
                        if (checked !== true && selectedCountries.length > 1) updateCountries(selectedCountries.slice(0, 1));
                      }} />
                      <Label htmlFor="multi-country" className="text-sm cursor-pointer">Search multiple countries</Label>
                    </div>
                    {multipleCountries && (
                      <div className="mt-3">
                        <p className="mb-2 text-xs text-muted-foreground" aria-live="polite">{selectedCountries.length}/{MAX_SEARCH_COUNTRIES} selected</p>
                        <input aria-label="Filter countries" placeholder="Search countries…" value={countrySearch} onChange={(event) => setCountrySearch(event.target.value)} className="mb-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground" />
                        <div className="max-h-60 overflow-y-auto space-y-2">
                          {selectableCountries.filter((country) => country.name.toLowerCase().includes(countrySearch.toLowerCase())).map((country) => {
                            const code = country.code.toLowerCase();
                            const checked = selectedCountries.includes(code);
                            return (
                              <div key={code} className="flex items-center gap-2">
                                <Checkbox id={`country-${code}`} checked={checked} disabled={!checked && selectedCountries.length >= MAX_SEARCH_COUNTRIES} onCheckedChange={() => updateCountries(toggleSearchCountry(selectedCountries, code))} />
                                <Label htmlFor={`country-${code}`} className="text-sm font-normal cursor-pointer">{country.flag_emoji} {country.name}</Label>
                              </div>
                            );
                          })}
                        </div>
                        {selectedCountries.length === MAX_SEARCH_COUNTRIES && <p className="mt-2 text-xs text-muted-foreground" role="status">Maximum 5 countries. Remove one to choose another.</p>}
                      </div>
                    )}
                    {(countryPrompt || selectedCountries.length === 0) && <p role="status" className="mt-2 text-sm text-muted-foreground">Please select a country.</p>}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">{getCountryName(tenant?.country_code ?? '')}</p>
                )}
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
              <Button variant="ghost"
                onClick={handleReset}
                className="block w-full text-center text-sm mt-6 transition-opacity hover:opacity-70"
                style={{ color: 'var(--brand-accent)' }}
              >
                RESET
              </Button>
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
              {Object.keys(registryStatus).length > 0 && (
                <div className="mt-2">
                  <p className="text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    {isLoading ? 'Searching' : 'Searched'} {selectedCountries.length} {selectedCountries.length === 1 ? 'country' : 'countries'}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCountries.map((cc) => {
                      const st = registryStatus[cc];
                      const count = results.filter((c) => c.country_code?.toUpperCase() === cc.toUpperCase()).length;
                      return (
                        <span
                          key={cc}
                          className="text-xs px-2 py-0.5 rounded-full border"
                          style={{ borderColor: 'var(--bg-border)', color: 'var(--text-body)', opacity: st === 'loading' ? 0.6 : 1 }}
                        >
                          {getCountryName(cc)}{' '}
                          {st === 'loading' ? '…' : st === 'error' ? '· unavailable' : `· ${count}`}
                        </span>
                      );
                    })}
                  </div>
                </div>
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
              selectedCountries.length === 0
                ? <p className="text-sm text-muted-foreground">Please select a country.</p>
                : failedCountries.length > 0
                  ? <p role="alert" className="text-sm text-muted-foreground">Search unavailable for {failedCountries.map(getCountryName).join(', ')}. Please try again.</p>
                  : q.length >= 2 && results.length === 0
                    ? <div className="space-y-6">{selectedCountries.map((code) => <InvestigationRequest key={code} query={q} country={code} />)}</div>
                    : <EmptyState message="No Companies yet" />
            )}

            {/* Results list */}
            {filtered.length > 0 && (
              <div className="space-y-3">
                  {filtered.map((company) => {
                    // Cyprus registrar certificates only apply to Cyprus companies
                    const entityType = company.country_code?.toUpperCase() === 'CY' && certificatesAvailableFor(company.country_code, certCountries)
                      ? legalFormToEntityType(company.legal_form, company.reg_no)
                      : null;
                    const topCerts = entityType ? getPrimaryCertificatesForEntity(entityType, 3) : [];

                    return (
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
                            <div className="flex items-start gap-2">
                              <h3
                                className="text-base font-semibold truncate flex-1"
                                style={{ color: 'var(--text-heading)' }}
                              >
                                {company.name}
                              </h3>
                              <SaveCompanyButton companyId={company.id} variant="icon" />
                            </div>
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

                            {/* Available certificates for this entity type */}
                            {topCerts.length > 0 && (
                              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                                <span className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                                  <Award className="w-3 h-3" />
                                  Available:
                                </span>
                                {topCerts.map((cert) => (
                                  <span
                                    key={cert.slug}
                                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border"
                                    style={{
                                      borderColor: 'var(--brand-accent)',
                                      color: 'var(--brand-accent)',
                                      backgroundColor: 'rgba(59,130,246,0.06)',
                                    }}
                                  >
                                    <FileText className="w-3 h-3" />
                                    {cert.name.replace('Certificate of ', '')}
                                  </span>
                                ))}
                                <span
                                  className="text-xs font-medium"
                                  style={{ color: 'var(--brand-accent)' }}
                                >
                                  +more
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="hidden sm:flex flex-col items-end gap-2 shrink-0">
                            {entityType && (
                              <span
                                className="text-xs px-2 py-0.5 rounded-full font-medium"
                                style={{
                                  backgroundColor: 'var(--bg-subtle)',
                                  color: 'var(--text-muted)',
                                }}
                              >
                                {entityTypeLabels[entityType]}
                              </span>
                            )}
                            {entityType && (
                              <Button variant="ghost"
                                className="px-4 py-2 rounded text-sm font-medium text-white transition-all active:scale-95"
                                style={{
                                  backgroundColor: 'var(--brand-accent)',
                                  borderRadius: '6px',
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const params = new URLSearchParams({
                                    entity: entityType,
                                    companyName: company.name,
                                    ...(company.reg_no ? { regNo: company.reg_no } : {}),
                                  });
                                  navigate(`/certificates?${params.toString()}`);
                                }}
                              >
                                Order Certificates
                              </Button>
                            )}
                            <Button variant="ghost"
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
                            </Button>
                          </div>

                          {/* Mobile buttons */}
                          <div className="flex sm:hidden items-center gap-2 mt-3">
                            {entityType && (
                              <Button variant="ghost"
                                className="flex-1 px-3 py-2 rounded text-xs font-medium text-white transition-all active:scale-95"
                                style={{
                                  backgroundColor: 'var(--brand-accent)',
                                  borderRadius: '6px',
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const params = new URLSearchParams({
                                    entity: entityType,
                                    companyName: company.name,
                                    ...(company.reg_no ? { regNo: company.reg_no } : {}),
                                  });
                                  navigate(`/certificates?${params.toString()}`);
                                }}
                              >
                                Order Certificates
                              </Button>
                            )}
                            <Button variant="ghost"
                              className="flex-1 px-3 py-2 rounded text-xs font-medium border transition-all"
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
                              View Profile
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
