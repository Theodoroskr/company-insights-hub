import React, { useEffect, useState, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

interface Customer {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  created_at: string | null;
  order_count?: number;
  total_spend?: number;
}

interface CustomerOrder {
  id: string;
  order_ref: string;
  status: string;
  total: number;
  created_at: string;
}

const ROLE_OPTIONS = ['user', 'admin', 'super_admin'];
const roleColor: Record<string, string> = {
  user: 'bg-gray-100 text-gray-700',
  admin: 'bg-blue-100 text-blue-800',
  super_admin: 'bg-purple-100 text-purple-800',
};

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Customer | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<CustomerOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string>('admin');
  const [updatingRole, setUpdatingRole] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user?.id) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.session.user.id).maybeSingle();
        setCurrentUserRole(profile?.role ?? 'admin');
      }
    });
  }, []);

  const fetchCustomers = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(500);
    setCustomers((data ?? []) as Customer[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const openPanel = async (customer: Customer) => {
    setSelected(customer);
    setLoadingOrders(true);
    const { data } = await supabase
      .from('orders')
      .select('id, order_ref, status, total, created_at')
      .eq('user_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setSelectedOrders((data ?? []).map((o: any) => ({ ...o, total: Number(o.total) })));
    setLoadingOrders(false);
  };

  const updateRole = async (newRole: string) => {
    if (!selected) return;
    setUpdatingRole(true);
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', selected.id);
    setUpdatingRole(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setSelected(prev => prev ? { ...prev, role: newRole } : prev);
      setCustomers(prev => prev.map(c => c.id === selected.id ? { ...c, role: newRole } : c));
      toast({ title: `Role updated to ${newRole}` });
    }
  };

  const filtered = customers.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (c.full_name ?? '').toLowerCase().includes(s) || (c.email ?? '').toLowerCase().includes(s);
  });

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>Customers</h1>
          <span className="text-sm text-muted-foreground">{customers.length} total</span>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {['Name', 'Email', 'Joined', 'Role'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">No customers found</td></tr>
                ) : (
                  filtered.map(c => (
                    <tr
                      key={c.id}
                      onClick={() => openPanel(c)}
                      className="border-b last:border-0 hover:bg-muted/20 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 font-medium">{c.full_name || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.email || '—'}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{c.created_at ? format(new Date(c.created_at), 'MMM d, yyyy') : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${roleColor[c.role ?? 'user'] ?? 'bg-gray-100 text-gray-700'}`}>
                          {c.role ?? 'user'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Side panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="flex-1 bg-black/30" onClick={() => setSelected(null)} />
          <div className="w-full max-w-md bg-background shadow-2xl overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-background z-10">
              <h2 className="font-semibold text-lg" style={{ color: 'var(--text-heading)' }}>
                {selected.full_name || selected.email || 'Customer'}
              </h2>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 px-6 py-5 space-y-6">
              {/* Profile */}
              <div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Profile</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-muted-foreground">Email</dt><dd>{selected.email ?? '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Phone</dt><dd>{selected.phone ?? '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Joined</dt><dd>{selected.created_at ? format(new Date(selected.created_at), 'MMM d, yyyy') : '—'}</dd></div>
                  <div className="flex justify-between items-center">
                    <dt className="text-muted-foreground">Role</dt>
                    <dd>
                      {currentUserRole === 'super_admin' ? (
                        <select
                          value={selected.role ?? 'user'}
                          onChange={e => updateRole(e.target.value)}
                          disabled={updatingRole}
                          className="border rounded px-2 py-0.5 text-xs bg-background focus:outline-none"
                        >
                          {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      ) : (
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${roleColor[selected.role ?? 'user']}`}>
                          {selected.role ?? 'user'}
                        </span>
                      )}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Order history */}
              <div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Order History</h3>
                {loadingOrders ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : selectedOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No orders</p>
                ) : (
                  <div className="space-y-2">
                    {selectedOrders.map(o => (
                      <div key={o.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                        <div>
                          <div className="font-medium">#{o.order_ref}</div>
                          <div className="text-xs text-muted-foreground">{format(new Date(o.created_at), 'MMM d, yyyy')}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor[o.status] ?? 'bg-gray-100 text-gray-700'}`}>
                            {o.status}
                          </span>
                          <span className="font-semibold tabular-nums">€{o.total.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};
