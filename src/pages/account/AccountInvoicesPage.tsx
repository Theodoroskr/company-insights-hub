import React, { useEffect, useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { FileDown, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import AccountLayout from '../../components/layout/AccountLayout';
import EmptyState from '../../components/ui/EmptyState';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../lib/tenant';
import { downloadInvoicePdf, type InvoiceData } from '../../lib/invoicePdf';

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

interface OrderInvoice {
  id: string;
  order_ref: string | null;
  created_at: string | null;
  subtotal: number;
  vat_amount: number;
  total: number;
  payment_method: string | null;
  items: { product_name: string; speed: string | null; unit_price: number; vat_amount: number; screening_addon: boolean; screening_price_eur: number }[];
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function AccountInvoicesPage() {
  const { tenant } = useTenant();
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [orderMap, setOrderMap] = useState<Record<string, OrderInvoice>>({});
  const [buyer, setBuyer] = useState<InvoiceData['buyer']>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const [{ data: profileData }] = await Promise.all([
        supabase.from('profiles').select('full_name, email, vat_no, company_details').eq('id', session.user.id).maybeSingle(),
      ]);
      if (profileData) {
        const cd = ((profileData as any).company_details ?? {}) as {
          name?: string; reg?: string; vat?: string;
          billing_address?: { street?: string; city?: string; state?: string; postcode?: string };
        };
        setBuyer({
          name: (profileData as any).full_name,
          email: (profileData as any).email ?? session.user.email,
          company: cd.name ?? null,
          reg: cd.reg ?? null,
          vat: (profileData as any).vat_no ?? cd.vat ?? null,
          address: cd.billing_address ?? null,
        });
      }

      const { data } = await supabase
        .from('orders')
        .select(`
          id, order_ref, created_at, subtotal, vat_amount, total, payment_method,
          order_items (
            id, speed, unit_price, vat_amount, screening_addon, screening_price_eur,
            products ( name ),
            generated_reports ( download_token )
          )
        `)
        .eq('user_id', session.user.id)
        .in('status', ['completed', 'paid'])
        .order('created_at', { ascending: true });

      const rows: InvoiceRow[] = [];
      const orders: Record<string, OrderInvoice> = {};
      for (const o of data ?? []) {
        const ord = o as any;
        orders[ord.id] = {
          id: ord.id,
          order_ref: ord.order_ref,
          created_at: ord.created_at,
          subtotal: Number(ord.subtotal ?? 0),
          vat_amount: Number(ord.vat_amount ?? 0),
          total: Number(ord.total ?? 0),
          payment_method: ord.payment_method,
          items: (ord.order_items ?? []).map((item: any) => ({
            product_name: item.products?.name ?? 'Report',
            speed: item.speed ?? null,
            unit_price: Number(item.unit_price ?? 0),
            vat_amount: Number(item.vat_amount ?? 0),
            screening_addon: !!item.screening_addon,
            screening_price_eur: Number(item.screening_price_eur ?? 0),
          })),
        };
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
      setOrderMap(orders);
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

  // One download button per order — shown on the order's first row.
  const firstRowByOrder = useMemo(() => {
    const seen = new Set<string>();
    const map: Record<string, boolean> = {};
    for (const r of sorted) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        map[r.item_id] = true;
      }
    }
    return map;
  }, [sorted]);

  const handleDownload = async (row: InvoiceRow) => {
    const order = orderMap[row.id];
    if (!order) return;
    setBusyId(row.item_id);
    try {
      downloadInvoicePdf({
        brandName: tenant?.brand_name ?? 'Infocredit Group',
        orderRef: order.order_ref ?? order.id,
        date: order.created_at ? new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—',
        paymentMethod: order.payment_method,
        subtotal: order.subtotal,
        vat: order.vat_amount,
        total: order.total,
        buyer,
        items: order.items.map((it) => ({
          name: it.product_name,
          speed: it.speed,
          unitPrice: Number(it.unit_price ?? 0),
          vat: Number(it.vat_amount ?? 0),
          screening: !!it.screening_addon,
          screeningPrice: Number(it.screening_price_eur ?? 0),
        })),
      });
    } finally {
      setBusyId(null);
    }
  };

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
                    {firstRowByOrder[inv.item_id] && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border rounded transition-all hover:bg-gray-50 active:scale-95 disabled:opacity-60"
                        style={{ borderColor: 'var(--bg-border)', color: 'var(--text-body)' }}
                        title="Download invoice (PDF)"
                        disabled={busyId === inv.item_id}
                        onClick={() => handleDownload(inv)}
                      >
                        {busyId === inv.item_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
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
