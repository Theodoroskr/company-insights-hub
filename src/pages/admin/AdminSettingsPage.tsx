import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/lib/tenant';
import { toast } from '@/hooks/use-toast';

interface TenantForm {
  brand_name: string;
  logo_url: string;
  favicon_url: string;
  primary_color: string;
  meta_title: string;
  meta_description: string;
  footer_disclaimer: string;
}

export default function AdminSettingsPage() {
  const { tenant } = useTenant();
  const [form, setForm] = useState<TenantForm>({
    brand_name: '',
    logo_url: '',
    favicon_url: '',
    primary_color: '#1B3A6B',
    meta_title: '',
    meta_description: '',
    footer_disclaimer: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tenant) {
      setForm({
        brand_name: tenant.brand_name ?? '',
        logo_url: tenant.logo_url ?? '',
        favicon_url: tenant.favicon_url ?? '',
        primary_color: tenant.primary_color ?? '#1B3A6B',
        meta_title: tenant.meta_title ?? '',
        meta_description: tenant.meta_description ?? '',
        footer_disclaimer: tenant.footer_disclaimer ?? '',
      });
    }
  }, [tenant]);

  const save = async () => {
    if (!tenant?.id) return;
    setSaving(true);
    const { error } = await supabase.from('tenants').update({
      brand_name: form.brand_name,
      logo_url: form.logo_url || null,
      favicon_url: form.favicon_url || null,
      primary_color: form.primary_color,
      meta_title: form.meta_title || null,
      meta_description: form.meta_description || null,
      footer_disclaimer: form.footer_disclaimer || null,
    }).eq('id', tenant.id);
    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      // Apply primary color immediately
      document.documentElement.style.setProperty('--brand-primary', form.primary_color);
      toast({ title: 'Settings saved' });
    }
  };

  const f = (key: keyof TenantForm, label: string, type: string = 'text', hint?: string) => (
    <div key={key}>
      <label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );

  return (
    <AdminLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>Settings</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tenant Settings Form */}
          <div className="space-y-5">
            <div className="bg-card border rounded-xl p-5">
              <h2 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-heading)' }}>Brand Settings</h2>
              <div className="space-y-4">
                {f('brand_name', 'Brand Name*')}
                {f('logo_url', 'Logo URL', 'text', 'Full URL to your logo image (PNG/SVG)')}
                {f('favicon_url', 'Favicon URL', 'text', 'Full URL to favicon (.ico or .png)')}
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Primary Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={form.primary_color}
                      onChange={e => setForm(prev => ({ ...prev, primary_color: e.target.value }))}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <input
                      type="text"
                      value={form.primary_color}
                      onChange={e => setForm(prev => ({ ...prev, primary_color: e.target.value }))}
                      className="flex-1 border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card border rounded-xl p-5">
              <h2 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-heading)' }}>SEO</h2>
              <div className="space-y-4">
                {f('meta_title', 'Meta Title', 'text', 'Shown in browser tab and search results (<60 chars)')}
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Meta Description</label>
                  <textarea
                    value={form.meta_description}
                    onChange={e => setForm(prev => ({ ...prev, meta_description: e.target.value }))}
                    rows={3}
                    className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Search result snippet (<160 chars)"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Footer Disclaimer</label>
                  <textarea
                    value={form.footer_disclaimer}
                    onChange={e => setForm(prev => ({ ...prev, footer_disclaimer: e.target.value }))}
                    rows={4}
                    className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Legal disclaimer text shown in footer…"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={save}
              disabled={saving}
              className="w-full py-3 text-sm font-medium text-white rounded-xl disabled:opacity-50 transition-opacity"
              style={{ background: 'var(--brand-accent)' }}
            >
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>

          {/* Live Preview */}
          <div className="space-y-4">
            <div className="bg-card border rounded-xl p-5">
              <h2 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-heading)' }}>Live Navbar Preview</h2>
              <div
                className="rounded-lg overflow-hidden border"
                style={{ background: form.primary_color }}
              >
                <div className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {form.logo_url ? (
                      <img src={form.logo_url} alt="Logo" className="h-6 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    ) : (
                      <div className="w-6 h-6 rounded bg-white/20" />
                    )}
                    <span className="text-white font-bold text-sm">{form.brand_name || 'Brand Name'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-white/70 text-xs">Home</span>
                    <span className="text-white/70 text-xs">Search</span>
                    <span className="text-xs px-2 py-1 rounded text-white" style={{ background: 'var(--brand-accent)' }}>Sign In</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <div className="text-xs text-muted-foreground mb-2 font-medium">Footer Color</div>
                <div className="rounded-lg px-4 py-3" style={{ background: 'var(--brand-dark)' }}>
                  <span className="text-white/70 text-xs">{form.brand_name || 'Brand Name'} © {new Date().getFullYear()}</span>
                </div>
              </div>
            </div>

            <div className="bg-card border rounded-xl p-5">
              <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--text-heading)' }}>Tenant Info</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Domain</dt><dd className="font-mono text-xs">{tenant?.domain ?? '—'}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Slug</dt><dd className="font-mono text-xs">{tenant?.slug ?? '—'}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Country</dt><dd>{tenant?.country_code ?? '—'}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Active</dt><dd>{tenant?.is_active ? '✅ Yes' : '❌ No'}</dd></div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
