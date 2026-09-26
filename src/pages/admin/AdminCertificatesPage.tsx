import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { loadCertificateCountries } from '@/lib/certificateAvailability';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface CountryRow { code: string; name: string; flag_emoji: string | null; certificates_enabled: boolean }
interface CertRow {
  id: string; name: string; slug: string; base_price: number; service_fee: number | null;
  is_active: boolean; allowed_countries: string[] | null; country_scope: string | null;
}

const countryOf = (p: CertRow) =>
  (p.allowed_countries?.[0] ?? (p.country_scope === 'uk-only' ? 'GB' : p.country_scope === 'cy-only' ? 'CY' : '—')).toUpperCase();

export default function AdminCertificatesPage() {
  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [certs, setCerts] = useState<CertRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Partial<CertRow>>>({});

  const load = useCallback(async () => {
    const [{ data: c }, { data: p }] = await Promise.all([
      (supabase.from('countries') as any).select('code, name, flag_emoji, certificates_enabled').order('name'),
      supabase.from('products').select('id, name, slug, base_price, service_fee, is_active, allowed_countries, country_scope')
        .eq('type', 'certificate').like('slug', 'certificate\\_%').order('display_order'),
    ]);
    setCountries((c ?? []) as CountryRow[]);
    setCerts((p ?? []) as unknown as CertRow[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const byCountry = useMemo(() => {
    const m = new Map<string, CertRow[]>();
    for (const p of certs) m.set(countryOf(p), [...(m.get(countryOf(p)) ?? []), p]);
    return m;
  }, [certs]);

  // Countries that have certificates, plus any already switched on
  const shown = countries.filter((c) => byCountry.has(c.code.toUpperCase()) || c.certificates_enabled);

  const toggleCountry = async (c: CountryRow, on: boolean) => {
    const list = byCountry.get(c.code.toUpperCase()) ?? [];
    if (on && !list.some((p) => p.is_active && Number(p.base_price) > 0)) {
      toast.error('Price and activate at least one certificate for this country first.');
      return;
    }
    const { error } = await (supabase.from('countries') as any).update({ certificates_enabled: on }).eq('code', c.code);
    if (error) return toast.error(error.message);
    await loadCertificateCountries(true);
    toast.success(`Certificates ${on ? 'enabled' : 'disabled'} for ${c.name}`);
    load();
  };

  const save = async (p: CertRow) => {
    const d = { ...p, ...drafts[p.id] };
    if (d.is_active && Number(d.base_price) <= 0) return toast.error('Set a price before activating.');
    const { error } = await supabase.from('products').update({
      name: d.name, base_price: Number(d.base_price), service_fee: Number(d.service_fee ?? 0), is_active: d.is_active,
    }).eq('id', p.id);
    if (error) return toast.error(error.message);
    setDrafts((s) => { const n = { ...s }; delete n[p.id]; return n; });
    toast.success('Saved');
    load();
  };

  const set = (id: string, patch: Partial<CertRow>) => setDrafts((s) => ({ ...s, [id]: { ...s[id], ...patch } }));

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-heading)' }}>Certificates</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        Switch official certificates on per country. Certificates only appear on companies from switched-on countries.
      </p>

      {shown.map((c) => {
        const list = byCountry.get(c.code.toUpperCase()) ?? [];
        return (
          <section key={c.code} className="mb-6 rounded-xl border" style={{ borderColor: 'var(--border-default)' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
              <div className="font-semibold" style={{ color: 'var(--text-heading)' }}>
                {c.flag_emoji} {c.name} <span className="text-sm font-normal" style={{ color: 'var(--text-muted)' }}>· {list.length} certificates</span>
              </div>
              <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-body)' }}>
                Certificates available
                <Switch checked={c.certificates_enabled} onCheckedChange={(v) => toggleCountry(c, v)} />
              </label>
            </div>
            <table className="w-full text-sm">
              <thead><tr style={{ color: 'var(--text-muted)' }}>
                <th className="text-left font-medium px-4 py-2">Certificate</th>
                <th className="text-left font-medium px-4 py-2 w-28">Price €</th>
                <th className="text-left font-medium px-4 py-2 w-28">Service fee €</th>
                <th className="text-left font-medium px-4 py-2 w-20">Active</th>
                <th className="w-20" />
              </tr></thead>
              <tbody>
                {list.map((p) => {
                  const d = { ...p, ...drafts[p.id] };
                  return (
                    <tr key={p.id} className="border-t" style={{ borderColor: 'var(--border-default)' }}>
                      <td className="px-4 py-2"><input className="w-full border rounded px-2 py-1" value={d.name} onChange={(e) => set(p.id, { name: e.target.value })} /></td>
                      <td className="px-4 py-2"><input type="number" min={0} className="w-full border rounded px-2 py-1" value={d.base_price} onChange={(e) => set(p.id, { base_price: Number(e.target.value) })} /></td>
                      <td className="px-4 py-2"><input type="number" min={0} className="w-full border rounded px-2 py-1" value={d.service_fee ?? 0} onChange={(e) => set(p.id, { service_fee: Number(e.target.value) })} /></td>
                      <td className="px-4 py-2"><Switch checked={d.is_active} onCheckedChange={(v) => set(p.id, { is_active: v })} /></td>
                      <td className="px-4 py-2">
                        {drafts[p.id] && <button onClick={() => save(p)} className="px-3 py-1 rounded text-white text-xs" style={{ backgroundColor: 'var(--brand-accent)' }}>Save</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        );
      })}
    </AdminLayout>
  );
}
