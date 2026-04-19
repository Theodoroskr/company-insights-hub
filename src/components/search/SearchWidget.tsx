import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, ChevronDown, X, Building2, MapPin, Hash, CornerDownLeft, ArrowUpDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../lib/tenant';
import { useCountries } from '../../lib/countries';
import StatusBadge from '../ui/StatusBadge';
import type { Company, Country } from '../../types/database';

// ── Highlight matching characters inside a label ──
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const q = query.trim();
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i === -1) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark
        className="bg-transparent font-bold rounded-sm px-0.5"
        style={{ color: 'var(--brand-accent)', background: 'rgba(56,189,248,0.12)' }}
      >
        {text.slice(i, i + q.length)}
      </mark>
      {text.slice(i + q.length)}
    </>
  );
}

// ── Pull a useful snippet from a company's raw payload ──
function pickSnippet(c: Company): { kind: 'address' | 'sector' | 'form'; value: string } | null {
  if (c.registered_address) return { kind: 'address', value: c.registered_address };
  const raw = (c.raw_source_json ?? null) as
    | { nature_of_business?: string; sic_codes?: string[]; registered_office_address?: { address_line_1?: string; locality?: string } }
    | null;
  const office = raw?.registered_office_address;
  if (office?.address_line_1 || office?.locality) {
    return { kind: 'address', value: [office.address_line_1, office.locality].filter(Boolean).join(', ') };
  }
  if (raw?.nature_of_business) return { kind: 'sector', value: raw.nature_of_business };
  if (raw?.sic_codes?.length) return { kind: 'sector', value: `SIC ${raw.sic_codes.join(', ')}` };
  if (c.legal_form) return { kind: 'form', value: c.legal_form };
  return null;
}

interface SearchWidgetProps {
  defaultQuery?: string;
  defaultCountry?: string;
  onSearch?: (query: string, country: string) => void;
  size?: 'hero' | 'compact';
  isGlobal?: boolean;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function SearchWidget({
  defaultQuery = '',
  defaultCountry = '',
  onSearch,
  size = 'hero',
  isGlobal = false,
}: SearchWidgetProps) {
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const { countries, featuredCountries } = useCountries();

  const [query, setQuery] = useState(defaultQuery);
  const [selectedCountry, setSelectedCountry] = useState(defaultCountry);
  const [results, setResults] = useState<Company[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showAllCountries, setShowAllCountries] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  // Set default country for single-tenant
  useEffect(() => {
    if (!isGlobal && tenant?.country_code && !selectedCountry) {
      setSelectedCountry(tenant.country_code);
    }
  }, [isGlobal, tenant, selectedCountry]);

  // Live search via edge function
  useEffect(() => {
    if (debouncedQuery.length < 3) {
      setResults([]);
      setShowResults(false);
      return;
    }

    async function runSearch() {
      if (!tenant) return;
      setIsSearching(true);
      try {
        const primaryCountry = selectedCountry || tenant.country_code || 'cy';
        // On the global Infocredit World tenant, when no country is explicitly
        // selected, also query Companies House UK and merge the results so UK
        // companies surface alongside API4ALL results.
        const shouldMergeUK =
          isGlobal && !selectedCountry && primaryCountry !== 'gb';

        const calls: Array<Promise<{ data: any; error: any }>> = [
          supabase.functions.invoke('search-companies', {
            body: {
              q: debouncedQuery,
              country: primaryCountry,
              tenant_id: tenant.id,
            },
          }),
        ];

        if (shouldMergeUK) {
          calls.push(
            supabase.functions.invoke('search-companies', {
              body: {
                q: debouncedQuery,
                country: 'gb',
                tenant_id: tenant.id,
              },
            }),
          );
        }

        const responses = await Promise.all(calls);
        const merged: Company[] = [];
        for (const r of responses) {
          if (!r.error && r.data?.results) {
            merged.push(...(r.data.results as Company[]));
          }
        }

        // Re-sort merged results: exact > startsWith > contains, then alpha
        const qU = debouncedQuery.toUpperCase();
        merged.sort((a, b) => {
          const aU = (a.name ?? '').toUpperCase();
          const bU = (b.name ?? '').toUpperCase();
          const score = (s: string) => (s === qU ? 0 : s.startsWith(qU) ? 1 : 2);
          const sa = score(aU);
          const sb_ = score(bU);
          return sa !== sb_ ? sa - sb_ : aU.localeCompare(bU);
        });

        // De-dup by id
        const seen = new Set<string>();
        const unique = merged.filter((c) => {
          if (seen.has(c.id)) return false;
          seen.add(c.id);
          return true;
        });

        setResults(unique.slice(0, 8));
        setShowResults(true);
        setHighlightIndex(-1);
      } finally {
        setIsSearching(false);
      }
    }

    runSearch();
  }, [debouncedQuery, selectedCountry, tenant, isGlobal]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
        setShowAllCountries(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSearch = useCallback(() => {
    if (!query.trim()) return;
    setShowResults(false);
    if (onSearch) {
      onSearch(query, selectedCountry);
    } else {
      const params = new URLSearchParams({ q: query });
      if (selectedCountry) params.set('country', selectedCountry);
      navigate(`/search?${params.toString()}`);
    }
  }, [query, selectedCountry, onSearch, navigate]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || results.length === 0) {
      if (e.key === 'Enter') handleSearch();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      if (highlightIndex >= 0 && highlightIndex < results.length) {
        e.preventDefault();
        handleResultClick(results[highlightIndex]);
      } else {
        handleSearch();
      }
    } else if (e.key === 'Escape') {
      setShowResults(false);
      setHighlightIndex(-1);
    }
  };

  const handleResultClick = (company: Company) => {
    setShowResults(false);
    navigate(`/company/${company.slug || company.id}`);
  };

  const filteredAllCountries = countries.filter((c) =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  );

  // Resolve the country currently shown in the picker button.
  // - Single-tenant (e.g. Cyprus): always the tenant's home country, locked.
  // - Global tenant (ICW): whatever the user picked, or null = "Choose country".
  const activeCountryCode = !isGlobal
    ? tenant?.country_code ?? null
    : selectedCountry || null;

  const activeCountry = activeCountryCode
    ? countries.find((x) => x.code === activeCountryCode) ?? null
    : null;

  const isHero = size === 'hero';

  return (
    <div ref={containerRef} className={`w-full ${isHero ? 'max-w-3xl mx-auto' : 'max-w-2xl'}`}>
      <div
        className={`flex rounded-lg overflow-visible shadow-lg ${isHero ? 'shadow-xl' : 'shadow-md'}`}
        style={{ background: '#fff', border: '1px solid var(--bg-border)' }}
      >
        {/* ── Country selector panel ── */}
        <div className="relative flex-shrink-0">
          <button
            type="button"
            disabled={!isGlobal}
            onClick={() => isGlobal && setShowAllCountries((v) => !v)}
            className={`flex items-center gap-2 px-4 border-r font-medium text-sm whitespace-nowrap select-none transition-colors ${
              isHero ? 'h-14 min-w-[180px]' : 'h-11 min-w-[150px]'
            } ${isGlobal ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'}`}
            style={{
              borderColor: 'var(--bg-border)',
              color: activeCountry ? 'var(--text-body)' : 'var(--text-muted)',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: '8px 0 0 8px',
            }}
            aria-haspopup={isGlobal ? 'listbox' : undefined}
            aria-expanded={isGlobal ? showAllCountries : undefined}
          >
            <span className="text-base leading-none">
              {activeCountry?.flag_emoji ?? '🌍'}
            </span>
            <span className="flex-1 text-left truncate">
              {activeCountry?.name ?? 'Choose country'}
            </span>
            {isGlobal && (
              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  showAllCountries ? 'rotate-180' : ''
                }`}
                style={{ color: 'var(--text-muted)' }}
              />
            )}
          </button>

          {/* All countries dropdown (global tenant only) */}
          {isGlobal && showAllCountries && (
            <div
              className="absolute top-full left-0 mt-1 w-72 bg-white rounded-lg shadow-xl border z-50 overflow-hidden"
              style={{ borderColor: 'var(--bg-border)' }}
            >
              <div className="p-2 border-b" style={{ borderColor: 'var(--bg-border)' }}>
                <input
                  type="text"
                  placeholder="Search countries..."
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  autoFocus
                  className="w-full px-3 py-1.5 text-sm rounded border outline-none"
                  style={{
                    borderColor: 'var(--bg-border)',
                    color: 'var(--text-body)',
                  }}
                />
              </div>
              <div className="max-h-64 overflow-y-auto py-1">
                {countrySearch === '' && featuredCountries.length > 0 && (
                  <>
                    <p
                      className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Popular
                    </p>
                    {featuredCountries.map((c: Country) => (
                      <button
                        key={`featured-${c.code}`}
                        type="button"
                        onClick={() => {
                          setSelectedCountry(c.code);
                          setShowAllCountries(false);
                          setCountrySearch('');
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                        style={{
                          color: 'var(--text-body)',
                          fontWeight: selectedCountry === c.code ? 600 : 400,
                        }}
                      >
                        <span>{c.flag_emoji}</span>
                        <span className="flex-1 text-left">{c.name}</span>
                      </button>
                    ))}
                    <div
                      className="my-1 border-t"
                      style={{ borderColor: 'var(--bg-border)' }}
                    />
                    <p
                      className="px-3 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      All countries
                    </p>
                  </>
                )}
                {countrySearch === '' && selectedCountry && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCountry('');
                      setShowAllCountries(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors italic"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <span>🌍</span>
                    <span className="flex-1 text-left">Any country</span>
                  </button>
                )}
                {filteredAllCountries.map((c: Country) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      setSelectedCountry(c.code);
                      setShowAllCountries(false);
                      setCountrySearch('');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                    style={{
                      color: 'var(--text-body)',
                      fontWeight: selectedCountry === c.code ? 600 : 400,
                    }}
                  >
                    <span>{c.flag_emoji}</span>
                    <span className="flex-1 text-left">{c.name}</span>
                  </button>
                ))}
                {filteredAllCountries.length === 0 && (
                  <p className="px-3 py-4 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                    No countries found
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Search input ── */}
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (results.length > 0) setShowResults(true);
              if (isGlobal && !selectedCountry) setShowAllCountries(true);
            }}
            placeholder="Search by company name or registration number..."
            className={`w-full pr-12 outline-none bg-transparent ${isHero ? 'h-14 px-4 text-base' : 'h-11 px-3 text-sm'}`}
            style={{ color: 'var(--text-body)' }}
            aria-label="Search companies"
            autoComplete="off"
          />

          {/* Loading spinner */}
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2
                className="w-4 h-4 animate-spin"
                style={{ color: 'var(--text-muted)' }}
              />
            </div>
          )}

          {/* Clear button */}
          {query && !isSearching && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
                setShowResults(false);
                inputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </button>
          )}

          {/* Live results dropdown */}
          {showResults && results.length > 0 && (
            <div
              className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl border z-50 overflow-hidden"
              style={{
                borderColor: 'var(--bg-border)',
                boxShadow: '0 24px 48px -12px rgba(15,36,68,0.18), 0 4px 12px -2px rgba(15,36,68,0.06)',
              }}
              role="listbox"
            >
              <div
                className="flex items-center justify-between px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] border-b"
                style={{
                  background: 'var(--bg-subtle)',
                  color: 'var(--text-muted)',
                  borderColor: 'var(--bg-border)',
                }}
              >
                <span>{results.length} match{results.length === 1 ? '' : 'es'}</span>
                <span className="hidden sm:inline-flex items-center gap-1">
                  <ArrowUpDown className="w-3 h-3" /> navigate
                  <CornerDownLeft className="w-3 h-3 ml-2" /> open
                </span>
              </div>

              <div className="max-h-[420px] overflow-y-auto">
                {results.map((company, idx) => {
                  const cc = (company.country_code ?? '').toUpperCase();
                  const ccMeta = countries.find((x) => x.code === cc);
                  const snippet = pickSnippet(company);
                  const isActive = idx === highlightIndex;
                  return (
                    <button
                      key={company.id}
                      type="button"
                      onClick={() => handleResultClick(company)}
                      onMouseEnter={() => setHighlightIndex(idx)}
                      className="w-full flex items-start gap-3 px-4 py-3 text-left border-b last:border-b-0 transition-colors"
                      style={{
                        borderColor: 'var(--bg-border)',
                        background: isActive ? 'var(--bg-subtle)' : 'transparent',
                      }}
                      role="option"
                      aria-selected={isActive}
                    >
                      {/* Flag chip */}
                      <span
                        className="flex-shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg text-lg"
                        style={{
                          background: 'var(--bg-subtle)',
                          border: '1px solid var(--bg-border)',
                        }}
                        title={ccMeta?.name ?? cc}
                      >
                        {ccMeta?.flag_emoji ?? '🌐'}
                      </span>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p
                            className="text-sm font-semibold truncate"
                            style={{ color: 'var(--text-heading)' }}
                          >
                            {highlightMatch(company.name, debouncedQuery)}
                          </p>
                          {company.status && (
                            <StatusBadge status={company.status} className="flex-shrink-0" />
                          )}
                        </div>

                        <div
                          className="flex items-center gap-3 mt-1 text-xs"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {cc && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {ccMeta?.name ?? cc}
                            </span>
                          )}
                          {company.reg_no && (
                            <span className="inline-flex items-center gap-1 truncate">
                              <Hash className="w-3 h-3" />
                              {highlightMatch(company.reg_no, debouncedQuery)}
                            </span>
                          )}
                          {company.legal_form && !snippet && (
                            <span className="inline-flex items-center gap-1 truncate">
                              <Building2 className="w-3 h-3" />
                              {company.legal_form}
                            </span>
                          )}
                        </div>

                        {snippet && (
                          <p
                            className="text-xs mt-1 truncate flex items-center gap-1"
                            style={{ color: 'var(--text-body)' }}
                          >
                            {snippet.kind === 'address' && <MapPin className="w-3 h-3 flex-shrink-0 opacity-60" />}
                            {snippet.kind === 'sector' && <Building2 className="w-3 h-3 flex-shrink-0 opacity-60" />}
                            {snippet.kind === 'form' && <Building2 className="w-3 h-3 flex-shrink-0 opacity-60" />}
                            <span className="truncate">{snippet.value}</span>
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleSearch}
                className="w-full px-4 py-3 text-sm font-semibold text-center transition-colors flex items-center justify-center gap-1.5 border-t"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--brand-accent)',
                  borderColor: 'var(--bg-border)',
                }}
              >
                See all results for "{query}"
                <CornerDownLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* No results */}
          {showResults && !isSearching && results.length === 0 && query.length >= 3 && (
            <div
              className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl border z-50 px-6 py-8 text-center"
              style={{
                borderColor: 'var(--bg-border)',
                boxShadow: '0 24px 48px -12px rgba(15,36,68,0.18)',
              }}
            >
              <Search className="w-6 h-6 mx-auto mb-2 opacity-40" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--text-heading)' }}>
                No companies found for "{query}"
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Try a different spelling or registration number.
              </p>
            </div>
          )}
        </div>

        {/* ── Search button ── */}
        <button
          type="button"
          onClick={handleSearch}
          className={`flex items-center justify-center flex-shrink-0 font-semibold transition-all active:scale-95 ${isHero ? 'w-14' : 'w-11'}`}
          style={{
            backgroundColor: 'var(--brand-accent)',
            borderRadius: '0 6px 6px 0',
          }}
          onMouseOver={(e) =>
            (e.currentTarget.style.backgroundColor = 'var(--brand-accent-hover)')
          }
          onMouseOut={(e) =>
            (e.currentTarget.style.backgroundColor = 'var(--brand-accent)')
          }
          aria-label="Search"
        >
          <Search className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Hint for global tenant when no country picked */}
      {isGlobal && !selectedCountry && (
        <p
          className={`text-xs mt-2 ${isHero ? 'text-center' : 'text-left'}`}
          style={{ color: 'var(--text-muted)' }}
        >
          💡 Tip: pick a country for faster, more accurate results.
        </p>
      )}
    </div>
  );
}
