import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Globe, Palette, Edit2, X, Check, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface Tenant {
  id: string;
  brand_name: string;
  slug: string;
  domain: string;
  country_code: string | null;
  is_active: boolean | null;
  primary_color: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  footer_disclaimer: string | null;
  created_at: string | null;
}

interface TenantStats {
  tenant_id: string;
  order_count: number;
  revenue: number;
}

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [stats, setStats] = useState<Record<string, TenantStats>>({});
  const [loading, setLoading] = useState(true);
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: tenantData }, { data: orderData }] = await Promise.all([
      supabase.from('tenants').select('*').order('brand_name'),
      supabase.from('orders').select('tenant_id, total, status'),
    ]);

    setTenants(tenantData || []);

    const statsMap: Record<string, TenantStats> = {};
    (orderData || []).forEach((o: any) => {
      if (!o.tenant_id) return;
      if (!statsMap[o.tenant_id]) {
        statsMap[o.tenant_id] = { tenant_id: o.tenant_id, order_count: 0, revenue: 0 };
      }
      statsMap[o.tenant_id].order_count++;
      if (o.status === 'paid' || o.status === 'completed') {
        statsMap[o.tenant_id].revenue += Number(o.total) || 0;
      }
    });
    setStats(statsMap);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleToggleActive = async (tenant: Tenant) => {
    const { error } = await supabase
      .from('tenants')
      .update({ is_active: !tenant.is_active })
      .eq('id', tenant.id);
    if (error) {
      toast.error('Failed to update tenant');
    } else {
      toast.success(`${tenant.brand_name} ${tenant.is_active ? 'deactivated' : 'activated'}`);
      fetchData();
    }
  };

  const handleSave = async () => {
    if (!editTenant) return;
    setSaving(true);
    const { id, created_at, ...updates } = editTenant;
    const { error } = await supabase.from('tenants').update(updates).eq('id', id);
    setSaving(false);
    if (error) {
      toast.error('Failed to save: ' + error.message);
    } else {
      toast.success('Tenant updated');
      setEditTenant(null);
      fetchData();
    }
  };

  const totalOrders = Object.values(stats).reduce((s, v) => s + v.order_count, 0);
  const totalRevenue = Object.values(stats).reduce((s, v) => s + v.revenue, 0);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tenant Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage all tenants, branding, and view aggregated stats.</p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Tenants</CardTitle></CardHeader>
            <CardContent><span className="text-2xl font-bold">{tenants.length}</span></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle></CardHeader>
            <CardContent><span className="text-2xl font-bold">{totalOrders}</span></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle></CardHeader>
            <CardContent><span className="text-2xl font-bold">€{totalRevenue.toFixed(2)}</span></CardContent>
          </Card>
        </div>

        {/* Tenants table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Brand</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                ) : tenants.map((t) => {
                  const s = stats[t.id];
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {t.primary_color && (
                            <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: t.primary_color }} />
                          )}
                          {t.brand_name}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{t.slug}</TableCell>
                      <TableCell>
                        <a href={`https://${t.domain}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 text-sm">
                          {t.domain} <ExternalLink className="h-3 w-3" />
                        </a>
                      </TableCell>
                      <TableCell>{t.country_code?.toUpperCase() || '—'}</TableCell>
                      <TableCell className="text-right">{s?.order_count || 0}</TableCell>
                      <TableCell className="text-right">€{(s?.revenue || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={t.is_active ? 'default' : 'secondary'}>
                          {t.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setEditTenant({ ...t })} title="Edit">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleToggleActive(t)} title={t.is_active ? 'Deactivate' : 'Activate'}>
                            {t.is_active ? <X className="h-4 w-4 text-destructive" /> : <Check className="h-4 w-4 text-green-600" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit dialog */}
        <Dialog open={!!editTenant} onOpenChange={(open) => !open && setEditTenant(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Tenant — {editTenant?.brand_name}</DialogTitle>
            </DialogHeader>
            {editTenant && (
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Brand Name</Label>
                    <Input value={editTenant.brand_name} onChange={(e) => setEditTenant({ ...editTenant, brand_name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Slug</Label>
                    <Input value={editTenant.slug} onChange={(e) => setEditTenant({ ...editTenant, slug: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Domain</Label>
                  <Input value={editTenant.domain} onChange={(e) => setEditTenant({ ...editTenant, domain: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Country Code</Label>
                    <Input value={editTenant.country_code || ''} onChange={(e) => setEditTenant({ ...editTenant, country_code: e.target.value || null })} />
                  </div>
                  <div>
                    <Label>Primary Color</Label>
                    <div className="flex gap-2">
                      <Input value={editTenant.primary_color || ''} onChange={(e) => setEditTenant({ ...editTenant, primary_color: e.target.value || null })} />
                      {editTenant.primary_color && (
                        <div className="w-10 h-10 rounded border flex-shrink-0" style={{ backgroundColor: editTenant.primary_color }} />
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <Label>Logo URL</Label>
                  <Input value={editTenant.logo_url || ''} onChange={(e) => setEditTenant({ ...editTenant, logo_url: e.target.value || null })} />
                </div>
                <div>
                  <Label>Favicon URL</Label>
                  <Input value={editTenant.favicon_url || ''} onChange={(e) => setEditTenant({ ...editTenant, favicon_url: e.target.value || null })} />
                </div>
                <div>
                  <Label>Meta Title</Label>
                  <Input value={editTenant.meta_title || ''} onChange={(e) => setEditTenant({ ...editTenant, meta_title: e.target.value || null })} />
                </div>
                <div>
                  <Label>Meta Description</Label>
                  <Input value={editTenant.meta_description || ''} onChange={(e) => setEditTenant({ ...editTenant, meta_description: e.target.value || null })} />
                </div>
                <div>
                  <Label>Footer Disclaimer</Label>
                  <Input value={editTenant.footer_disclaimer || ''} onChange={(e) => setEditTenant({ ...editTenant, footer_disclaimer: e.target.value || null })} />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={!!editTenant.is_active} onCheckedChange={(v) => setEditTenant({ ...editTenant, is_active: v })} />
                  <Label>Active</Label>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setEditTenant(null)}>Cancel</Button>
                  <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
