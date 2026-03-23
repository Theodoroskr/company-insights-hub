import React, { useEffect, useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { FileDown, ChevronUp, ChevronDown } from 'lucide-react';
import AccountLayout from '../../components/layout/AccountLayout';
import EmptyState from '../../components/ui/EmptyState';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../lib/tenant';

interface InvoiceRow {
  id: string;
  order_ref: string | null;
  created_at: string | null;
  total: number;
  speed: string | null;
  product_name: string | null;
  has_report: boolean;
  item_id: string;
  report_token: string | null;
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function AccountInvoicesPage() {
  const { tenant } = useTenant();
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data } = await supabase
        .from('orders')
        .select(`
          id, order_ref, created_at, total,
          order_items (
            id, speed,
            products ( name ),
            generated_reports ( download_token )
          )
        `)
        .eq('user_id', session.user.id)
        .in('status', ['completed', 'paid'])
        .order('created_at', { ascending: true });

      const rows: InvoiceRow[] = [];
      for (const o of data ?? []) {
        const ord = o as any;
        for (const item of ord.order_items ?? []) {
          rows.push({
            id: ord.id,
            item_id: item.id,
            order_ref: ord.order_ref,
            created_at: ord.created_at,
            total: ord.total,
            speed: item.speed ?? null,
            product_name: item.products?.name ?? null,
            has_report: (item.generated_reports?.length ?? 0) > 0,
            report_token: item.generated_reports?.[0]?.download_token ?? null,
          });
        }
      }
      setInvoices(rows);
      setLoading(false);
    }
    load();
  }, []);

  const sorted = useMemo(() => {
    return [...invoices].sort((a, b) => {
      const refA = a.order_ref ?? '';
      const refB = b.order_ref ?? '';
      return sortDir === 'asc' ? refA.localeCompare(refB) : refB.localeCompare(refA);
    });
  }, [invoices, sortDir]);

  return (
    <AccountLayout>
      <Helmet>
        <title>Invoices — {tenant?.brand_name ?? 'My Account'}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <h1 className="text-2xl font-semibold mb-6" style={{ color: 'var(--text-heading)' }}>
        Orders
      </h1>

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
                  { label: 'Invoice Date', key: null },
                  { label: 'Price', key: null },
                  { label: 'Invoice Number', key: 'ref' },
                  { label: 'Report Name', key: null },
                  { label: 'Delivery Speed', key: null },
                  { label: '', key: null },
                ].map(({ label, key }, i) => (
                  <th
                    key={`${label}-${i}`}
                    className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {key === 'ref' ? (
                      <button
                        type="button"
                        className="flex items-center gap-1 uppercase tracking-wide"
                        onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                      >
                        {label}
                        {sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    ) : label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((inv) => (
                <tr
                  key={inv.item_id}
                  style={{ borderBottom: '1px solid var(--bg-border)' }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td className="px-4 py-3" style={{ color: 'var(--text-body)' }}>
                    {formatDate(inv.created_at)}
                  </td>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-heading)' }}>
                    €{inv.total.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-body)' }}>
                    {inv.order_ref ?? '—'}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-body)' }}>
                    {inv.product_name ?? '—'}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                    {inv.speed ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {inv.has_report && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border rounded transition-all hover:bg-gray-50 active:scale-95"
                        style={{ borderColor: 'var(--bg-border)', color: 'var(--text-body)' }}
                        title="Download invoice"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        Download
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AccountLayout>
  );
}
