import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import PageLayout from '../components/layout/PageLayout';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import { useTenant } from '../lib/tenant.tsx';
import { useCountries } from '../lib/countries';
import { supabase } from '@/integrations/supabase/client';

interface CompanyRow {
  id: string;
  name: string;
  slug: string | null;
  reg_no: string | null;
  status: string | null;
  country_code: string;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function CompanyBrowseByLetterPage() {
  const { letter } = useParams<{ letter: string }>();
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const { countries } = useCountries();

  const activeLetter = (letter ?? 'a').toUpperCase();

  const [allCompanies, setAllCompanies] = useState<CompanyRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // Reset page when letter changes
  useEffect(() => { setPage(1); }, [activeLetter]);

  const totalPages = Math.max(1, Math.ceil(allCompanies.length / PAGE_SIZE));
  const companies = allCompanies.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const countryName =
    tenant?.country_code
      ? countries.find((c) => c.code.toUpperCase() === tenant.country_code?.toUpperCase())?.name ?? 'companies'
      : 'companies';

  useEffect(() => {
    if (!tenant) return;

    async function load() {
      setIsLoading(true);

      try {
        // Call the search-companies edge function with the letter
        const { data, error } = await supabase.functions.invoke('search-companies', {
          body: {
            q: activeLetter,
            country: tenant!.country_code || 'cy',
            tenant_id: tenant!.id,
          },
        });

        if (!error && data?.results && data.results.length > 0) {
          // Filter to only companies starting with the active letter
          const filtered = (data.results as CompanyRow[]).filter((c) =>
            c.name.toUpperCase().startsWith(activeLetter)
          );
          // Sort alphabetically
          filtered.sort((a, b) => a.name.localeCompare(b.name));
          setAllCompanies(filtered);
          setDataSource(data.source ?? 'api4all');
          setIsLoading(false);
          return;
        }
      } catch {
        // Fall through to cache
      }

      // Fallback: query local cache
      const { data: cached } = await supabase
        .from('companies')
        .select('id, name, slug, reg_no, status, country_code')
        .eq('tenant_id', tenant!.id)
        .ilike('name', `${activeLetter}%`)
        .order('name', { ascending: true })
        .limit(200);

      if (cached) {
        setAllCompanies(cached as CompanyRow[]);
        setDataSource('cache');
      }
      setIsLoading(false);
    }

    load();
  }, [activeLetter, tenant]);

  return (
    <PageLayout>
      <Helmet>
        <title>
          Companies starting with "{activeLetter}" | {tenant?.brand_name ?? 'Companies House'}
        </title>
        <meta
          name="description"
          content={`Browse ${countryName} companies starting with the letter ${activeLetter}. View company profiles and order reports.`}
        />
      </Helmet>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Page heading */}
        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-heading)' }}>
          Browse {countryName} Companies A–Z
        </h1>

        {/* A–Z navigation */}
        <div className="flex flex-wrap gap-1.5 mb-8">
          {ALPHABET.map((l) => (
            <button
              key={l}
              onClick={() => navigate(`/companies/${l.toLowerCase()}`)}
              className="px-3 py-2 rounded text-sm font-medium border transition-all active:scale-95"
              style={
                l === activeLetter
                  ? {
                      backgroundColor: 'var(--brand-primary)',
                      color: '#fff',
                      borderColor: 'var(--brand-primary)',
                      fontWeight: 700,
                      borderRadius: '6px',
                    }
                  : {
                      backgroundColor: '#fff',
                      color: 'var(--text-body)',
                      borderColor: 'var(--bg-border)',
                      borderRadius: '6px',
                    }
              }
              onMouseEnter={(e) => {
                if (l !== activeLetter) {
                  e.currentTarget.style.backgroundColor = 'var(--brand-primary)';
                  e.currentTarget.style.color = '#fff';
                  e.currentTarget.style.borderColor = 'var(--brand-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (l !== activeLetter) {
                  e.currentTarget.style.backgroundColor = '#fff';
                  e.currentTarget.style.color = 'var(--text-body)';
                  e.currentTarget.style.borderColor = 'var(--bg-border)';
                }
              }}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Results count */}
        {!isLoading && (
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            {companies.length} {companies.length === 1 ? 'company' : 'companies'} starting with{' '}
            <strong style={{ color: 'var(--text-body)' }}>{activeLetter}</strong>
            {dataSource === 'cache' && (
              <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                (from cache)
              </span>
            )}
          </p>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <LoadingSkeleton key={i} lines={1} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && companies.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-lg" style={{ color: 'var(--text-muted)' }}>
              No companies found starting with <strong>{activeLetter}</strong>
            </p>
            <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
              Try a different letter or{' '}
              <Link to="/search" style={{ color: 'var(--brand-accent)' }} className="hover:underline">
                search by name
              </Link>
            </p>
          </div>
        )}

        {/* Results table */}
        {!isLoading && companies.length > 0 && (
          <div
            className="rounded-lg border overflow-hidden"
            style={{ borderColor: 'var(--bg-border)' }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-subtle)' }}>
                  <th
                    className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Company Name
                  </th>
                  <th
                    className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide hidden sm:table-cell"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Reg Number
                  </th>
                  <th
                    className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Status
                  </th>
                  <th
                    className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company, idx) => (
                  <tr
                    key={company.id}
                    className="border-t transition-all cursor-pointer group"
                    style={{
                      borderColor: 'var(--bg-border)',
                      backgroundColor: idx % 2 === 0 ? '#fff' : 'var(--bg-subtle)',
                    }}
                    onClick={() => navigate(`/company/${company.slug ?? company.id}`)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderLeft = '3px solid var(--brand-accent)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderLeft = '';
                    }}
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`/company/${company.slug ?? company.id}`}
                        className="font-medium hover:underline"
                        style={{ color: 'var(--brand-accent)' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {company.name}
                      </Link>
                    </td>
                    <td
                      className="px-4 py-3 hidden sm:table-cell"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {company.reg_no ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {company.status ? (
                        <StatusBadge status={company.status} />
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/company/${company.slug ?? company.id}`}
                        className="hover:underline text-sm font-medium"
                        style={{ color: 'var(--brand-accent)' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
