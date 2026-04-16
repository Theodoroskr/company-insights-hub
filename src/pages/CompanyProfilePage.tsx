import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Check, ShoppingCart } from 'lucide-react';
import PageLayout from '../components/layout/PageLayout';
import StatusBadge from '../components/ui/StatusBadge';
import GatedContent from '../components/ui/GatedContent';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import RiskTrafficLight from '../components/ui/RiskTrafficLight';
import CountryFlag from '../components/ui/CountryFlag';
import CoverageTierBadge from '../components/ui/CoverageTierBadge';
import OrderReportModal from '../components/orders/OrderReportModal';
import UKCompanySections from '../components/company/UKCompanySections';
import { useTenant } from '../lib/tenant.tsx';
import { useCountries } from '../lib/countries';
import { useCart } from '../contexts/CartContext';
import { supabase } from '@/integrations/supabase/client';
import { legalFormToEntityType } from '@/data/cyprusCertificates';
import type { Company, Product, ProductSpeed, DirectorEntry } from '../types/database';

// ── Helpers ──────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Partially mask a name: show first word + first letter of subsequent words */
function maskName(fullName: string): string {
  const words = fullName.trim().split(/\s+/);
  if (words.length <= 1) {
    // Single word: show first 3 chars + mask rest
    if (fullName.length <= 3) return fullName;
    return fullName.slice(0, 3) + '████';
  }
  // Show first word fully, mask rest (show first letter only)
  return words.map((w, i) => {
    if (i === 0) return w;
    if (w.length <= 1) return w;
    return w[0] + '████';
  }).join(' ');
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
      <Link to="/company/search" className="hover:underline" style={{ color: 'var(--text-muted)' }}>Search</Link>
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
  const speeds: ProductSpeed[] = Array.isArray(product.available_speeds)
    ? (product.available_speeds as ProductSpeed[])
    : [];
  const currentSpeed = speeds[0];
  const price = product.base_price + (currentSpeed?.price_delta ?? 0);
  const [modalOpen, setModalOpen] = useState(false);

  const companyForModal = company as unknown as import('../types/database').Company;

  const handleSample = () => {
    if (product.sample_pdf_url) {
      window.open(product.sample_pdf_url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="py-3 border-b last:border-0" style={{ borderColor: 'var(--bg-border)' }}>
      {/* Name + delivery */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium" style={{ color: 'var(--text-heading)' }}>
          {PRODUCT_ICONS[product.type] ?? '📄'} {product.name}
        </span>
        <span
          className="text-xs shrink-0"
          style={{ color: product.is_instant ? 'var(--status-active)' : 'var(--text-muted)' }}
        >
          {product.is_instant ? '⚡ Instant' : `${product.delivery_sla_hours}hr`}
        </span>
      </div>

      {/* Price pill + buttons */}
      <div className="mt-2.5 flex items-center gap-2">
        {/* Price pill */}
        <span
          className="text-sm font-semibold text-center"
          style={{
            border: '1px solid var(--bg-border)',
            borderRadius: '999px',
            padding: '2px 10px',
            minWidth: '60px',
            color: 'var(--text-heading)',
            display: 'inline-block',
          }}
        >
          €{price.toFixed(0)}
        </span>

        {/* Sample button (outlined) */}
        {product.sample_pdf_url && (
          <button
            onClick={handleSample}
            className="px-3 py-1.5 rounded text-xs font-medium border transition-all active:scale-95 hover:bg-opacity-5"
            style={{
              borderColor: 'var(--brand-accent)',
              color: 'var(--brand-accent)',
              borderRadius: '6px',
            }}
          >
            Sample
          </button>
        )}

        {/* Order Now button */}
        <button
          className="ml-auto px-3 py-1.5 rounded text-xs font-semibold text-white transition-all active:scale-95"
          style={{ backgroundColor: 'var(--brand-accent)', borderRadius: '6px' }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--brand-accent-hover)')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'var(--brand-accent)')}
          onClick={() => setModalOpen(true)}
        >
          Order Now
        </button>
      </div>

      <OrderReportModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        preselectedProduct={product}
        preselectedCompany={companyForModal}
      />
    </div>
  );
}

// ── Collapsible product section ───────────────────────────────

function ProductSection({
  title,
  products,
  company,
  defaultVisible = 3,
}: {
  title: string;
  products: Product[];
  company: { id: string; icg_code: string; name: string; reg_no: string | null; slug: string | null; country_code: string };
  defaultVisible?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  if (products.length === 0) return null;

  const visible = expanded ? products : products.slice(0, defaultVisible);
  const hasMore = products.length > defaultVisible;

  return (
    <div>
      <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-subheading)' }}>
        {title}
      </h3>
      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: expanded ? `${products.length * 80}px` : `${defaultVisible * 80}px` }}
      >
        {visible.map((product) => (
          <ProductOrderRow key={product.id} product={product} company={company} />
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs transition-opacity hover:opacity-70 flex items-center gap-1"
          style={{ color: 'var(--brand-accent)' }}
        >
          {expanded ? <>See less ∧</> : <>See more ∨</>}
        </button>
      )}
    </div>
  );
}

// ── Certificate Multi-Select (sidebar) ────────────────────────

function CertificateMultiSelect({
  products,
  company,
}: {
  products: Product[];
  company: { id: string; icg_code: string; name: string; reg_no: string | null; slug: string | null; country_code: string };
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(false);
  const { addItem } = useCart();
  const navigate = useNavigate();

  const visible = expanded ? products : products.slice(0, 3);
  const hasMore = products.length > 3;

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  };

  const handleAddToCart = () => {
    const certs = products.filter((p) => selectedIds.has(p.id));
    for (const cert of certs) {
      const speeds: ProductSpeed[] = Array.isArray(cert.available_speeds)
        ? (cert.available_speeds as ProductSpeed[])
        : [];
      const speedCode = speeds[0]?.code ?? 'Normal';
      addItem(cert, company, speedCode);
    }
    navigate('/cart');
  };

  const totalPrice = products
    .filter((p) => selectedIds.has(p.id))
    .reduce((s, p) => s + p.base_price, 0);

  return (
    <div className={products.length > 0 ? 'mt-4 pt-4 border-t' : ''} style={{ borderColor: 'var(--bg-border)' }}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-subheading)' }}>
          Order Certificates
        </h3>
        <button
          onClick={selectAll}
          className="text-[11px] font-medium hover:underline"
          style={{ color: 'var(--brand-accent)' }}
        >
          {selectedIds.size === products.length ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      <div className="space-y-0">
        {visible.map((product) => {
          const isSelected = selectedIds.has(product.id);
          return (
            <label
              key={product.id}
              className="flex items-center gap-2.5 py-2 border-b last:border-0 cursor-pointer transition-colors hover:bg-gray-50 rounded px-1 -mx-1"
              style={{ borderColor: 'var(--bg-border)' }}
              onClick={(e) => { e.preventDefault(); toggle(product.id); }}
            >
              <div
                className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all"
                style={{
                  borderColor: isSelected ? 'var(--brand-accent)' : 'var(--bg-border)',
                  backgroundColor: isSelected ? 'var(--brand-accent)' : 'transparent',
                }}
              >
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className="text-xs font-medium flex-1" style={{ color: 'var(--text-heading)' }}>
                📄 {product.name}
              </span>
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                €{product.base_price.toFixed(0)}
              </span>
            </label>
          );
        })}
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs transition-opacity hover:opacity-70 flex items-center gap-1"
          style={{ color: 'var(--brand-accent)' }}
        >
          {expanded ? <>See less ∧</> : <>See all {products.length} certificates ∨</>}
        </button>
      )}

      {selectedIds.size > 0 && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--bg-border)' }}>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {selectedIds.size} certificate{selectedIds.size > 1 ? 's' : ''} selected
            </span>
            <span className="text-sm font-bold" style={{ color: 'var(--text-heading)' }}>
              €{totalPrice.toFixed(0)}
            </span>
          </div>
          <button
            onClick={handleAddToCart}
            className="w-full py-2 rounded text-xs font-semibold text-white transition-all active:scale-95 flex items-center justify-center gap-1.5"
            style={{ backgroundColor: 'var(--brand-accent)', borderRadius: '6px' }}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            Add to Cart — €{totalPrice.toFixed(0)}
          </button>
        </div>
      )}
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
  const [kybModalOpen, setKybModalOpen] = useState(false);
  const [structureModalOpen, setStructureModalOpen] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

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

      // Fetch products
      const productsRes = await supabase
        .from('products')
        .select('*')
        .eq('tenant_id', tenant!.id)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (productsRes.data) {
        setProducts(
          (productsRes.data as unknown as Product[]).map((p) => ({
            ...p,
            available_speeds: Array.isArray(p.available_speeds) ? p.available_speeds : [],
          }))
        );
      }

      // Find affiliated companies by matching director names
      const directors: DirectorEntry[] = Array.isArray(comp.directors_json) ? comp.directors_json : [];
      const directorNames = directors.map(d => d.name.toUpperCase());

      if (directorNames.length > 0) {
        // Search companies that have directors_json containing any matching name
        const { data: affData } = await supabase
          .from('companies')
          .select('id, name, slug, reg_no, status, country_code, icg_code, directors_json, raw_source_json, tenant_id, vat_no, legal_form, registered_address, cached_at, meta_title, meta_description')
          .eq('tenant_id', tenant!.id)
          .neq('id', comp.id)
          .not('directors_json', 'is', null)
          .limit(50);

        if (affData) {
          // Filter to companies sharing at least one director name
          const matches = (affData as unknown as Company[]).filter(c => {
            const theirDirectors: DirectorEntry[] = Array.isArray(c.directors_json) ? c.directors_json : [];
            return theirDirectors.some(d => directorNames.includes(d.name.toUpperCase()));
          });
          setAffiliated(matches.slice(0, 10));
        }
      } else {
        setAffiliated([]);
      }

      setIsLoading(false);
    }

    load();
  }, [slug, tenant]);

  // Unlock the profile if the signed-in user has any completed report for this company
  useEffect(() => {
    let cancelled = false;

    async function checkUnlock() {
      if (!company?.id) {
        setIsUnlocked(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        if (!cancelled) setIsUnlocked(false);
        return;
      }

      const { data, error } = await supabase
        .from('order_items')
        .select('id, fulfillment_status, orders!inner(user_id, status)')
        .eq('company_id', company.id)
        .eq('orders.user_id', session.user.id)
        .in('fulfillment_status', ['completed', 'fulfilled', 'delivered']);

      if (cancelled) return;
      setIsUnlocked(!error && (data?.length ?? 0) > 0);
    }

    checkUnlock();
    return () => {
      cancelled = true;
    };
  }, [company?.id]);

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
            to="/company/search"
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
  const reportProducts = products.filter((p) => p.type !== 'monitoring' && p.type !== 'certificate');
  const certificateProducts = products.filter((p) => p.type === 'certificate');
  const monitoringProduct = products.find((p) => p.type === 'monitoring');
  const kybProduct = products.find((p) => p.type === 'kyb' || p.slug === 'cyprus-kyb-report');
  const structureProduct = products.find((p) => p.slug?.includes('structure') || p.name?.toLowerCase().includes('structure'));
  const samplePdfUrl = products[0]?.sample_pdf_url ?? null;

  const openStructureModal = () => {
    if (structureProduct) setStructureModalOpen(true);
  };

  const companySidebarShape = {
    id: company.id,
    icg_code: company.icg_code,
    name: company.name,
    reg_no: company.reg_no,
    slug: company.slug,
    country_code: company.country_code,
  };

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
                <div className="flex-1 sm:border-l sm:pl-4 mt-3 sm:mt-0" style={{ borderColor: 'var(--bg-border)' }}>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Full risk analysis including sanctions screening, PEP checks and adverse media is
                    included in the KYB Report
                  </p>
                  <button
                    className="text-sm mt-2 hover:underline font-semibold"
                    style={{ color: 'var(--brand-accent)' }}
                    onClick={() => kybProduct ? setKybModalOpen(true) : document.getElementById('sidebar-products')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    Order KYB Report →
                  </button>
                </div>
              </div>

              {kybProduct && (
                <OrderReportModal
                  isOpen={kybModalOpen}
                  onClose={() => setKybModalOpen(false)}
                  preselectedProduct={kybProduct}
                  preselectedCompany={company as unknown as import('../types/database').Company}
                />
              )}
              {structureProduct && (
                <OrderReportModal
                  isOpen={structureModalOpen}
                  onClose={() => setStructureModalOpen(false)}
                  preselectedProduct={structureProduct}
                  preselectedCompany={company as unknown as import('../types/database').Company}
                />
              )}
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
              {(() => {
                const directors: DirectorEntry[] = Array.isArray(company.directors_json) ? company.directors_json : [];
                const directorEntries = directors.filter(d => d.role?.toLowerCase() !== 'secretary');
                const secretaryEntries = directors.filter(d => d.role?.toLowerCase() === 'secretary');
                const totalCount = directors.length || '2+';

                return (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="font-semibold text-base" style={{ color: 'var(--text-subheading)' }}>
                        Directors & Secretaries
                        <RecordBadge count={`${totalCount} records`} />
                      </h2>
                    </div>

                    {/* Show partially masked names */}
                    {directors.length > 0 ? (
                      <>
                        {directorEntries.map((d, i) => (
                          <PersonRow key={`dir-${i}`} name={maskName(d.name)} role="Director" />
                        ))}
                        {secretaryEntries.map((d, i) => (
                          <PersonRow key={`sec-${i}`} name={maskName(d.name)} role="Secretary" />
                        ))}
                      </>
                    ) : (
                      <>
                        <PersonRow name="D████ N████" role="Director" />
                        <PersonRow name="S████ N████" role="Secretary" />
                      </>
                    )}

                    <p className="text-sm italic mt-3" style={{ color: 'var(--text-muted)' }}>
                      Partial names shown. Full names, addresses, appointment dates and history
                      included in Structure Report.
                    </p>

                    {/* Gated history */}
                    <div className="mt-3">
                      <GatedContent
                        isUnlocked={false}
                        message="Order Structure Report to view full appointment history and addresses"
                        ctaLabel="Order Structure Report"
                        onCta={openStructureModal}
                      >
                        <div className="space-y-2 mt-2">
                          {[
                            'PREVIOUS DIRECTOR · Director · Resigned 2021',
                            'NOMINEE DIRECTOR · Director · Appointed 2019',
                            'FORMER SECRETARY · Secretary · Resigned 2020',
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
                  </>
                );
              })()}
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
                ctaLabel="Order Structure Report"
                onCta={openStructureModal}
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

            {/* F — Filings & Documents (UK gets real CH data, others get placeholder) */}
            {company.country_code?.toUpperCase() === 'GB' && company.reg_no ? (
              <UKCompanySections
                companyNumber={company.reg_no}
                isUnlocked={false}
                onOrderReport={openStructureModal}
              />
            ) : (
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
                  ctaLabel="Order Structure Report"
                  onCta={openStructureModal}
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
            )}

            {/* G — Affiliated Companies */}
            <SectionCard>
              <SectionTitle>Potentially Affiliated Companies</SectionTitle>
              <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                Companies sharing directors or secretaries with {company.name}
              </p>

              {affiliated.length > 0 ? (
                <div className="space-y-2">
                  {affiliated.map((aff) => {
                    // Find the shared director name(s)
                    const myDirectors = Array.isArray(company.directors_json) ? company.directors_json : [];
                    const theirDirectors: DirectorEntry[] = Array.isArray(aff.directors_json) ? aff.directors_json : [];
                    const myNames = myDirectors.map(d => d.name.toUpperCase());
                    const sharedNames = theirDirectors
                      .filter(d => myNames.includes(d.name.toUpperCase()))
                      .map(d => maskName(d.name));

                    return (
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
                            via {sharedNames.length > 0 ? sharedNames.join(', ') : 'shared director'}
                          </p>
                        </div>
                        {aff.status && <StatusBadge status={aff.status} />}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>
                  No affiliated companies found yet. More connections appear as companies are searched.
                </p>
              )}

              {Array.isArray(company.directors_json) && company.directors_json.length > 0 && (
                <Link
                  to={`/company/search?q=${encodeURIComponent(company.directors_json[0].name)}`}
                  className="inline-block text-sm mt-4 hover:underline"
                  style={{ color: 'var(--brand-accent)' }}
                >
                  Search companies linked to {company.directors_json[0].name} →
                </Link>
              )}
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

              {/* Hero CTA — Most popular report */}
              {(() => {
                const heroProduct = structureProduct ?? reportProducts[0];
                if (!heroProduct) return null;
                const speeds: ProductSpeed[] = Array.isArray(heroProduct.available_speeds)
                  ? (heroProduct.available_speeds as ProductSpeed[])
                  : [];
                const price = heroProduct.base_price + (speeds[0]?.price_delta ?? 0);
                const companyForModal = company as unknown as import('../types/database').Company;

                return (
                  <div
                    className="rounded-lg p-5 relative overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-dark, #0f2847))',
                      borderRadius: '10px',
                      boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                    }}
                  >
                    {/* Popular badge */}
                    <span
                      className="inline-block text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full mb-3"
                      style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff' }}
                    >
                      ⭐ Most Popular
                    </span>

                    <h3 className="text-lg font-bold text-white leading-tight">
                      {heroProduct.name}
                    </h3>
                    <p className="text-sm mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)' }}>
                      for {company.name}
                    </p>

                    {/* Key features */}
                    <ul className="mt-3 space-y-1.5">
                      {(heroProduct.what_is_included ?? []).slice(0, 4).map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.9)' }}>
                          <span className="mt-0.5">✓</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Price */}
                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-white">€{price.toFixed(0)}</span>
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
                        + VAT · {heroProduct.is_instant ? '⚡ Instant' : `Delivered in ${heroProduct.delivery_sla_hours}hrs`}
                      </span>
                    </div>

                    {/* CTA button */}
                    <button
                      className="mt-4 w-full py-2.5 rounded-lg text-sm font-bold transition-all active:scale-[0.97]"
                      style={{
                        backgroundColor: 'var(--brand-accent)',
                        color: '#fff',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--brand-accent-hover)')}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'var(--brand-accent)')}
                      onClick={() => setStructureModalOpen(true)}
                    >
                      Order Now →
                    </button>

                    {/* View Example link */}
                    {heroProduct.sample_pdf_url && (
                      <a
                        href={heroProduct.sample_pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 mt-2.5 text-xs font-medium hover:underline"
                        style={{ color: 'rgba(255,255,255,0.85)' }}
                      >
                        📄 View Example Report
                      </a>
                    )}

                    <OrderReportModal
                      isOpen={structureModalOpen}
                      onClose={() => setStructureModalOpen(false)}
                      preselectedProduct={heroProduct}
                      preselectedCompany={companyForModal}
                    />
                  </div>
                );
              })()}

              {/* Card 1 — All Reports + Certificates */}
              {(reportProducts.length > 0 || certificateProducts.length > 0) && (
                <div
                  className="rounded-lg border p-5"
                  style={{
                    borderColor: 'var(--bg-border)',
                    backgroundColor: 'var(--bg-subtle)',
                    borderRadius: '8px',
                  }}
                >
                  <h2 className="font-semibold text-base mb-0.5" style={{ color: 'var(--text-heading)' }}>
                    All Reports & Certificates
                  </h2>
                  <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                    for {company.name}
                  </p>

                  {/* Order Reports section */}
                  {reportProducts.length > 0 && (
                    <ProductSection
                      title="Order Reports"
                      products={reportProducts}
                      company={companySidebarShape}
                    />
                  )}

                  {/* Certificates section — multi-select */}
                  {certificateProducts.length > 0 && (
                    <CertificateMultiSelect
                      products={certificateProducts}
                      company={companySidebarShape}
                    />
                  )}
                </div>
              )}

              {/* Card — Order Official Certificates (linked to /certificates) */}
              {(() => {
                const entityType = legalFormToEntityType(company.legal_form, company.reg_no);
                if (!entityType) return null;
                const params = new URLSearchParams({
                  entity: entityType,
                  companyName: company.name,
                  ...(company.reg_no ? { regNo: company.reg_no } : {}),
                });
                return (
                  <Link
                    to={`/certificates?${params.toString()}`}
                    className="block rounded-lg border-2 p-5 transition-all hover:shadow-md"
                    style={{
                      borderColor: 'var(--brand-accent)',
                      backgroundColor: 'rgba(59,130,246,0.04)',
                      borderRadius: '8px',
                    }}
                  >
                    <div className="text-2xl mb-2">📄</div>
                    <h2 className="font-semibold" style={{ color: 'var(--text-heading)' }}>
                      Order Official Certificates
                    </h2>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                      Good Standing, Incorporation, Directors, Shareholders & more — delivered next working day
                    </p>
                    <span
                      className="inline-flex items-center gap-1 mt-3 text-sm font-semibold"
                      style={{ color: 'var(--brand-accent)' }}
                    >
                      Browse all certificates →
                    </span>
                  </Link>
                );
              })()}
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
                    navigate(`/checkout?product=monitoring&company=${company.icg_code}`)
                  }
                >
                  Start Monitoring
                </button>
              </div>

              {/* Card 3 — Dicover internationally */}
              <div
                className="rounded-lg p-4"
                style={{ backgroundColor: 'var(--bg-subtle)', borderRadius: '8px' }}
              >
                <p className="text-sm" style={{ color: 'var(--text-body)' }}>
                  Looking for similar companies internationally?
                </p>
                <a
                  href={`https://www.infocreditworld.com/#${encodeURIComponent(company.name)}/blank&c`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded text-sm font-medium text-white transition-all active:scale-95"
                  style={{ backgroundColor: 'var(--brand-accent)' }}
                >
                  Dicover ↗
                </a>
              </div>

              {/* Card 4 — Sample Report */}
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
