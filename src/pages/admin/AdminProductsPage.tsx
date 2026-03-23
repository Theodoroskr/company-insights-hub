import React, { useEffect, useState, useCallback } from 'react';
import { Plus, X, GripVertical } from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Product {
  id: string;
  name: string;
  slug: string;
  type: string;
  base_price: number;
  service_fee: number;
  api4all_product_code: string | null;
  is_active: boolean;
  display_order: number;
  is_instant: boolean;
  delivery_sla_hours: number;
  description: string | null;
  what_is_included: string[];
  sample_pdf_url: string | null;
  vat_on_full_price: boolean;
  vat_on_fee_only: boolean;
  available_speeds: any;
  tenant_id: string | null;
}

const EMPTY: Omit<Product, 'id'> = {
  name: '',
  slug: '',
  type: 'report',
  base_price: 0,
  service_fee: 0,
  api4all_product_code: null,
  is_active: true,
  display_order: 0,
  is_instant: false,
  delivery_sla_hours: 24,
  description: null,
  what_is_included: [],
  sample_pdf_url: null,
  vat_on_full_price: true,
  vat_on_fee_only: false,
  available_speeds: [],
  tenant_id: null,
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Product> & { id?: string }>({});
  const [saving, setSaving] = useState(false);
  const [speedsText, setSpeedsText] = useState('[]');
  const [includedText, setIncludedText] = useState('');
  const [speedsError, setSpeedsError] = useState('');

  const fetchProducts = useCallback(async () => {
    const { data } = await supabase.from('products').select('*').order('display_order', { ascending: true });
    setProducts((data ?? []) as Product[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const openNew = () => {
    setEditing({ ...EMPTY });
    setSpeedsText('[]');
    setIncludedText('');
    setSpeedsError('');
    setDrawerOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing({ ...p });
    setSpeedsText(JSON.stringify(p.available_speeds ?? [], null, 2));
    setIncludedText((p.what_is_included ?? []).join('\n'));
    setSpeedsError('');
    setDrawerOpen(true);
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('products').update({ is_active: !current }).eq('id', id);
    setProducts(prev => prev.map(p => p.id === id ? { ...p, is_active: !current } : p));
  };

  const save = async () => {
    setSaving(true);
    let speeds: any = [];
    try {
      speeds = JSON.parse(speedsText);
      setSpeedsError('');
    } catch {
      setSpeedsError('Invalid JSON for speeds');
      setSaving(false);
      return;
    }

    const payload: any = {
      ...editing,
      available_speeds: speeds,
      what_is_included: includedText.split('\n').map(s => s.trim()).filter(Boolean),
    };
    delete payload.id;

    let error: any;
    if (editing.id) {
      const res = await supabase.from('products').update(payload).eq('id', editing.id);
      error = res.error;
    } else {
      const res = await supabase.from('products').insert(payload);
      error = res.error;
    }

    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: editing.id ? 'Product updated' : 'Product created' });
      setDrawerOpen(false);
      fetchProducts();
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>Products</h1>
          <button onClick={openNew} className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg text-white" style={{ background: 'var(--brand-accent)' }}>
            <Plus className="h-4 w-4" /> Add Product
          </button>
        </div>

        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {['', 'Name', 'Type', 'Price', 'Service Fee', 'API4All Code', 'SLA', 'Active', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">Loading…</td></tr>
                ) : products.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">No products yet</td></tr>
                ) : (
                  products.map(p => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-3 text-muted-foreground"><GripVertical className="h-4 w-4" /></td>
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">{p.type}</td>
                      <td className="px-4 py-3 tabular-nums">€{Number(p.base_price).toFixed(2)}</td>
                      <td className="px-4 py-3 tabular-nums">€{Number(p.service_fee).toFixed(2)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.api4all_product_code ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{p.delivery_sla_hours}h</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleActive(p.id, p.is_active)}
                          className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${p.is_active ? 'bg-green-500' : 'bg-muted-foreground/30'}`}
                        >
                          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${p.is_active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => openEdit(p)} className="text-xs px-2.5 py-1 border rounded hover:bg-muted transition-colors">
                          Edit
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

      {/* Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30" onClick={() => setDrawerOpen(false)} />
          <div className="w-full max-w-lg bg-background shadow-2xl overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-background z-10">
              <h2 className="font-semibold text-lg" style={{ color: 'var(--text-heading)' }}>
                {editing.id ? 'Edit Product' : 'New Product'}
              </h2>
              <button onClick={() => setDrawerOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 px-6 py-5 space-y-4">
              {[
                { label: 'Name*', key: 'name', type: 'text' },
                { label: 'Slug*', key: 'slug', type: 'text' },
                { label: 'API4All Product Code', key: 'api4all_product_code', type: 'text' },
                { label: 'Base Price (€)', key: 'base_price', type: 'number' },
                { label: 'Service Fee (€)', key: 'service_fee', type: 'number' },
                { label: 'Delivery SLA (hours)', key: 'delivery_sla_hours', type: 'number' },
                { label: 'Sample PDF URL', key: 'sample_pdf_url', type: 'text' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>
                  <input
                    type={type}
                    value={(editing as any)[key] ?? ''}
                    onChange={e => setEditing(prev => ({ ...prev, [key]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              ))}

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Type</label>
                <select
                  value={editing.type ?? 'report'}
                  onChange={e => setEditing(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {['report', 'extract', 'monitoring', 'service'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Description</label>
                <textarea
                  value={editing.description ?? ''}
                  onChange={e => setEditing(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">What's included (one per line)</label>
                <textarea
                  value={includedText}
                  onChange={e => setIncludedText(e.target.value)}
                  rows={4}
                  className="w-full border rounded-lg px-3 py-2 text-sm resize-none font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Full company details&#10;Director list&#10;Shareholder information"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Available Speeds (JSON)</label>
                <textarea
                  value={speedsText}
                  onChange={e => setSpeedsText(e.target.value)}
                  rows={5}
                  className={`w-full border rounded-lg px-3 py-2 text-sm resize-none font-mono focus:outline-none focus:ring-2 focus:ring-ring ${speedsError ? 'border-destructive' : ''}`}
                  placeholder='[{"label":"Normal","code":"normal","price_delta":0}]'
                />
                {speedsError && <p className="text-xs text-destructive mt-1">{speedsError}</p>}
              </div>

              {/* Toggles */}
              {[
                { label: 'Instant delivery', key: 'is_instant' },
                { label: 'VAT on full price', key: 'vat_on_full_price' },
                { label: 'VAT on fee only', key: 'vat_on_fee_only' },
                { label: 'Active', key: 'is_active' },
              ].map(({ label, key }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm">{label}</span>
                  <button
                    onClick={() => setEditing(prev => ({ ...prev, [key]: !(prev as any)[key] }))}
                    className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${(editing as any)[key] ? 'bg-green-500' : 'bg-muted-foreground/30'}`}
                  >
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${(editing as any)[key] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 border-t sticky bottom-0 bg-background">
              <button
                onClick={save}
                disabled={saving}
                className="w-full py-2.5 text-sm font-medium text-white rounded-lg disabled:opacity-50 transition-opacity"
                style={{ background: 'var(--brand-accent)' }}
              >
                {saving ? 'Saving…' : (editing.id ? 'Update Product' : 'Create Product')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
