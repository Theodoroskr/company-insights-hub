import React, { useEffect, useRef, useState as useStateReact } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Shield, Database, Zap, Globe, Lock, FileCheck, BadgeCheck, Briefcase, FileText, Map as MapIcon } from 'lucide-react';
import PageLayout from '../components/layout/PageLayout';
import SearchWidget from '../components/search/SearchWidget';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import PriceDisplay from '../components/ui/PriceDisplay';
import WorldCoverageMap from '../components/global/WorldCoverageMap';
import LiveActivityTicker from '../components/global/LiveActivityTicker';
import { useTenant } from '../lib/tenant';
import { useCountries } from '../lib/countries';
import { supabase } from '../lib/supabase';
import type { Product } from '../types/database';
import { useState } from 'react';

const PRODUCT_TYPE_ICONS: Record<string, string> = {
  structure:   '📋',
  kyb:         '🔍',
  certificate: '📄',
  monitoring:  '👁',
  extract:     '💳',
  credit:      '📊',
};

const TRUST_BADGES = [
  { icon: <Shield className="w-5 h-5" />, text: 'Secure payments via Stripe' },
  { icon: <Database className="w-5 h-5" />, text: 'Official registry data' },
  { icon: <Zap className="w-5 h-5" />, text: 'Instant digital delivery' },
  { icon: <Globe className="w-5 h-5" />, text: 'Trusted local source' },
];

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
          el.style.filter = 'blur(0px)';
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.filter = 'blur(4px)';
    el.style.transition = 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), filter 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

export default function HomePage() {
  const { tenant, isLoading: tenantLoading } = useTenant();
  const { countries } = useCountries();
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  const isGlobal = tenant?.slug === 'icw';
  const countryName = (() => {
    if (!tenant?.country_code) return '';
    const c = countries.find((x) => x.code === tenant.country_code);
    return c?.name ?? tenant.country_code;
  })();

  // Fetch products
  useEffect(() => {
    if (!tenant?.id) return;
    setProductsLoading(true);
    supabase
      .from('products')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .then(({ data }) => {
        setProducts((data as unknown as Product[]) ?? []);
        setProductsLoading(false);
      });
  }, [tenant]);

  // Scroll reveal refs
  const trustRef = useScrollReveal();
  const productsRef = useScrollReveal();
  const howItWorksRef = useScrollReveal();
  const browseRef = useScrollReveal();

  return (
    <PageLayout>
      <Helmet>
        <title>{tenant?.meta_title ?? 'Companies House'}</title>
        {tenant?.meta_description && (
          <meta name="description" content={tenant.meta_description} />
        )}
        {tenant?.domain && (
          <link rel="canonical" href={`https://${tenant.domain}/`} />
        )}
      </Helmet>

      {/* ═══════════════════════════════════════════════════
          SECTION 1 — HERO
      ═══════════════════════════════════════════════════ */}
      <section
        className="py-20 md:py-28 px-4"
        style={{ backgroundColor: 'var(--brand-primary)' }}
      >
        <div className="max-w-4xl mx-auto text-center">
          {tenantLoading ? (
            <div className="space-y-4 mb-10">
              <div className="h-10 rounded skeleton-shimmer mx-auto w-3/4" style={{ opacity: 0.3 }} />
              <div className="h-6 rounded skeleton-shimmer mx-auto w-1/2" style={{ opacity: 0.3 }} />
            </div>
          ) : (
            <>
              {isGlobal && (
                <div
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-xs font-semibold uppercase tracking-wider"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.9)',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                >
                  <Globe className="w-3.5 h-3.5" />
                  200+ Countries · Instant · Pay-Per-Report
                </div>
              )}
              <h1
                className="text-4xl md:text-6xl font-extrabold mb-4 leading-tight"
                style={{ color: '#ffffff', lineHeight: 1.05 }}
              >
                {isGlobal
                  ? 'Global company intelligence, on demand.'
                  : `Search and Verify ${countryName} Companies`}
              </h1>
              <p
                className="text-lg md:text-xl mb-10 max-w-2xl mx-auto"
                style={{ color: 'rgba(255,255,255,0.8)' }}
              >
                {isGlobal
                  ? 'Instant KYB and company reports across 200+ jurisdictions. No subscription, no sales call — pay only for the report you need.'
                  : 'Instant access to official registry data, structure reports, KYB intelligence and official certificates'}
              </p>
            </>
          )}

          <SearchWidget size="hero" isGlobal={isGlobal} />

          {!isGlobal && countryName && (
            <p
              className="mt-4 text-sm"
              style={{ color: 'rgba(255,255,255,0.55)' }}
            >
              Searching official registry data for {countryName}
            </p>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          SECTION 2 — TRUST SIGNALS & SOCIAL PROOF
      ═══════════════════════════════════════════════════ */}
      <section
        ref={trustRef}
        className="py-10 px-4"
        style={{
          backgroundColor: '#fff',
          borderBottom: '1px solid var(--bg-border)',
        }}
      >
        <div className="max-w-5xl mx-auto">
          {/* Stats row */}
          <div className="flex flex-wrap items-center justify-center gap-10 md:gap-16 mb-8">
            {[
              { value: '10,000+', label: 'Reports Delivered' },
              { value: '500+', label: 'Business Clients' },
              { value: '99.9%', label: 'Uptime SLA' },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <div
                  className="text-2xl md:text-3xl font-extrabold"
                  style={{ color: 'var(--brand-primary)' }}
                >
                  {value}
                </div>
                <div className="text-xs mt-1 uppercase tracking-wider font-medium" style={{ color: 'var(--text-muted)' }}>
                  {label}
                </div>
              </div>
            ))}
          </div>

          {/* Feature badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8 mb-6">
            {TRUST_BADGES.map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-2">
                <span style={{ color: 'var(--brand-accent)' }}>{icon}</span>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {text}
                </span>
              </div>
            ))}
          </div>

          {/* Compliance badges */}
          <div
            className="flex flex-wrap items-center justify-center gap-4 pt-6"
            style={{ borderTop: '1px solid var(--bg-border)' }}
          >
            {[
              { icon: <Lock className="w-4 h-4" />, label: 'SSL Encrypted' },
              { icon: <Shield className="w-4 h-4" />, label: 'GDPR Compliant' },
              { icon: <FileCheck className="w-4 h-4" />, label: 'Official Registry Data' },
              { icon: <BadgeCheck className="w-4 h-4" />, label: 'ISO 27001' },
            ].map(({ icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--bg-border)',
                }}
              >
                {icon}
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          SECTION 2.5 — USE CASES + WORLD MAP (ICW only)
      ═══════════════════════════════════════════════════ */}
      {isGlobal && (
        <section
          className="py-20 px-4 relative overflow-hidden"
          style={{ backgroundColor: 'var(--bg-subtle)' }}
        >
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(
                `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 500'><defs><pattern id='d' x='0' y='0' width='8' height='8' patternUnits='userSpaceOnUse'><circle cx='2' cy='2' r='1.2' fill='%23334155' opacity='0.4'/></pattern><mask id='m'><rect width='1000' height='500' fill='black'/><path fill='white' d='M150,140 Q180,100 230,110 T320,130 L340,170 Q330,200 290,210 T200,220 Q160,210 140,180 Z M380,90 Q450,70 520,90 T640,110 Q680,130 670,180 T580,220 Q500,230 430,200 T370,150 Z M700,120 Q780,110 850,140 T910,200 Q900,240 830,250 T720,230 Q680,200 690,160 Z M250,260 Q300,250 340,280 T380,360 Q360,420 300,430 T230,400 Q210,350 230,300 Z M460,260 Q540,260 600,290 T640,370 Q620,420 550,430 T470,410 Q440,370 450,310 Z M740,290 Q800,280 840,310 T850,380 Q820,420 770,420 T720,380 Q710,330 730,300 Z'/></mask></defs><rect width='1000' height='500' fill='url(%23d)' mask='url(%23m)'/></svg>`
              )}")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              backgroundSize: 'min(1200px, 110%) auto',
              opacity: 0.5,
            }}
          />

          <div className="max-w-6xl mx-auto relative">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: 'var(--text-heading)' }}>
                Built for moments traditional providers can't serve
              </h2>
              <p className="text-base max-w-2xl mx-auto" style={{ color: 'var(--text-muted)' }}>
                One-off, cross-border and frontier-market intelligence — without procurement cycles, demos or annual contracts.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: <Briefcase className="w-6 h-6" />,
                  tag: 'Cross-Border Counterparty Check',
                  title: 'Verify a foreign supplier in minutes',
                  desc: 'Instant KYB and structure report on any company in 200+ jurisdictions. Built for legal, finance and procurement teams onboarding international counterparties.',
                  bullet: 'Typical use: M&A target screening, supplier onboarding, sanctions context.',
                },
                {
                  icon: <FileText className="w-6 h-6" />,
                  tag: 'Tender & Bid Pack',
                  title: 'Complete bid documentation in one click',
                  desc: 'Bundle Good Standing, Directors, Shareholders and Country Risk into a single download. Ready to attach to your tender response — branded PDFs, official sources.',
                  bullet: 'Typical use: Government tenders, RFP responses, banking facility applications.',
                },
                {
                  icon: <MapIcon className="w-6 h-6" />,
                  tag: 'Frontier Markets',
                  title: 'Coverage where others say "no data"',
                  desc: 'Deep network into emerging and frontier jurisdictions — Middle East, Africa, Caucasus, Central Asia. Heritage Infocredit relationships, not a re-seller of EU databases.',
                  bullet: 'Typical use: Trade finance, NGO due diligence, oil & gas, commodity trading.',
                },
              ].map(({ icon, tag, title, desc, bullet }) => (
                <div
                  key={tag}
                  className="rounded-xl p-7 transition-all hover:shadow-lg hover:-translate-y-1"
                  style={{
                    backgroundColor: '#fff',
                    border: '1px solid var(--bg-border)',
                  }}
                >
                  <div
                    className="inline-flex items-center justify-center w-11 h-11 rounded-lg mb-4"
                    style={{ backgroundColor: 'var(--brand-primary)', color: '#fff' }}
                  >
                    {icon}
                  </div>
                  <div
                    className="text-xs font-semibold uppercase tracking-wider mb-2"
                    style={{ color: 'var(--brand-accent)' }}
                  >
                    {tag}
                  </div>
                  <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--text-heading)' }}>
                    {title}
                  </h3>
                  <p className="text-sm mb-4 leading-relaxed" style={{ color: 'var(--text-body)' }}>
                    {desc}
                  </p>
                  <p className="text-xs italic pt-3" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--bg-border)' }}>
                    {bullet}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════
          SECTION 3 — OUR PRODUCTS & SERVICES (unified)
      ═══════════════════════════════════════════════════ */}
      <section ref={productsRef} className="py-16 px-4" style={{ backgroundColor: '#fff' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2
              className="text-3xl font-bold mb-3"
              style={{ color: 'var(--text-heading)' }}
            >
              Our Products & Services
            </h2>
            <p className="text-base" style={{ color: 'var(--text-muted)' }}>
              Company intelligence reports, official certificates and professional services
            </p>
          </div>

          {/* ── Reports sub-section ── */}
          <h3 className="text-xl font-bold mb-5 flex items-center gap-2" style={{ color: 'var(--text-heading)' }}>
            <span>📊</span> Company Reports
          </h3>

          {productsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-14">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="rounded-lg border p-6"
                  style={{ borderColor: 'var(--bg-border)' }}
                >
                  <LoadingSkeleton lines={5} />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-10 mb-14">
              <p style={{ color: 'var(--text-muted)' }}>
                Products are loading — please connect Supabase and seed data.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-14">
              {products.map((product, i) => (
                <ProductCard key={product.id} product={product} delay={i * 80} />
              ))}
            </div>
          )}

          {/* ── Certificates sub-section ── */}
          {!isGlobal && (
            <>
              <h3 className="text-xl font-bold mb-5 flex items-center gap-2" style={{ color: 'var(--text-heading)' }}>
                <span>📄</span> Official Certificates
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {[
                  {
                    icon: '🏢',
                    title: 'Company Certificates',
                    desc: 'Good Standing, Incorporation, Directors & Secretary, Shareholders, and 12+ more for Cyprus limited companies.',
                    count: '17 certificates',
                    link: '/certificates?entity=company',
                  },
                  {
                    icon: '💼',
                    title: 'Business Name Certificates',
                    desc: 'Registration, Good Standing, Address, Owner/Proprietor, and more for registered business names.',
                    count: '6 certificates',
                    link: '/certificates?entity=business_name',
                  },
                  {
                    icon: '👥',
                    title: 'Partnership Certificates',
                    desc: 'Registration, Good Standing, Partners, Address, and more for registered partnerships.',
                    count: '6 certificates',
                    link: '/certificates?entity=partnership',
                  },
                ].map(({ icon, title, desc, count, link }) => (
                  <Link
                    key={title}
                    to={link}
                    className="rounded-xl border p-6 transition-all hover:shadow-md group"
                    style={{
                      backgroundColor: 'var(--bg-subtle)',
                      borderColor: 'var(--bg-border)',
                    }}
                  >
                    <div className="text-3xl mb-3">{icon}</div>
                    <h4 className="text-lg font-bold mb-2" style={{ color: 'var(--text-heading)' }}>
                      {title}
                    </h4>
                    <p className="text-sm mb-4" style={{ color: 'var(--text-body)' }}>
                      {desc}
                    </p>
                    <div className="flex items-center justify-between">
                      <span
                        className="text-xs font-medium px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: '#fff', color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}
                      >
                        {count}
                      </span>
                      <span
                        className="text-sm font-semibold group-hover:gap-2 flex items-center gap-1 transition-all"
                        style={{ color: 'var(--brand-accent)' }}
                      >
                        View & Order →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="text-center mb-4">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  All certificates: <strong>€40 + €40 service & delivery + VAT</strong> · Apostille available · Next working day delivery
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          SECTION 4 — HOW IT WORKS
      ═══════════════════════════════════════════════════ */}
      <section
        ref={howItWorksRef}
        className="py-16 px-4 text-center"
        style={{ backgroundColor: 'var(--bg-subtle)' }}
      >
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold mb-3" style={{ color: 'var(--text-heading)' }}>
            How It Works
          </h2>
          <p className="mb-12" style={{ color: 'var(--text-muted)' }}>
            Get the company intelligence you need in three simple steps
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector lines on desktop */}
            <div className="hidden md:block absolute top-8 left-1/3 right-1/3 h-0.5" style={{ backgroundColor: 'var(--bg-border)' }} />

            {[
              {
                step: '1',
                icon: '🔍',
                title: 'Search',
                desc: 'Find any company by name or registration number in our global database',
              },
              {
                step: '2',
                icon: '📋',
                title: 'Order',
                desc: 'Choose your report type and complete secure checkout in minutes',
              },
              {
                step: '3',
                icon: '📧',
                title: 'Receive',
                desc: 'Get your report delivered instantly or within the stated SLA to your email',
              },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-2xl shadow-md"
                    style={{ backgroundColor: '#fff', border: '2px solid var(--bg-border)' }}
                  >
                    {icon}
                  </div>
                  <div
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: 'var(--brand-primary)' }}
                  >
                    {step}
                  </div>
                </div>
                <h3
                  className="text-lg font-semibold"
                  style={{ color: 'var(--text-heading)' }}
                >
                  {title}
                </h3>
                <p className="text-sm max-w-xs" style={{ color: 'var(--text-body)' }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          SECTION 5 — BROWSE A–Z
      ═══════════════════════════════════════════════════ */}
      <section ref={browseRef} className="py-12 px-4" style={{ backgroundColor: '#fff' }}>
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-heading)' }}>
            Browse {countryName || 'Companies'} A–Z
          </h2>
          <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
            Explore our complete company database
          </p>

          <div className="flex flex-wrap justify-center gap-2">
            {ALPHABET.map((letter) => (
              <Link
                key={letter}
                to={`/companies/${letter.toLowerCase()}`}
                className="inline-flex items-center justify-center w-10 h-10 text-sm font-semibold rounded border transition-all active:scale-95"
                style={{
                  borderColor: 'var(--bg-border)',
                  color: 'var(--text-body)',
                  backgroundColor: '#fff',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--brand-primary)';
                  e.currentTarget.style.color = '#fff';
                  e.currentTarget.style.borderColor = 'var(--brand-primary)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#fff';
                  e.currentTarget.style.color = 'var(--text-body)';
                  e.currentTarget.style.borderColor = 'var(--bg-border)';
                }}
              >
                {letter}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </PageLayout>
  );
}

// ── Product Card sub-component ──────────────────────────────

function ProductCard({ product, delay }: { product: Product; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
            el.style.filter = 'blur(0px)';
          }, delay);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.filter = 'blur(4px)';
    el.style.transition = 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), filter 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className="rounded-lg border p-6 flex flex-col group transition-all duration-200"
      style={{
        backgroundColor: '#fff',
        borderColor: 'var(--bg-border)',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
      onMouseOver={(e) => {
        const el = e.currentTarget;
        el.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
        el.style.borderColor = 'var(--brand-accent)';
      }}
      onMouseOut={(e) => {
        const el = e.currentTarget;
        el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
        el.style.borderColor = 'var(--bg-border)';
      }}
    >
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl">{PRODUCT_TYPE_ICONS[product.type] ?? '📋'}</span>
        <h3 className="text-xl font-semibold" style={{ color: 'var(--text-heading)' }}>
          {product.name}
        </h3>
      </div>

      {product.description && (
        <p className="text-sm mb-4" style={{ color: 'var(--text-body)' }}>
          {product.description}
        </p>
      )}

      {product.what_is_included?.length > 0 && (
        <ul className="space-y-2 mb-6 flex-1">
          {product.what_is_included.slice(0, 3).map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-body)' }}>
              <span style={{ color: 'var(--status-active)', flexShrink: 0 }}>✓</span>
              {item}
            </li>
          ))}
          {product.what_is_included.length > 3 && (
            <li className="text-xs" style={{ color: 'var(--text-muted)' }}>
              + {product.what_is_included.length - 3} more included
            </li>
          )}
        </ul>
      )}

      <div className="flex items-center justify-between mt-auto pt-4"
        style={{ borderTop: '1px solid var(--bg-border)' }}
      >
        <div>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>from </span>
          <PriceDisplay basePrice={product.base_price} className="text-2xl" />
        </div>
        <Link
          to={
            (product.type as string) === 'certificate' || (product.type as string) === 'cert'
              ? '/certificates'
              : (product.type as string) === 'monitoring'
              ? '/account/monitoring'
              : `/report?type=${product.slug}`
          }
          className="text-sm font-semibold transition-colors"
          style={{ color: 'var(--brand-accent)' }}
          onMouseOver={(e) => (e.currentTarget.style.color = 'var(--brand-accent-hover)')}
          onMouseOut={(e) => (e.currentTarget.style.color = 'var(--brand-accent)')}
        >
          {(product.type as string) === 'certificate' || (product.type as string) === 'cert'
            ? 'Order Now →'
            : (product.type as string) === 'monitoring'
            ? 'Subscribe →'
            : 'Buy Report →'}
        </Link>
      </div>
    </div>
  );
}
