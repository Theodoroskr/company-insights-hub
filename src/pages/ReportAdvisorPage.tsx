import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Sparkles, Loader2, ArrowRight } from 'lucide-react';
import PageLayout from '../components/layout/PageLayout';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '../lib/tenant';
import { priceProduct, getVatRate, formatEur } from '../lib/pricing';
import type { Product } from '../types/database';

const COUNTRIES = [
  ['CY', 'Cyprus'], ['GB', 'United Kingdom'], ['GR', 'Greece'], ['MT', 'Malta'],
  ['RO', 'Romania'], ['AE', 'United Arab Emirates'], ['DE', 'Germany'], ['FR', 'France'],
  ['US', 'United States'], ['OTHER', 'Other country'],
];

interface Rec { recommended: string; reason: string; alternatives: { slug: string; reason: string }[] }

export default function ReportAdvisorPage() {
  const { tenant } = useTenant();
  const vat = getVatRate(tenant?.slug);
  const [country, setCountry] = useState('CY');
  const [needs, setNeeds] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rec, setRec] = useState<Rec | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    supabase.from('products').select('*').eq('is_active', true).then(({ data }) => setProducts((data as unknown as Product[]) ?? []));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null); setRec(null);
    const { data, error: fnErr } = await supabase.functions.invoke('recommend-report', {
      body: { country: country === 'OTHER' ? 'XX' : country, needs },
    });
    setLoading(false);
    if (fnErr) {
      let msg = fnErr.message;
      try { msg = (await (fnErr as any).context?.json())?.error ?? msg; } catch { /* keep */ }
      setError(msg);
      return;
    }
    if (data?.error) setError(data.error); else setRec(data as Rec);
  };

  const card = (slug: string, reason: string, primary: boolean) => {
    const p = products.find((x) => x.slug === slug);
    if (!p) return null;
    const price = priceProduct(p, vat);
    return (
      <div key={slug} className={`rounded-xl border p-5 bg-card ${primary ? 'border-primary shadow-md' : 'border-border'}`}>
        {primary && <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">Best match</p>}
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-semibold text-foreground">{p.name}</h3>
          <span className="font-semibold text-foreground whitespace-nowrap">{formatEur(price.net)}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-2">{reason}</p>
        <Link to={`/report?type=${p.slug}`} className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-primary hover:underline">
          View details <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  };

  return (
    <PageLayout>
      <Helmet><title>Report Advisor — find the right due-diligence report</title></Helmet>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="flex items-center gap-2 text-primary mb-2"><Sparkles className="w-5 h-5" /><span className="text-sm font-semibold">AI-powered</span></div>
        <h1 className="text-3xl font-bold text-foreground">Which report do I need?</h1>
        <p className="text-muted-foreground mt-2">Tell us where the company is registered and what you need to check. We'll recommend the best report or KYB package.</p>

        <form onSubmit={submit} className="mt-8 space-y-4 rounded-xl border border-border bg-card p-6">
          <label className="block">
            <span className="text-sm font-medium text-foreground">Company country</span>
            <select value={country} onChange={(e) => setCountry(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground">
              {COUNTRIES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-foreground">Your due-diligence needs</span>
            <textarea value={needs} onChange={(e) => setNeeds(e.target.value)} rows={5} maxLength={2000}
              placeholder="e.g. Onboarding a new supplier, need to confirm directors, shareholders and check for sanctions."
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground" />
          </label>
          <button type="submit" disabled={loading || needs.trim().length < 5}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'Finding the best match…' : 'Get recommendation'}
          </button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>

        {rec && (
          <div className="mt-8 space-y-4">
            {card(rec.recommended, rec.reason, true)}
            {rec.alternatives.length > 0 && <h2 className="text-sm font-semibold text-muted-foreground pt-2">Alternatives</h2>}
            {rec.alternatives.map((a) => card(a.slug, a.reason, false))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
