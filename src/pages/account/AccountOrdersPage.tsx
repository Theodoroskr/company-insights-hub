import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Search, SlidersHorizontal, ChevronUp, ChevronDown } from 'lucide-react';
import AccountLayout from '../../components/layout/AccountLayout';
import EmptyState from '../../components/ui/EmptyState';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../lib/tenant';

interface OrderRow {
  id: string;
  order_ref: string | null;
  created_at: string | null;
  status: string | null;
  notes: string | null;
  total: number;
  items: {
    id: string;
    fulfillment_status: string | null;
    sla_deadline: string | null;
    product: { name: string; delivery_sla_hours: number | null } | null;
    company: { name: string; slug: string | null; reg_no: string | null } | null;
  }[];
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  pending:    { bg: '#F1F5F9', color: '#64748B', label: 'Pending' },
  processing: { bg: '#DBEAFE', color: '#1D4ED8', label: 'Processing' },
  completed:  { bg: '#DCFCE7', color: '#16A34A', label: 'Completed' },
  cancelled:  { bg: '#FEE2E2', color: '#DC2626', label: 'Cancelled' },
  failed:     { bg: '#FEE2E2', color: '#7F1D1D', label: 'Failed' },
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatSla(hours: number | null) {
  if (!hours) return '—';
  if (hours < 24) return `${hours} hours`;
  const days = Math.ceil(hours / 24);
  return `1-${days} days`;
}

export default function AccountOrdersPage() {
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data } = await supabase
        .from('orders')
        .select(`
          id, order_ref, created_at, status, notes, total,
          order_items (
            id, fulfillment_status, sla_deadline,
            products ( name, delivery_sla_hours ),
            companies ( name, slug, reg_no )
          )
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      const rows: OrderRow[] = (data ?? []).map((o: any) => ({
        id: o.id,
        order_ref: o.order_ref,
        created_at: o.created_at,
        status: o.status,
        notes: o.notes,
        total: o.total,
        items: (o.order_items ?? []).map((i: any) => ({
          id: i.id,
          fulfillment_status: i.fulfillment_status,
          sla_deadline: i.sla_deadline,
          product: i.products ?? null,
          company: i.companies ?? null,
        })),
      }));
      setOrders(rows);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return orders.filter((o) => {
      if (!q) return true;
      const companyName = o.items[0]?.company?.name?.toLowerCase() ?? '';
      const ref = (o.order_ref ?? '').toLowerCase();
      return companyName.includes(q) || ref.includes(q);
    });
  }, [orders, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const refA = a.order_ref ?? '';
      const refB = b.order_ref ?? '';
      return sortDir === 'desc' ? refB.localeCompare(refA) : refA.localeCompare(refB);
    });
  }, [filtered, sortDir]);

  return (
    <AccountLayout>
      <Helmet>
        <title>Orders — {tenant?.brand_name ?? 'My Account'}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <h1 className="text-2xl font-semibold mb-6" style={{ color: 'var(--text-heading)' }}>
        Orders
      </h1>

      {/* Filters row */}
      <div className="flex items-center justify-end gap-2 mb-4">
        <button
          type="button"
          className="p-2 border rounded text-sm transition-colors hover:bg-gray-50"
          style={{ borderColor: 'var(--bg-border)', color: 'var(--text-body)' }}
          aria-label="Filters"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Enter a Company name"
            className="h-9 pl-3 pr-8 rounded-md border text-sm focus:outline-none focus:ring-2 w-56"
            style={{ borderColor: 'var(--bg-border)', color: 'var(--text-body)' }}
          />
          <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--brand-accent)', borderTopColor: 'transparent' }} />
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState message="No Data" />
      ) : (
        <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--bg-border)' }}>
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--bg-border)' }}>
                {[
                  { label: 'Companies', key: null },
                  { label: 'Date of Order', key: null },
                  { label: 'Order Number', key: 'ref' },
                  { label: 'Report Title', key: null },
                  { label: 'Delivery time', key: null },
                  { label: 'Status', key: null },
                  { label: 'Comments', key: null },
                ].map(({ label, key }) => (
                  <th
                    key={label}
                    className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {key === 'ref' ? (
                      <button
                        type="button"
                        className="flex items-center gap-1 uppercase tracking-wide"
                        onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
                      >
                        {label}
                        {sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                      </button>
                    ) : label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((order) => {
                const firstItem = order.items[0];
                const company = firstItem?.company;
                const product = firstItem?.product;
                const statusStyle = STATUS_STYLES[order.status ?? 'pending'] ?? STATUS_STYLES.pending;
                return (
                  <tr
                    key={order.id}
                    className="cursor-pointer transition-colors"
                    style={{ borderBottom: '1px solid var(--bg-border)' }}
                    onClick={() => navigate(`/account/orders/${order.id}`)}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td className="px-4 py-3">
                      {company ? (
                        <Link
                          to={`/company/${company.slug ?? company.name}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-medium hover:underline"
                          style={{ color: 'var(--brand-accent)' }}
                        >
                          {company.name}
                        </Link>
                      ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-body)' }}>
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-body)' }}>
                      {order.order_ref ?? '—'}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-body)' }}>
                      {product?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                      {formatSla(product?.delivery_sla_hours ?? null)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
                      >
                        {statusStyle.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs max-w-[160px] truncate" style={{ color: 'var(--text-muted)' }}>
                      {order.notes ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AccountLayout>
  );
}
