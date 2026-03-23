import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, RefreshCw, Clock } from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInHours, differenceInMinutes } from 'date-fns';

interface Order {
  id: string;
  order_ref: string;
  status: string;
  total: number;
  subtotal: number;
  vat_amount: number;
  created_at: string;
  guest_email: string | null;
  tenant_id: string | null;
  items: OrderItem[];
}

interface OrderItem {
  id: string;
  fulfillment_status: string;
  sla_deadline: string | null;
  company_name: string | null;
  product_name: string | null;
}

const STATUS_OPTS = ['all', 'pending', 'paid', 'completed', 'failed', 'refunded'];

function SlaChip({ deadline }: { deadline: string | null }) {
  if (!deadline) return <span className="text-muted-foreground text-xs">—</span>;
  const now = new Date();
  const dl = new Date(deadline);
  const hoursLeft = differenceInHours(dl, now);
  const minutesLeft = differenceInMinutes(dl, now);

  if (minutesLeft < 0) {
    return <span className="text-xs font-medium text-red-600">Overdue {format(dl, 'MMM d HH:mm')}</span>;
  }
  if (hoursLeft < 4) {
    return <span className="text-xs font-medium text-amber-600">{hoursLeft}h {minutesLeft % 60}m left</span>;
  }
  return <span className="text-xs text-green-700">{hoursLeft}h left</span>;
}

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-700',
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('orders')
      .select(`
        id, order_ref, status, total, subtotal, vat_amount, created_at, guest_email, tenant_id,
        order_items (
          id, fulfillment_status, sla_deadline,
          companies ( name ),
          products ( name )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(200);

    if (statusFilter !== 'all') q = q.eq('status', statusFilter);

    const { data } = await q;
    setOrders(
      (data ?? []).map((o: any) => ({
        ...o,
        total: Number(o.total),
        items: (o.order_items ?? []).map((i: any) => ({
          id: i.id,
          fulfillment_status: i.fulfillment_status,
          sla_deadline: i.sla_deadline,
          company_name: i.companies?.name ?? null,
          product_name: i.products?.name ?? null,
        })),
      }))
    );
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const filtered = orders.filter(o => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (o.order_ref ?? '').toLowerCase().includes(s) ||
      (o.guest_email ?? '').toLowerCase().includes(s) ||
      o.items.some(i => (i.company_name ?? '').toLowerCase().includes(s))
    );
  });

  const minSla = (items: OrderItem[]) => {
    const deadlines = items.map(i => i.sla_deadline).filter(Boolean) as string[];
    if (!deadlines.length) return null;
    return deadlines.reduce((a, b) => (new Date(a) < new Date(b) ? a : b));
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>Orders</h1>
          <button onClick={fetchOrders} className="flex items-center gap-2 text-sm px-3 py-1.5 border rounded-lg hover:bg-muted transition-colors">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search ref, email, company…"
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background"
          >
            {STATUS_OPTS.map(s => <option key={s} value={s}>{s === 'all' ? 'All statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {['Date', 'Ref', 'Customer', 'Company / Product', 'Status', 'Total', 'SLA', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No orders found</td></tr>
                ) : (
                  filtered.map(order => (
                    <tr key={order.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{format(new Date(order.created_at), 'MMM d, HH:mm')}</td>
                      <td className="px-4 py-3 font-medium whitespace-nowrap">
                        <Link to={`/admin/orders/${order.id}`} className="hover:underline" style={{ color: 'var(--brand-accent)' }}>
                          #{order.order_ref}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-32 truncate">{order.guest_email ?? '—'}</td>
                      <td className="px-4 py-3">
                        {order.items.length > 0 ? (
                          <div>
                            <div className="font-medium truncate max-w-40">{order.items[0].company_name ?? '—'}</div>
                            <div className="text-xs text-muted-foreground truncate">{order.items[0].product_name ?? '—'}</div>
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor[order.status] ?? 'bg-gray-100 text-gray-700'}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold tabular-nums">€{order.total.toFixed(2)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <SlaChip deadline={minSla(order.items)} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link to={`/admin/orders/${order.id}`} className="text-xs px-2 py-1 border rounded hover:bg-muted transition-colors">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t text-xs text-muted-foreground">
            Showing {filtered.length} of {orders.length} orders
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
