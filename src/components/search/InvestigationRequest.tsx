import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, LogIn, UserPlus } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { useCountries } from '@/lib/countries';
import type { Product } from '@/types/database';

const OPTIONS = [
  { slug: 'global-structure-report', label: 'Company Structure investigation', desc: 'Registry details, officers and shareholders' },
  { slug: 'global-credit-report', label: 'Credit Report investigation', desc: 'Structure plus financials and credit rating' },
];

const schema = z.object({
  name: z.string().trim().min(2, 'Enter the company name').max(200),
  regNo: z.string().trim().max(50).optional(),
  country: z.string().trim().regex(/^[A-Za-z]{2,3}$/, 'Choose a country'),
});

export default function InvestigationRequest({ query, country }: { query: string; country: string }) {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { countries } = useCountries();
  const looksLikeNumber = /\d{4,}/.test(query);
  const [name, setName] = useState(looksLikeNumber ? '' : query);
  const [regNo, setRegNo] = useState(looksLikeNumber ? query : '');
  const [cc, setCc] = useState((country && country !== 'all' ? country : '').toUpperCase());
  const [slug, setSlug] = useState(OPTIONS[0].slug);
  const [products, setProducts] = useState<Product[]>([]);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    supabase.from('products').select('*').in('slug', OPTIONS.map((o) => o.slug)).eq('is_active', true)
      .then(({ data }) => setProducts((data ?? []) as unknown as Product[]));
  }, []);

  const returnTo = `${window.location.pathname}${window.location.search}`;

  const submit = async () => {
    setError('');
    const parsed = schema.safeParse({ name, regNo, country: cc });
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    const product = products.find((p) => p.slug === slug);
    if (!product) { setError('This investigation is not available right now.'); return; }
    setBusy(true);
    try {
      const { data, error: rpcErr } = await (supabase as any).rpc('create_investigation_company', {
        _name: parsed.data.name, _reg_no: parsed.data.regNo || null, _country: parsed.data.country,
      });
      const company = Array.isArray(data) ? data[0] : data;
      if (rpcErr || !company) throw new Error(rpcErr?.message || 'Could not submit');
      addItem(product, company, undefined, { freshInvestigation: true });
      navigate('/checkout/details');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit');
    } finally { setBusy(false); }
  };

  const field = 'w-full border rounded-md px-3 py-2 text-sm outline-none';
  const fieldStyle = { borderColor: 'var(--bg-border)', color: 'var(--text-body)' };

  return (
    <div className="rounded-lg border p-6 bg-card" style={{ borderColor: 'var(--bg-border)' }}>
      <div className="flex items-center gap-2 mb-1">
        <SearchIcon className="w-5 h-5" style={{ color: 'var(--brand-accent)' }} />
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-heading)' }}>No companies found — request an investigation</h3>
      </div>
      <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
        We couldn't find "{query}" in our database. Our researchers can investigate the company and deliver a fresh report, usually within 3–5 working days.
      </p>

      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-body)' }}>Company name *</label>
          <input className={field} style={fieldStyle} value={name} maxLength={200} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-body)' }}>Registration / VAT number</label>
          <input className={field} style={fieldStyle} value={regNo} maxLength={50} onChange={(e) => setRegNo(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-body)' }}>Country *</label>
          <select className={field} style={fieldStyle} value={cc} onChange={(e) => setCc(e.target.value)}>
            <option value="">Choose a country</option>
            {countries.map((c) => <option key={c.code} value={c.code.toUpperCase()}>{c.flag_emoji} {c.name}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-2 mb-5">
        {OPTIONS.map((o) => {
          const p = products.find((x) => x.slug === o.slug);
          if (!p) return null;
          return (
            <label key={o.slug} className="flex items-center gap-3 border rounded-lg p-3 cursor-pointer"
              style={{ borderColor: slug === o.slug ? 'var(--brand-accent)' : 'var(--bg-border)' }}>
              <input type="radio" checked={slug === o.slug} onChange={() => setSlug(o.slug)} />
              <span className="flex-1 text-sm">
                <span className="font-medium" style={{ color: 'var(--text-heading)' }}>{o.label}</span>
                <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>{o.desc}</span>
              </span>
              <span className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>€{Number(p.base_price).toFixed(2)}</span>
            </label>
          );
        })}
      </div>

      {error && <p className="text-sm mb-3" style={{ color: 'var(--status-dissolved)' }}>{error}</p>}

      {signedIn === false ? (
        <div className="rounded-md p-4" style={{ backgroundColor: 'var(--bg-subtle)' }}>
          <p className="text-sm mb-3" style={{ color: 'var(--text-body)' }}>Please sign in or create an account to submit an investigation.</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-primary-foreground bg-primary">
              <LogIn className="w-4 h-4" /> Log in
            </button>
            <button onClick={() => navigate(`/register?returnTo=${encodeURIComponent(returnTo)}`)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border"
              style={{ borderColor: 'var(--brand-accent)', color: 'var(--brand-accent)' }}>
              <UserPlus className="w-4 h-4" /> Create account
            </button>
          </div>
        </div>
      ) : (
        <>
          <button disabled={busy || signedIn === null} onClick={submit}
            className="px-5 py-2.5 rounded-md text-sm font-medium text-primary-foreground bg-primary disabled:opacity-60">
            {busy ? 'Submitting…' : 'Submit investigation & continue to payment'}
          </button>
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>At checkout, pay by card or use your account credit.</p>
        </>
      )}
    </div>
  );
}
