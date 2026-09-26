import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Search, Zap, ShieldCheck, FileText, Award } from 'lucide-react';
import PageLayout from '../components/layout/PageLayout';
import { supabase } from '@/integrations/supabase/client';
import { isProductVisibleForTenant } from '@/lib/tenantConfig';
import { priceProduct } from '@/lib/pricing';

// UK B2B: prices are shown ex VAT here, like the rest of the site
const UK_VAT_RATE = 0;

interface UkProduct {
  id: string;
  name: string;
  slug: string;
  type: string;
  description: string | null;
  base_price: number;
  service_fee: number | null;
  vat_on_full_price: boolean | null;
  vat_on_fee_only: boolean | null;
  available_speeds: any;
  country_scope: string;
  allowed_countries: string[] | null;
  is_instant: boolean | null;
  display_order: number | null;
}

const FAQS = [
  { q: 'Where does the data come from?', a: 'Directly from the official UK Companies House register, retrieved at the moment you order.' },
  { q: 'How fast will I receive my report?', a: 'UK reports are generated instantly and available to download from your account.' },
  { q: 'Which companies are covered?', a: 'All companies registered in England & Wales, Scotland and Northern Ireland, including dissolved companies.' },
];

export default function UkLandingPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [reports, setReports] = useState<UkProduct[]>([]);
  const [certs, setCerts] = useState<UkProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: prods }, { data: gb }] = await Promise.all([
        supabase.from('products').select('*').eq('country_scope', 'uk-only').eq('is_active', true).order('display_order'),
        supabase.from('countries').select('certificates_enabled').in('code', ['GB', 'gb']).limit(1).maybeSingle(),
      ]);
      const list = ((prods ?? []) as unknown as UkProduct[]).filter((p) => isProductVisibleForTenant(p, 'GB'));
      setReports(list.filter((p) => !p.slug.startsWith('certificate_')));
      setCerts(gb?.certificates_enabled ? list.filter((p) => p.slug.startsWith('certificate_') && Number(p.base_price) > 0) : []);
      setLoading(false);
    })();
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    navigate(`/company/search?country=gb&q=${encodeURIComponent(q.trim())}`);
  };

  const card = (p: UkProduct, icon: React.ReactNode) => {
    const price = priceProduct(p, UK_VAT_RATE);
    return (
      <div key={p.id} className="rounded-xl border p-6 flex flex-col bg-white" style={{ borderColor: 'var(--bg-border)' }}>
        <div className="flex items-center gap-3 mb-3">
          {icon}
          <h3 className="font-semibold text-lg" style={{ color: 'var(--text-heading)' }}>{p.name}</h3>
        </div>
        <p className="text-sm flex-1" style={{ color: 'var(--text-body)' }}>{p.description ?? ''}</p>
        <div className="mt-5 flex items-end justify-between">
          <div>
            <span className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>€{price.net.toFixed(2)}</span>
            {p.is_instant && <span className="ml-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Instant</span>}
          </div>
          <a href="#uk-search" className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: 'var(--brand-accent)', color: 'hsl(var(--primary-foreground))' }}>
            Find a company
          </a>
        </div>
      </div>
    );
  };

  return (
    <PageLayout>
      <Helmet>
        <title>UK Company Reports | Companies House Data</title>
        <meta name="description" content="Search any UK company and get instant reports from official Companies House data — directors, shareholders, filings and KYB checks." />
      </Helmet>

      <section className="relative isolate">
        <div className="hero-mesh" aria-hidden="true"><div className="hero-mesh-blob" /></div>
        <div className="relative max-w-5xl mx-auto px-4 py-16 sm:py-20 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'hsl(var(--primary-foreground) / 0.7)' }}>United Kingdom</p>
          <h1 className="text-3xl sm:text-5xl font-bold mb-4" style={{ color: 'hsl(var(--primary-foreground))' }}>UK Company Reports</h1>
          <p className="text-lg max-w-2xl mx-auto mb-8" style={{ color: 'hsl(var(--primary-foreground) / 0.8)' }}>
            Instant reports from the official Companies House register — directors, shareholders, filings and KYB checks.
          </p>
          <form id="uk-search" onSubmit={submit} className="max-w-xl mx-auto flex bg-white rounded-xl overflow-hidden shadow-lg">
            <Search className="w-5 h-5 m-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search UK company name or number"
              className="flex-1 py-4 text-sm outline-none" style={{ color: 'var(--text-heading)' }} aria-label="Search UK companies" />
            <button type="submit" className="px-6 text-sm font-semibold" style={{ backgroundColor: 'var(--brand-accent)', color: 'hsl(var(--primary-foreground))' }}>Search</button>
          </form>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-14">
        <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-heading)' }}>UK reports</h2>
        {loading ? <p style={{ color: 'var(--text-muted)' }}>Loading…</p> : reports.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No UK reports are available right now.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">{reports.map((p) => card(p, <FileText className="w-6 h-6" style={{ color: 'var(--brand-accent)' }} />))}</div>
        )}

        {certs.length > 0 && (
          <>
            <h2 className="text-2xl font-bold mt-14 mb-6" style={{ color: 'var(--text-heading)' }}>UK certificates</h2>
            <div className="grid md:grid-cols-2 gap-6">{certs.map((p) => card(p, <Award className="w-6 h-6" style={{ color: 'var(--brand-accent)' }} />))}</div>
          </>
        )}
      </section>

      <section style={{ backgroundColor: 'var(--bg-surface)' }}>
        <div className="max-w-5xl mx-auto px-4 py-14 grid sm:grid-cols-3 gap-8">
          {[
            { icon: ShieldCheck, t: 'Official data', d: 'Sourced live from UK Companies House.' },
            { icon: Zap, t: 'Instant delivery', d: 'Reports are ready to download in seconds.' },
            { icon: FileText, t: 'KYB ready', d: 'Directors, owners and filings in one document.' },
          ].map(({ icon: I, t, d }) => (
            <div key={t}>
              <I className="w-7 h-7 mb-3" style={{ color: 'var(--brand-accent)' }} />
              <h3 className="font-semibold mb-1" style={{ color: 'var(--text-heading)' }}>{t}</h3>
              <p className="text-sm" style={{ color: 'var(--text-body)' }}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 py-14">
        <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-heading)' }}>Frequently asked questions</h2>
        {FAQS.map((f) => (
          <details key={f.q} className="border-b py-4" style={{ borderColor: 'var(--bg-border)' }}>
            <summary className="font-medium cursor-pointer" style={{ color: 'var(--text-heading)' }}>{f.q}</summary>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-body)' }}>{f.a}</p>
          </details>
        ))}
        <p className="mt-8 text-sm" style={{ color: 'var(--text-muted)' }}>
          Looking for Cyprus? See <Link to="/certificates" className="underline">Cyprus certificates</Link>.
        </p>
      </section>
    </PageLayout>
  );
}
