import React, { useEffect, useState, useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

interface PromoCode {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

const EMPTY = {
  code: '',
  discount_type: 'percent',
  discount_value: 10,
  max_uses: null as number | null,
  expires_at: '',
  is_active: true,
};

export default function AdminPromoCodesPage() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  const fetchCodes = useCallback(async () => {
    const { data } = await supabase.from('promo_codes').select('*').order('created_at', { ascending: false });
    setCodes((data ?? []) as PromoCode[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCodes(); }, [fetchCodes]);

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('promo_codes').update({ is_active: !current }).eq('id', id);
    setCodes(prev => prev.map(c => c.id === id ? { ...c, is_active: !current } : c));
  };

  const create = async () => {
    setSaving(true);
    const payload: any = {
      code: form.code.toUpperCase().trim(),
      discount_type: form.discount_type,
      discount_value: form.discount_value,
      max_uses: form.max_uses || null,
      expires_at: form.expires_at || null,
      is_active: form.is_active,
    };
    const { error } = await supabase.from('promo_codes').insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Promo code created' });
      setModal(false);
      setForm({ ...EMPTY });
      fetchCodes();
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>Promo Codes</h1>
          <button
            onClick={() => { setForm({ ...EMPTY }); setModal(true); }}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg text-white"
            style={{ background: 'var(--brand-accent)' }}
          >
            <Plus className="h-4 w-4" /> Create Code
          </button>
        </div>

        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {['Code', 'Discount', 'Uses', 'Expires', 'Active', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Loading…</td></tr>
                ) : codes.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No promo codes yet</td></tr>
                ) : (
                  codes.map(c => (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold">{c.code}</td>
                      <td className="px-4 py-3">
                        {c.discount_type === 'percent' ? `${c.discount_value}%` : `€${c.discount_value}`}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {c.uses_count}{c.max_uses ? ` / ${c.max_uses}` : ''}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {c.expires_at ? format(new Date(c.expires_at), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleActive(c.id, c.is_active)}
                          className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${c.is_active ? 'bg-green-500' : 'bg-muted-foreground/30'}`}
                        >
                          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${c.is_active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={async () => {
                            await supabase.from('promo_codes').delete().eq('id', c.id);
                            setCodes(prev => prev.filter(x => x.id !== c.id));
                          }}
                          className="text-xs px-2 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50 transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-lg" style={{ color: 'var(--text-heading)' }}>Create Promo Code</h3>
              <button onClick={() => setModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Code*</label>
                <input
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                  placeholder="SUMMER25"
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Type</label>
                  <select
                    value={form.discount_type}
                    onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="percent">Percent (%)</option>
                    <option value="fixed">Fixed (€)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Value</label>
                  <input
                    type="number"
                    value={form.discount_value}
                    onChange={e => setForm(f => ({ ...f, discount_value: parseFloat(e.target.value) || 0 }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Max Uses</label>
                  <input
                    type="number"
                    value={form.max_uses ?? ''}
                    onChange={e => setForm(f => ({ ...f, max_uses: parseInt(e.target.value) || null }))}
                    placeholder="Unlimited"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Expires At</label>
                  <input
                    type="date"
                    value={form.expires_at}
                    onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Active immediately</span>
                <button
                  onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                  className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${form.is_active ? 'bg-green-500' : 'bg-muted-foreground/30'}`}
                >
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.is_active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(false)} className="flex-1 py-2 text-sm border rounded-lg hover:bg-muted transition-colors">
                Cancel
              </button>
              <button
                onClick={create}
                disabled={saving || !form.code}
                className="flex-1 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
                style={{ background: 'var(--brand-accent)' }}
              >
                {saving ? 'Creating…' : 'Create Code'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
