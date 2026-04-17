import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, ChevronDown, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../lib/tenant';
import { useCountries } from '../../lib/countries';
import StatusBadge from '../ui/StatusBadge';
import type { Company, Country } from '../../types/database';

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
    if (e.key === 'Enter') handleSearch();
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
          {!isGlobal ? (
            /* Single-country: disabled chip */
            <div
              className={`flex items-center gap-2 px-3 border-r font-medium text-sm whitespace-nowrap select-none ${isHero ? 'h-14' : 'h-11'}`}
              style={{
                borderColor: 'var(--bg-border)',
                color: 'var(--text-body)',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: '8px 0 0 8px',
              }}
            >
              {resolvedCountryName || '🌍 Select country'}
            </div>
          ) : (
            /* Global: featured chips + dropdown */
            <div
              className={`flex flex-wrap items-center gap-1.5 px-3 py-2 border-r max-w-xs ${isHero ? 'min-h-14' : 'min-h-11'}`}
              style={{
                borderColor: 'var(--bg-border)',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: '8px 0 0 8px',
              }}
            >
              {featuredCountries.slice(0, 5).map((c: Country) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() =>
                    setSelectedCountry((prev) => (prev === c.code ? '' : c.code))
                  }
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition-all"
                  style={{
                    backgroundColor:
                      selectedCountry === c.code ? 'var(--brand-primary)' : '#fff',
                    color:
                      selectedCountry === c.code ? '#fff' : 'var(--text-body)',
                    borderColor:
                      selectedCountry === c.code
                        ? 'var(--brand-primary)'
                        : 'var(--bg-border)',
                  }}
                >
                  <span>{c.flag_emoji}</span>
                  <span>{c.name}</span>
                </button>
              ))}

              {/* All countries dropdown trigger */}
              <button
                type="button"
                onClick={() => setShowAllCountries((v) => !v)}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition-all"
                style={{
                  borderColor: 'var(--bg-border)',
                  color: 'var(--text-body)',
                  backgroundColor: '#fff',
                }}
              >
                All countries
                <ChevronDown className="w-3 h-3" />
              </button>

              {/* All countries dropdown */}
              {showAllCountries && (
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
                      className="w-full px-3 py-1.5 text-sm rounded border outline-none"
                      style={{
                        borderColor: 'var(--bg-border)',
                        color: 'var(--text-body)',
                      }}
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto py-1">
                    {filteredAllCountries.map((c: Country) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => {
                          setSelectedCountry(c.code);
                          setShowAllCountries(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                        style={{
                          color: 'var(--text-body)',
                          fontWeight: selectedCountry === c.code ? 600 : 400,
                        }}
                      >
                        <span>{c.flag_emoji}</span>
                        <span>{c.name}</span>
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
              className="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg shadow-xl border z-50 overflow-hidden"
              style={{ borderColor: 'var(--bg-border)' }}
            >
              {results.map((company) => {
                const cc = (company.country_code ?? '').toUpperCase();
                const ccMeta = countries.find((x) => x.code === cc);
                return (
                  <button
                    key={company.id}
                    type="button"
                    onClick={() => handleResultClick(company)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b last:border-b-0"
                    style={{ borderColor: 'var(--bg-border)' }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-heading)' }}>
                        {company.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {cc && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border"
                            style={{
                              borderColor: 'var(--bg-border)',
                              backgroundColor: 'var(--bg-subtle)',
                              color: 'var(--text-body)',
                            }}
                            title={ccMeta?.name ?? cc}
                          >
                            <span>{ccMeta?.flag_emoji ?? '🌐'}</span>
                            <span>{cc}</span>
                          </span>
                        )}
                        {company.reg_no && (
                          <span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                            Reg: {company.reg_no}
                          </span>
                        )}
                      </div>
                    </div>
                    {company.status && (
                      <StatusBadge status={company.status} className="ml-3 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={handleSearch}
                className="w-full px-4 py-2.5 text-sm font-medium text-center transition-colors"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--brand-accent)',
                }}
              >
                See all results for "{query}" →
              </button>
            </div>
          )}

          {/* No results */}
          {showResults && !isSearching && results.length === 0 && query.length >= 3 && (
            <div
              className="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg shadow-xl border z-50 px-4 py-6 text-center"
              style={{ borderColor: 'var(--bg-border)' }}
            >
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                No companies found for "{query}"
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
    </div>
  );
}
