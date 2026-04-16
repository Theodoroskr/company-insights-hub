import React, { useEffect, useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Briefcase, FileText, ShieldCheck, TrendingUp, Globe, AlertTriangle } from 'lucide-react';
import PageLayout from '../components/layout/PageLayout';
import CountryFlag from '../components/ui/CountryFlag';
import RiskMeter from '../components/ui/RiskMeter';
import RiskTrafficLight from '../components/ui/RiskTrafficLight';
import CoverageTierBadge from '../components/ui/CoverageTierBadge';
import SearchWidget from '../components/search/SearchWidget';
import { supabase } from '../integrations/supabase/client';
import type { Country } from '../types/database';

export default function CountryDashboardPage() {
  const { code } = useParams<{ code: string }>();
  const [country, setCountry] = useState<Country | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    supabase
      .from('countries')
      .select('*')
      .eq('code', code.toUpperCase())
      .maybeSingle()
      .then(({ data }) => {
        if (data) setCountry(data as unknown as Country);
        else setNotFound(true);
        setLoading(false);
      });
  }, [code]);

  if (notFound) return <Navigate to="/" replace />;

  if (loading || !country) {
    return (
      <PageLayout>
        <div className="max-w-6xl mx-auto py-20 px-4">
          <div className="h-32 rounded-xl skeleton-shimmer" />
        </div>
      </PageLayout>
    );
  }

  const heroBg =
    country.risk_band === 'low' ? 'linear-gradient(135deg, #064e3b 0%, #0F2444 100%)' :
    country.risk_band === 'medium' ? 'linear-gradient(135deg, #78350F 0%, #0F2444 100%)' :
    country.risk_band === 'high' ? 'linear-gradient(135deg, #7F1D1D 0%, #0F2444 100%)' :
    country.risk_band === 'very_high' || country.risk_band === 'critical' ? 'linear-gradient(135deg, #450A0A 0%, #0F2444 100%)' :
    'linear-gradient(135deg, #1B3A6B 0%, #0F2444 100%)';

  const title = `${country.name} — Company Reports & Risk Profile | Infocredit World`;
  const description = `Order instant KYB and company reports for ${country.name}. Risk profile, sanctions screening, registry data and country risk dashboard.`;

  return (
    <PageLayout>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={`https://infocreditworld.com/country/${country.code.toLowerCase()}`} />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Country',
            name: country.name,
            identifier: country.iso2,
            description,
          })}
        </script>
      </Helmet>

      {/* HERO */}
      <section className="py-16 md:py-20 px-4" style={{ background: heroBg }}>
        <div className="max-w-6xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-2 text-sm mb-8 hover:underline" style={{ color: 'rgba(255,255,255,0.7)' }}>
            <ArrowLeft className="w-4 h-4" /> Back to global coverage
          </Link>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10 mb-8">
            <div className="rounded-xl overflow-hidden shadow-2xl flex-shrink-0" style={{ border: '4px solid rgba(255,255,255,0.15)' }}>
              <CountryFlag iso2={country.iso2} emoji={country.flag_emoji} size="hero" rounded={false} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <CoverageTierBadge tier={country.coverage_tier} />
                {country.risk_band && <RiskTrafficLight band={country.risk_band} />}
                <span className="text-xs px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.2)' }}>
                  {country.subregion ?? country.region}
                </span>
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold leading-none mb-3" style={{ color: '#fff' }}>
                {country.name}
              </h1>
              <p className="text-lg max-w-2xl" style={{ color: 'rgba(255,255,255,0.75)' }}>
                Instant company intelligence, KYB reports and risk profile for {country.name}.
                {country.coverage_tier === 'premium' && ' Real-time registry access — delivered in seconds.'}
                {country.coverage_tier === 'standard' && ' Verified registry data — typically delivered within 24 hours.'}
                {country.coverage_tier === 'on_request' && ' Specialist research via our local network — delivered in 2-5 business days.'}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="bg-white/5 backdrop-blur rounded-xl p-4 border" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            <p className="text-xs uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Search any company in {country.name}
            </p>
            <SearchWidget size="hero" isGlobal={false} />
          </div>
        </div>
      </section>

      {/* RISK BREAKDOWN */}
      <section className="py-16 px-4" style={{ backgroundColor: '#fff' }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Risk meters */}
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-heading)' }}>Risk profile</h2>
              <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
                Composite risk assessment across four dimensions. Updated quarterly.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                <RiskMeter label="Political Risk" band={country.political_risk} />
                <RiskMeter label="Economic Risk" band={country.economic_risk} />
                <RiskMeter label="Sanctions Exposure" band={country.sanctions_risk} />
                <RiskMeter label="AML / FATF" band={country.aml_risk} />
              </div>

              {/* Composite */}
              <div className="mt-10 p-6 rounded-xl" style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--bg-border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Composite risk score
                  </span>
                  {country.risk_band && <RiskTrafficLight band={country.risk_band} />}
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl font-extrabold" style={{ color: 'var(--text-heading)' }}>
                    {country.risk_score ?? '—'}
                  </span>
                  <span className="text-base" style={{ color: 'var(--text-muted)' }}>/ 100</span>
                </div>
              </div>
            </div>

            {/* Side facts */}
            <aside className="space-y-4">
              <FactCard icon={<Globe className="w-4 h-4" />} label="Region" value={`${country.region}${country.subregion ? ' · ' + country.subregion : ''}`} />
              <FactCard icon={<TrendingUp className="w-4 h-4" />} label="Business climate" value={country.business_climate_score ? `${country.business_climate_score} / 100` : 'N/A'} />
              <FactCard icon={<ShieldCheck className="w-4 h-4" />} label="Currency" value={country.currency_code ?? 'N/A'} />
              <FactCard icon={<AlertTriangle className="w-4 h-4" />} label="ISO code" value={country.iso2 ?? country.code} />
            </aside>
          </div>
        </div>
      </section>

      {/* CTA: Doing Business In bundle */}
      <section className="py-16 px-4" style={{ backgroundColor: 'var(--bg-subtle)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="rounded-2xl p-8 md:p-12 text-white relative overflow-hidden" style={{ background: heroBg }}>
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                  <Briefcase className="w-3.5 h-3.5" />
                  Doing Business In Bundle
                </div>
                <h3 className="text-3xl font-extrabold mb-3 leading-tight">
                  Everything you need for {country.name}, in one pack
                </h3>
                <p className="text-base mb-4" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  Company intelligence + country risk + industry outlook + sanctions screening — bundled at one price.
                </p>
                <ul className="space-y-1.5 text-sm" style={{ color: 'rgba(255,255,255,0.9)' }}>
                  <li>✓ Up to 3 KYB reports for local counterparties</li>
                  <li>✓ Full country risk dashboard (PDF)</li>
                  <li>✓ Sector outlook & key industry players</li>
                  <li>✓ Heritage Infocredit local commentary</li>
                </ul>
              </div>
              <div className="text-center md:text-right">
                <div className="text-5xl font-extrabold mb-1">€199</div>
                <div className="text-xs uppercase tracking-wider mb-4" style={{ color: 'rgba(255,255,255,0.7)' }}>One-time · No subscription</div>
                <Link
                  to="/contact"
                  className="inline-block px-6 py-3 rounded-lg font-semibold text-sm transition-all hover:scale-105"
                  style={{ backgroundColor: '#fff', color: 'var(--brand-primary)' }}
                >
                  Order bundle →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Available reports */}
      <section className="py-16 px-4" style={{ backgroundColor: '#fff' }}>
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-heading)' }}>Available reports for {country.name}</h2>
          <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
            All reports delivered as branded PDFs · Sourced from official registry data.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: <FileText className="w-5 h-5" />, name: 'Company Structure Report', sla: country.coverage_tier === 'premium' ? 'Instant' : '24h', price: '€49' },
              { icon: <ShieldCheck className="w-5 h-5" />, name: 'KYB & Compliance Report', sla: country.coverage_tier === 'premium' ? 'Instant' : '24h', price: '€89' },
              { icon: <TrendingUp className="w-5 h-5" />, name: 'Credit & Financial Report', sla: country.coverage_tier === 'on_request' ? '2-5 days' : '24-48h', price: '€129' },
            ].map((r) => (
              <div key={r.name} className="rounded-xl p-6 transition-all hover:shadow-md" style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--bg-border)' }}>
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg mb-3" style={{ backgroundColor: 'var(--brand-primary)', color: '#fff' }}>
                  {r.icon}
                </div>
                <h3 className="font-bold mb-1" style={{ color: 'var(--text-heading)' }}>{r.name}</h3>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{r.sla}</span>
                  <span className="text-lg font-extrabold" style={{ color: 'var(--brand-accent)' }}>{r.price}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageLayout>
  );
}

function FactCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl p-4 flex items-start gap-3" style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--bg-border)' }}>
      <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0" style={{ backgroundColor: '#fff', color: 'var(--brand-accent)', border: '1px solid var(--bg-border)' }}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>{label}</div>
        <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-heading)' }}>{value}</div>
      </div>
    </div>
  );
}
