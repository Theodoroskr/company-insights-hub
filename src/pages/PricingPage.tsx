import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Check, Clock, Zap, Star, ArrowRight } from 'lucide-react';
import PageLayout from '../components/layout/PageLayout';
import OrderReportModal from '../components/orders/OrderReportModal';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '../lib/tenant';
import type { Product } from '../types/database';

export default function PricingPage() {
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const brand = tenant?.brand_name ?? 'Companies House';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalProduct, setModalProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (!tenant?.id) return;
    supabase
      .from('products')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .then(({ data }) => {
        setProducts((data as unknown as Product[]) ?? []);
        setLoading(false);
      });
  }, [tenant?.id]);

  const reports = products.filter((p) => ['extract', 'structure', 'kyb', 'credit'].includes(p.type));
  const certificates = products.filter((p) => p.type === 'certificate');
  const services = products.filter((p) => p.type === 'monitoring');

  const formatPrice = (p: Product) => {
    const speeds = p.available_speeds;
    const startPrice = p.base_price + (speeds?.[0]?.price_delta ?? 0);
    return `€${startPrice.toFixed(2)}`;
  };

  const getDelivery = (p: Product) => {
    if (p.is_instant) return 'Instant';
    if (p.delivery_sla_hours) {
      if (p.delivery_sla_hours <= 24) return '24 hours';
      return `${Math.round(p.delivery_sla_hours / 24)} days`;
    }
    return 'Standard';
  };

  const ProductCard = ({ product, featured = false }: { product: Product; featured?: boolean }) => (
    <div
      className="relative rounded-xl border p-6 flex flex-col transition-shadow hover:shadow-lg"
      style={{
        borderColor: featured ? 'var(--brand-accent)' : 'var(--bg-border)',
        backgroundColor: 'var(--bg-surface)',
        borderWidth: featured ? '2px' : '1px',
      }}
    >
      {featured && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: 'var(--brand-accent)' }}
        >
          <Star className="w-3 h-3" /> Most Popular
        </div>
      )}

      <h3 className="text-lg font-bold" style={{ color: 'var(--text-heading)' }}>
        {product.name}
      </h3>

      <p className="text-sm mt-1 flex-0 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
        {product.description}
      </p>

      {/* Price */}
      <div className="mt-4">
        <span className="text-3xl font-extrabold" style={{ color: 'var(--text-heading)' }}>
          {formatPrice(product)}
        </span>
        <span className="text-sm ml-1" style={{ color: 'var(--text-muted)' }}>+ VAT</span>
      </div>

      {/* Delivery */}
      <div className="flex items-center gap-1.5 mt-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
        {product.is_instant ? (
          <Zap className="w-3.5 h-3.5" style={{ color: 'var(--status-active)' }} />
        ) : (
          <Clock className="w-3.5 h-3.5" />
        )}
        <span>Delivery: {getDelivery(product)}</span>
      </div>

      {/* Features */}
      <ul className="mt-4 space-y-2 flex-1">
        {(product.what_is_included ?? []).slice(0, 6).map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-body)' }}>
            <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--status-active)' }} />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <button
        onClick={() => setModalProduct(product)}
        className="mt-6 w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
        style={{
          backgroundColor: featured ? 'var(--brand-accent)' : 'var(--brand-primary)',
          color: '#fff',
        }}
      >
        Order Now <ArrowRight className="w-4 h-4" />
      </button>

      {product.sample_pdf_url && (
        <a
          href={product.sample_pdf_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-center mt-2 font-medium underline"
          style={{ color: 'var(--brand-accent)' }}
        >
          View Example Report
        </a>
      )}
    </div>
  );

  const Section = ({ title, items }: { title: string; items: Product[] }) => {
    if (items.length === 0) return null;
    // Mark the first report as featured
    const featuredSlug = title === 'Reports' ? 'structure-report' : '';
    return (
      <div className="mb-16">
        <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-heading)' }}>
          {title}
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              featured={p.slug === featuredSlug}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <PageLayout>
      <Helmet>
        <title>Pricing | {brand}</title>
        <meta
          name="description"
          content={`Compare all company report and certificate prices from ${brand}. Instant delivery, official registry data.`}
        />
      </Helmet>

      {/* Hero */}
      <section className="py-16 px-4" style={{ backgroundColor: 'var(--brand-primary)' }}>
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold" style={{ color: '#fff' }}>
            Simple, Transparent Pricing
          </h1>
          <p className="mt-4 text-lg" style={{ color: 'rgba(255,255,255,0.8)' }}>
            All prices exclude VAT. No hidden fees, no subscriptions required.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-80 rounded-xl animate-pulse"
                  style={{ backgroundColor: 'var(--bg-subtle)' }}
                />
              ))}
            </div>
          ) : (
            <>
              <Section title="Reports" items={reports} />
              <Section title="Certificates" items={certificates} />
              <Section title="Services" items={services} />
            </>
          )}
        </div>
      </section>

      {/* FAQ-like trust strip */}
      <section className="py-10 px-4" style={{ borderTop: '1px solid var(--bg-border)' }}>
        <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-8 text-center">
          {[
            { icon: <Zap className="w-6 h-6" />, title: 'Instant Delivery', desc: 'Digital reports delivered to your account in minutes' },
            { icon: <Check className="w-6 h-6" />, title: 'Official Data', desc: 'Sourced directly from the official registry' },
            { icon: <Clock className="w-6 h-6" />, title: 'Money-Back Guarantee', desc: 'Full refund if we can\'t deliver your report' },
          ].map(({ icon, title, desc }) => (
            <div key={title}>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                <span style={{ color: 'var(--brand-accent)' }}>{icon}</span>
              </div>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-heading)' }}>{title}</h3>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Order modal */}
      {modalProduct && (
        <OrderReportModal
          isOpen={!!modalProduct}
          onClose={() => setModalProduct(null)}
          preselectedProduct={modalProduct}
        />
      )}
    </PageLayout>
  );
}
