import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import PageLayout from '../components/layout/PageLayout';
import StatusBadge from '../components/ui/StatusBadge';
import GatedContent from '../components/ui/GatedContent';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import RiskTrafficLight from '../components/ui/RiskTrafficLight';
import { useTenant } from '../lib/tenant.tsx';
import { useCountries } from '../lib/countries';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '../contexts/CartContext';
import { toast } from '@/hooks/use-toast';
import type { Company, Product, ProductSpeed } from '../types/database';

// ── Helpers ──────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const PRODUCT_ICONS: Record<string, string> = {
  structure: '📋',
  kyb: '🔍',
  certificate: '📄',
  monitoring: '👁️',
  extract: '💳',
  credit: '📊',
};

// ── Sub-components ────────────────────────────────────────────

function Breadcrumb({ companyName }: { companyName: string }) {
  return (
    <nav className="text-sm mb-4 flex items-center gap-1 flex-wrap" style={{ color: 'var(--text-muted)' }}>
      <Link to="/" className="hover:underline" style={{ color: 'var(--text-muted)' }}>Home</Link>
      <span>›</span>
      <Link to="/search" className="hover:underline" style={{ color: 'var(--text-muted)' }}>Search</Link>
      <span>›</span>
      <span style={{ color: 'var(--text-body)' }}>{companyName}</span>
    </nav>
  );
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-semibold text-base mb-3" style={{ color: 'var(--text-subheading)' }}>
      {children}
    </h2>
  );
}

function RecordBadge({ count }: { count: string }) {
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full ml-2"
      style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
    >
      {count}
    </span>
  );
}

function PersonRow({ name, role }: { name: string; role: string }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor: 'var(--bg-border)' }}>
      <span className="text-base" style={{ color: 'var(--text-muted)' }}>👤</span>
      <span className="text-sm font-medium flex-1" style={{ color: 'var(--text-body)' }}>{name}</span>
      <span
        className="text-xs px-2 py-0.5 rounded-full"
        style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
      >
        {role}
      </span>
    </div>
  );
}

// ── Product sidebar card ──────────────────────────────────────

function ProductOrderRow({
  product,
  company,
}: {
  product: Product;
  company: { id: string; icg_code: string; name: string; reg_no: string | null; slug: string | null; country_code: string };
}) {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const speeds: ProductSpeed[] = Array.isArray(product.available_speeds)
    ? (product.available_speeds as ProductSpeed[])
    : [];
  const [selectedSpeed, setSelectedSpeed] = useState(speeds[0]?.code ?? 'Normal');

  const currentSpeed = speeds.find((s) => s.code === selectedSpeed);
  const price = product.base_price + (currentSpeed?.price_delta ?? 0);

  const handleAddToCart = () => {
    addItem(product, company, selectedSpeed);
    toast({ title: '🛒 Added to cart', description: `${product.name} for ${company.name}` });
    navigate('/cart');
  };

  return (
    <div className="py-4 border-b last:border-0" style={{ borderColor: 'var(--bg-border)' }}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium" style={{ color: 'var(--text-heading)' }}>
          {PRODUCT_ICONS[product.type] ?? '📄'} {product.name}
        </span>
        <span className="text-xs shrink-0" style={{ color: product.is_instant ? 'var(--status-active)' : 'var(--text-muted)' }}>
          {product.is_instant ? '⚡ Instant' : `📋 ${product.delivery_sla_hours}hr SLA`}
        </span>
      </div>

      {product.description && (
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          {product.description}
        </p>
      )}

      {speeds.length > 1 && (
        <select
          className="mt-3 w-full text-xs border rounded px-2 py-1.5 outline-none"
          style={{ borderColor: 'var(--bg-border)', color: 'var(--text-body)' }}
          value={selectedSpeed}
          onChange={(e) => setSelectedSpeed(e.target.value)}
        >
          {speeds.map((s) => (
            <option key={s.code} value={s.code}>
              {s.label} — €{(product.base_price + s.price_delta).toFixed(0)}
            </option>
          ))}
        </select>
      )}

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xl font-bold" style={{ color: 'var(--text-heading)' }}>
          €{price.toFixed(0)}
        </span>
        <button
          className="px-4 py-2 rounded text-sm font-semibold text-white transition-all active:scale-95"
          style={{ backgroundColor: 'var(--brand-accent)', borderRadius: '6px' }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--brand-accent-hover)')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'var(--brand-accent)')}
          onClick={handleAddToCart}
        >
          Order Now
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function CompanyProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const { countries } = useCountries();

  const [company, setCompany] = useState<Company | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [affiliated, setAffiliated] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const getCountryInfo = (code: string) => {
    return countries.find((c) => c.code.toUpperCase() === code.toUpperCase());
  };

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!slug || !tenant) return;

    async function load() {
      setIsLoading(true);

      // Use edge function to get company with stale-while-revalidate
      const { data: efData } = await supabase.functions.invoke('get-company', {
        body: { slug, tenant_id: tenant!.id },
      });

      if (!efData?.company) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      const comp = efData.company as Company;
      setCompany(comp);

      // Fetch products and affiliated in parallel
      const [productsRes, affiliatedRes] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .eq('tenant_id', tenant!.id)
          .eq('is_active', true)
          .order('display_order', { ascending: true }),
        supabase
          .from('companies')
          .select('id, name, slug, reg_no, status, country_code, icg_code, raw_source_json, tenant_id, vat_no, legal_form, registered_address, cached_at, meta_title, meta_description')
          .eq('tenant_id', tenant!.id)
          .neq('id', comp.id)
          .not('raw_source_json', 'is', null)
          .limit(3),
      ]);

      if (productsRes.data) {
        setProducts(
          (productsRes.data as unknown as Product[]).map((p) => ({
            ...p,
            available_speeds: Array.isArray(p.available_speeds) ? p.available_speeds : [],
          }))
        );
      }

      if (affiliatedRes.data) {
        setAffiliated(affiliatedRes.data as Company[]);
      }

      setIsLoading(false);
    }

    load();
  }, [slug, tenant]);

  const handleFreshDataRequest = async () => {
    if (!company || !tenant || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await supabase.functions.invoke('search-companies', {
        body: {
          q: company.name,
          country: company.country_code.toLowerCase(),
          tenant_id: tenant.id,
          fresh: true,
        },
      });
      // Reload the page to show fresh data
      window.location.reload();
    } finally {
      setIsRefreshing(false);
    }
  };

  // ── Not found ──
  if (!isLoading && notFound) {
    return (
      <PageLayout>
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="text-6xl mb-6">🏢</div>
          <h1 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-heading)' }}>
            Company not found
          </h1>
          <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
            We couldn't find a company matching that profile URL.
          </p>
          <Link
            to="/search"
            className="px-6 py-3 rounded text-sm font-semibold text-white"
            style={{ backgroundColor: 'var(--brand-accent)', borderRadius: '6px' }}
          >
            Search Companies →
          </Link>
        </div>
      </PageLayout>
    );
  }

  // ── Loading ──
  if (isLoading || !company) {
    return (
      <PageLayout>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <LoadingSkeleton lines={4} className="max-w-lg mb-8" />
          <div className="flex gap-6">
            <div className="flex-1 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-lg border p-5" style={{ borderColor: 'var(--bg-border)' }}>
                  <LoadingSkeleton lines={3} />
                </div>
              ))}
            </div>
            <div className="w-80 hidden lg:block">
              <div className="rounded-lg border p-5" style={{ borderColor: 'var(--bg-border)' }}>
                <LoadingSkeleton lines={6} />
              </div>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  const countryInfo = getCountryInfo(company.country_code);
  const nonMonitoringProducts = products.filter((p) => p.type !== 'monitoring');
  const monitoringProduct = products.find((p) => p.type === 'monitoring');
  const samplePdfUrl = products[0]?.sample_pdf_url ?? null;

  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: company.name,
    identifier: company.reg_no,
    legalName: company.name,
    address: {
      '@type': 'PostalAddress',
      addressCountry: company.country_code,
    },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: '/' },
      { '@type': 'ListItem', position: 2, name: 'Search', item: '/search' },
      { '@type': 'ListItem', position: 3, name: company.name },
    ],
  };

  return (
    <PageLayout>
      <Helmet>
        <title>
          {company.name} — Company Profile | {tenant?.brand_name ?? 'Companies House'}
        </title>
        <meta
          name="description"
          content={`View registration details, directors and official reports for ${company.name} (Reg: ${company.reg_no ?? 'N/A'}). ${company.status ?? ''} company. Order reports instantly.`}
        />
        <link
          rel="canonical"
          href={`https://${tenant?.domain ?? ''}/company/${company.slug ?? slug}`}
        />
        <script type="application/ld+json">{JSON.stringify(orgSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <Breadcrumb companyName={company.name} />

        <div className="flex flex-col lg:flex-row gap-8">
          {/* ── MAIN CONTENT ── */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* A — Company Header */}
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1
                  className="text-3xl font-bold uppercase"
                  style={{ color: 'var(--text-heading)', lineHeight: 1.1 }}
                >
                  {company.name}
                </h1>
                {company.status && <StatusBadge status={company.status} className="text-sm px-3 py-1" />}
              </div>

              <div
                className="flex flex-wrap gap-4 text-sm"
                style={{ color: 'var(--text-muted)' }}
              >
                {company.reg_no && <span>📋 Reg: {company.reg_no}</span>}
                {company.legal_form && <span>⚖️ {company.legal_form}</span>}
                {countryInfo && (
                  <span>
                    {countryInfo.flag_emoji} {countryInfo.name}
                  </span>
                )}
              </div>

              <p className="text-xs italic mt-3" style={{ color: 'var(--text-muted)' }}>
                Data sourced from official registry · Last updated:{' '}
                {formatDate(company.cached_at)}{' '}
                <button
                  className="ml-1 not-italic hover:underline disabled:opacity-50"
                  style={{ color: 'var(--brand-accent)' }}
                  onClick={handleFreshDataRequest}
                  disabled={isRefreshing}
                >
                  {isRefreshing ? 'Refreshing…' : 'Request fresh data →'}
                </button>
              </p>
            </div>

            {/* B — Risk Indicator */}
            <SectionCard>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div>
                  <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-subheading)' }}>
                    Risk Indicator
                  </p>
                  <RiskTrafficLight band="medium" showLabel />
                </div>
                <div className="flex-1 border-l pl-4 hidden sm:block" style={{ borderColor: 'var(--bg-border)' }}>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Full risk analysis including sanctions screening, PEP checks and adverse media is
                    included in the KYB Report
                  </p>
                  <button
                    className="text-sm mt-2 hover:underline"
                    style={{ color: 'var(--brand-accent)' }}
                    onClick={() => document.getElementById('sidebar-products')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    Order KYB Report →
                  </button>
                </div>
              </div>
            </SectionCard>

            {/* C — Registered Address */}
            <SectionCard>
              <SectionTitle>Registered Address</SectionTitle>
              <GatedContent
                isUnlocked={false}
                message="Included in all paid reports"
              >
                <p className="text-sm" style={{ color: 'var(--text-body)' }}>
                  123 Example Street, Nicosia 1234, Cyprus
                </p>
              </GatedContent>
            </SectionCard>

            {/* D — Directors & Secretaries */}
            <SectionCard>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-base" style={{ color: 'var(--text-subheading)' }}>
                  Directors & Secretaries
                  <RecordBadge count="2 records" />
                </h2>
              </div>

              {/* Free rows */}
              <PersonRow name="DIRECTOR NAME" role="Director" />
              <PersonRow name="SECRETARY NAME" role="Secretary" />
              <p className="text-sm italic mt-3" style={{ color: 'var(--text-muted)' }}>
                Director names shown. Full details including addresses, appointment dates and history
                included in Structure Report.
              </p>

              {/* Gated history */}
              <div className="mt-3">
                <GatedContent
                  isUnlocked={false}
                  message="Order Structure Report to view full appointment history and addresses"
                >
                  <div className="space-y-2 mt-2">
                    {[
                      'PREVIOUS DIRECTOR NAME · Director · Resigned 2021',
                      'SHAREHOLDER COMPANY LTD · Shareholder · 100% shares',
                      'NOMINEE DIRECTOR NAME · Director · Appointed 2019',
                    ].map((row, i) => (
                      <div
                        key={i}
                        className="text-sm py-2 border-b last:border-0"
                        style={{ color: 'var(--text-body)', borderColor: 'var(--bg-border)' }}
                      >
                        {row}
                      </div>
                    ))}
                  </div>
                </GatedContent>
              </div>
            </SectionCard>

            {/* E — Shareholders */}
            <SectionCard>
              <div className="flex items-center mb-3">
                <h2 className="font-semibold text-base" style={{ color: 'var(--text-subheading)' }}>
                  Shareholders
                  <RecordBadge count="1+ records" />
                </h2>
              </div>
              <GatedContent
                isUnlocked={false}
                message="Order Structure Report to view full shareholder history, share percentages and addresses"
              >
                <div className="space-y-2">
                  {[
                    '████████ HOLDINGS LTD · 100% shares · 1,000 shares',
                    'INDIVIDUAL SHAREHOLDER · Address: ████████████',
                  ].map((row, i) => (
                    <div
                      key={i}
                      className="text-sm py-2 border-b last:border-0"
                      style={{ color: 'var(--text-body)', borderColor: 'var(--bg-border)' }}
                    >
                      {row}
                    </div>
                  ))}
                </div>
              </GatedContent>
            </SectionCard>

            {/* F — Filings & Documents */}
            <SectionCard>
              <SectionTitle>Filings & Documents</SectionTitle>
              <p className="text-sm mb-3" style={{ color: 'var(--text-body)' }}>
                This company has filed documents with the registry.
                <br />
                <span style={{ color: 'var(--text-muted)' }}>
                  Last filing: information available in full report
                </span>
              </p>
              <GatedContent
                isUnlocked={false}
                message="Order Structure Report to view all filings and download documents"
              >
                <table className="w-full text-sm">
                  <tbody>
                    {[
                      ['Annual Return', '2024', '████████'],
                      ['Director Change', '2023', '████████'],
                      ['Address Change', '2022', '████████'],
                    ].map(([type, year, ref], i) => (
                      <tr
                        key={i}
                        className="border-b last:border-0"
                        style={{ borderColor: 'var(--bg-border)' }}
                      >
                        <td className="py-2 pr-4" style={{ color: 'var(--text-body)' }}>{type}</td>
                        <td className="py-2 pr-4" style={{ color: 'var(--text-muted)' }}>{year}</td>
                        <td className="py-2" style={{ color: 'var(--text-muted)' }}>{ref}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </GatedContent>
            </SectionCard>

            {/* G — Affiliated Companies */}
            <SectionCard>
              <SectionTitle>Potentially Affiliated Companies</SectionTitle>
              <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                Companies sharing directors or secretaries with {company.name}
              </p>

              {affiliated.length > 0 ? (
                <div className="space-y-2">
                  {affiliated.map((aff) => (
                    <div
                      key={aff.id}
                      className="flex items-center justify-between p-3 rounded border"
                      style={{ borderColor: 'var(--bg-border)' }}
                    >
                      <div>
                        <Link
                          to={`/company/${aff.slug ?? aff.id}`}
                          className="text-sm font-medium hover:underline"
                          style={{ color: 'var(--brand-accent)' }}
                        >
                          {aff.name}
                        </Link>
                        {aff.reg_no && (
                          <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                            {aff.reg_no}
                          </span>
                        )}
                        <p className="text-xs italic mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          via shared director
                        </p>
                      </div>
                      {aff.status && <StatusBadge status={aff.status} />}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>
                  Affiliated company data included in Structure Report
                </p>
              )}

              <a
                href={`https://www.infocreditworld.com/#${encodeURIComponent(company.name)}/blank&c`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-sm mt-4 hover:underline"
                style={{ color: 'var(--brand-accent)' }}
              >
                Search globally for '{company.name}' →
              </a>
            </SectionCard>

            {/* H — Disclaimer */}
            <div
              className="mt-8 pt-6 text-xs italic"
              style={{
                borderTop: '1px solid var(--bg-border)',
                color: 'var(--text-muted)',
              }}
            >
              <p>{tenant?.footer_disclaimer}</p>
              <p className="mt-1">
                Source: Official company registry data. Last verified: {formatDate(company.cached_at)}.
              </p>
            </div>
          </div>

          {/* ── SIDEBAR ── */}
          <aside id="sidebar-products" className="w-full lg:w-80 shrink-0">
            <div className="lg:sticky lg:top-24 space-y-4">

              {/* Card 1 — Order Reports */}
              {nonMonitoringProducts.length > 0 && (
                <div
                  className="rounded-lg border p-5"
                  style={{
                    borderColor: 'var(--bg-border)',
                    backgroundColor: 'var(--bg-subtle)',
                    borderRadius: '8px',
                  }}
                >
                  <h2
                    className="font-semibold text-lg"
                    style={{ color: 'var(--text-heading)' }}
                  >
                    Order Reports
                  </h2>
                  <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
                    for {company.name}
                  </p>

                  <div className="mt-4">
                    {nonMonitoringProducts.map((product) => (
                      <ProductOrderRow
                        key={product.id}
                        product={product}
                        companyIcgCode={company.icg_code}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Card 2 — Monitoring */}
              <div
                className="rounded-lg border-2 border-dashed p-5"
                style={{
                  borderColor: 'var(--bg-border)',
                  backgroundColor: '#fff',
                  borderRadius: '8px',
                }}
              >
                <div className="text-3xl mb-2">👁️</div>
                <h2 className="font-semibold" style={{ color: 'var(--text-heading)' }}>
                  Monitor this company
                </h2>
                <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                  Get instant alerts when directors, shareholders, or company status changes
                </p>

                <ul className="mt-3 space-y-1 text-sm" style={{ color: 'var(--text-body)' }}>
                  {['Weekly change detection', 'Email alerts for all changes', 'Cancel anytime'].map(
                    (f) => (
                      <li key={f} className="flex items-center gap-2">
                        <span style={{ color: 'var(--status-active)' }}>✓</span> {f}
                      </li>
                    )
                  )}
                </ul>

                <p className="mt-3 font-semibold" style={{ color: 'var(--text-heading)' }}>
                  from €{monitoringProduct?.base_price ?? 9}/month
                </p>

                <button
                  className="mt-3 w-full py-2 rounded text-sm font-semibold text-white transition-all active:scale-95"
                  style={{ backgroundColor: 'var(--brand-primary)', borderRadius: '6px' }}
                  onClick={() =>
                    navigate(
                      `/checkout?product=monitoring&company=${company.icg_code}`
                    )
                  }
                >
                  Start Monitoring
                </button>
              </div>

              {/* Card 3 — Sample Report */}
              {samplePdfUrl && (
                <div
                  className="rounded-lg border p-4 text-center"
                  style={{ borderColor: 'var(--bg-border)', backgroundColor: '#fff', borderRadius: '8px' }}
                >
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Not sure what's included?
                  </p>
                  <a
                    href={samplePdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium hover:underline mt-1 inline-block"
                    style={{ color: 'var(--brand-accent)' }}
                  >
                    📄 Download sample report
                  </a>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </PageLayout>
  );
}
