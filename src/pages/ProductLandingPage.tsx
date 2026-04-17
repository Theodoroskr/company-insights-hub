import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import PageLayout from '../components/layout/PageLayout';
import OrderReportModal from '../components/orders/OrderReportModal';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '../lib/tenant.tsx';
import { PRODUCT_TABS, resolveSlug } from '../data/productContent';
import type { ProductContent, AccordionItem } from '../data/productContent';
import type { Product } from '../types/database';
import {
  filterTabsForTenant,
  getTenantHero,
  localizeContent,
} from '../lib/tenantConfig';

// ── Typing animation ─────────────────────────────────────────

function TypingWord({ words }: { words: string[] }) {
  const [wordIdx, setWordIdx] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [pausing, setPausing] = useState(false);

  useEffect(() => {
    if (pausing) {
      const t = setTimeout(() => setPausing(false), 1400);
      return () => clearTimeout(t);
    }
    const target = words[wordIdx];
    if (!deleting) {
      if (displayed.length < target.length) {
        const t = setTimeout(() => setDisplayed(target.slice(0, displayed.length + 1)), 60);
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => setDeleting(true), 1200);
        return () => clearTimeout(t);
      }
    } else {
      if (displayed.length > 0) {
        const t = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 35);
        return () => clearTimeout(t);
      } else {
        setDeleting(false);
        setPausing(true);
        setWordIdx((i) => (i + 1) % words.length);
      }
    }
  }, [displayed, deleting, pausing, wordIdx, words]);

  return (
    <span style={{ color: 'var(--brand-accent)' }} className="italic">
      {displayed}
      <span className="animate-pulse">|</span>
    </span>
  );
}

// ── Accordion Row ─────────────────────────────────────────────

function AccordionRow({ item }: { item: AccordionItem }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b last:border-b-0" style={{ borderColor: 'var(--bg-border)' }}>
      <button
        className="w-full flex items-center justify-between py-3 text-left gap-3 group"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="flex items-center gap-2 flex-1 min-w-0">
          <CheckCircle2
            className="w-4 h-4 shrink-0"
            style={{ color: open ? 'var(--brand-accent)' : 'var(--text-muted)' }}
          />
          <span
            className="text-sm font-semibold"
            style={{ color: open ? 'var(--brand-accent)' : 'var(--text-heading)' }}
          >
            {item.title}
          </span>
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
        ) : (
          <ChevronDown className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
        )}
      </button>
      <div
        className="overflow-hidden transition-all duration-200"
        style={{ maxHeight: open ? '300px' : '0' }}
      >
        <p
          className="text-sm pb-4 pl-6 border-l-2 ml-2 leading-relaxed"
          style={{
            color: 'var(--text-body)',
            borderColor: 'var(--brand-accent)',
          }}
        >
          {item.body}
        </p>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export default function ProductLandingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const contentRef = useRef<HTMLDivElement>(null);

  const rawSlug = searchParams.get('type') ?? '';
  const activeTab = resolveSlug(rawSlug);

  const [dbProduct, setDbProduct] = useState<Product | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Load matching DB product when tab changes — try content slug first, then raw URL slug
  useEffect(() => {
    if (!tenant || !activeTab) return;
    setLoadingProduct(true);
    setDbProduct(null);

    const trySlug = async (slug: string) => {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('is_active', true)
        .eq('slug', slug)
        .maybeSingle();
      return data;
    };

    (async () => {
      let data = await trySlug(activeTab.slug);
      // Fallback: try the raw URL slug (e.g. cyprus-structure-report)
      if (!data && rawSlug && rawSlug !== activeTab.slug) {
        data = await trySlug(rawSlug);
      }
      if (data) {
        setDbProduct({
          ...(data as unknown as Product),
          available_speeds: Array.isArray((data as any).available_speeds)
            ? (data as any).available_speeds
            : [],
        });
      }
      setLoadingProduct(false);
    })();
  }, [tenant?.id, activeTab?.slug, rawSlug]);

  const handleTabClick = (slug: string) => {
    navigate(`/report?type=${slug}`, { replace: true });
    setTimeout(() => {
      contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const handleSample = () => {
    if (dbProduct?.sample_pdf_url) {
      window.open(dbProduct.sample_pdf_url, '_blank', 'noopener,noreferrer');
    }
  };

  const content: ProductContent | null = activeTab?.content ?? null;
  const productName = activeTab?.label ?? dbProduct?.name ?? 'Report';
  const price = dbProduct?.base_price ?? null;

  return (
    <PageLayout>
      <Helmet>
        <title>{productName} | Companies House Cyprus</title>
      </Helmet>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section
        className="w-full flex items-end pb-12 pt-20"
        style={{
          background: 'linear-gradient(135deg, #0F2444 0%, #1B3A6B 100%)',
          minHeight: '280px',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 w-full">
          <p className="text-4xl italic font-light mb-1">
            <TypingWord />
          </p>
          <h1 className="text-5xl font-light text-white leading-tight">
            Company Insights in Cyprus
          </h1>
          <p className="mt-4 text-base max-w-2xl" style={{ color: 'rgba(255,255,255,0.70)' }}>
            Explore Comprehensive Company Structure and Ownership Information in Cyprus. Ensure
            Invoicing Accuracy and Secure Your Business Future.
          </p>
        </div>
      </section>

      {/* ── TAB BAR ───────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-20 bg-white border-b overflow-x-auto"
        style={{ borderColor: 'var(--bg-border)' }}
      >
        {/* hide scrollbar cross-browser */}
        <div
          className="flex min-w-max max-w-6xl mx-auto px-6"
          style={{ scrollbarWidth: 'none' }}
        >
          {PRODUCT_TABS.map((tab) => {
            const isActive = tab.slug === activeTab?.slug;
            return (
              <button
                key={tab.slug}
                onClick={() => handleTabClick(tab.slug)}
                className="shrink-0 px-4 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors"
                style={{
                  borderBottomColor: isActive ? 'var(--brand-accent)' : 'transparent',
                  color: isActive ? 'var(--brand-accent)' : 'var(--text-muted)',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TWO-COLUMN CONTENT ───────────────────────────────── */}
      <div ref={contentRef} className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-10 items-start">
          {/* LEFT */}
          <div className="flex-1 min-w-0">
            <h2
              className="text-2xl font-semibold mb-4"
              style={{ color: 'var(--text-heading)' }}
            >
              {productName}
            </h2>

            {content ? (
              <>
                {/* Description */}
                <div className="space-y-4 mb-8">
                  {content.description.map((para, i) => (
                    <p
                      key={i}
                      className="text-base leading-relaxed"
                      style={{ color: 'var(--text-body)' }}
                    >
                      {para}
                    </p>
                  ))}
                </div>

                {/* Section heading */}
                <h3
                  className="text-sm font-bold tracking-widest uppercase mt-8 mb-4"
                  style={{ color: 'var(--text-heading)' }}
                >
                  {content.sectionHeading}
                </h3>

                {/* Accordion */}
                <div
                  className="rounded-lg border overflow-hidden"
                  style={{ borderColor: 'var(--bg-border)' }}
                >
                  <div className="px-4">
                    {content.accordionItems.map((item) => (
                      <AccordionRow key={item.title} item={item} />
                    ))}
                  </div>
                </div>

                {/* Delivery note */}
                <p
                  className="text-sm mt-8 pt-6 border-t italic leading-relaxed"
                  style={{
                    color: 'var(--text-muted)',
                    borderColor: 'var(--bg-border)',
                  }}
                >
                  {content.deliveryNote}
                </p>
              </>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Select a product from the tabs above.
              </p>
            )}
          </div>

          {/* RIGHT — sticky card */}
          <div className="lg:w-[360px] shrink-0">
            <div
              className="sticky top-24 border rounded-xl shadow-sm p-6"
              style={{ borderColor: 'var(--bg-border)' }}
            >
              {/* Icon */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{ backgroundColor: 'var(--bg-subtle)' }}
              >
                📋
              </div>

              {/* Name */}
              <h3
                className="text-lg font-semibold mt-3"
                style={{ color: 'var(--text-heading)' }}
              >
                {productName}
              </h3>

              {/* Price */}
              <div className="mt-4">
                {loadingProduct ? (
                  <div
                    className="h-10 w-24 rounded animate-pulse"
                    style={{ backgroundColor: 'var(--bg-subtle)' }}
                  />
                ) : (
                  <>
                    <span
                      className="text-3xl font-bold"
                      style={{ color: 'var(--brand-accent)' }}
                    >
                      {price !== null ? `€${price.toFixed(0)}` : '—'}
                    </span>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      excluding VAT
                    </p>
                  </>
                )}
              </div>

              {/* Sample */}
              <button
                onClick={handleSample}
                disabled={!dbProduct?.sample_pdf_url}
                className="w-full mt-4 py-2 rounded text-sm border transition-all hover:opacity-80 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  borderColor: 'var(--bg-border)',
                  color: 'var(--text-body)',
                }}
              >
                Sample
              </button>

              {/* Add to Cart */}
              <button
                onClick={() => setModalOpen(true)}
                className="w-full mt-2 py-2 rounded text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal — use DB product if loaded, else a minimal stand-in */}
      <OrderReportModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        preselectedProduct={dbProduct ?? undefined}
      />
    </PageLayout>
  );
}
