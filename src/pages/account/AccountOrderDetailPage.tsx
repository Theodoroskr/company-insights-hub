import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Download, ShieldCheck } from 'lucide-react';
import AccountLayout from '../../components/layout/AccountLayout';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../lib/tenant';

interface OrderDetail {
  id: string;
  order_ref: string | null;
  created_at: string | null;
  status: string | null;
  total: number;
  guest_email: string | null;
  items: {
    id: string;
    fulfillment_status: string | null;
    unit_price: number;
    vat_amount: number | null;
    sla_deadline: string | null;
    verified_at: string | null;
    product: { name: string; delivery_sla_hours: number | null } | null;
    company: { name: string; reg_no: string | null; slug: string | null } | null;
    report: { download_token: string | null; download_expires_at: string | null; pdf_storage_path: string | null } | null;
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
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function AccountOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { tenant } = useTenant();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function load() {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, order_ref, created_at, status, total, guest_email,
          order_items (
            id, fulfillment_status, unit_price, vat_amount, sla_deadline, verified_at,
            products ( name, delivery_sla_hours ),
            companies ( name, reg_no, slug ),
            generated_reports ( download_token, download_expires_at, pdf_storage_path )
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
      } else {
        const o = data as any;
        setOrder({
          id: o.id,
          order_ref: o.order_ref,
          created_at: o.created_at,
          status: o.status,
          total: o.total,
          guest_email: o.guest_email,
          items: (o.order_items ?? []).map((i: any) => ({
            id: i.id,
            fulfillment_status: i.fulfillment_status,
            unit_price: i.unit_price,
            vat_amount: i.vat_amount,
            sla_deadline: i.sla_deadline,
            verified_at: i.verified_at ?? null,
            product: i.products ?? null,
            company: i.companies ?? null,
            report: i.generated_reports?.[0] ?? null,
          })),
        });
      }
      setLoading(false);
    }
    load();
  }, [id]);

  return (
    <AccountLayout>
      <Helmet>
        <title>Order Detail — {tenant?.brand_name ?? 'My Account'}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <Link
        to="/account/orders"
        className="inline-flex items-center gap-2 text-sm mb-6 hover:underline"
        style={{ color: 'var(--brand-accent)' }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Orders
      </Link>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--brand-accent)', borderTopColor: 'transparent' }} />
        </div>
      ) : notFound ? (
        <div className="py-16 text-center">
          <p style={{ color: 'var(--text-muted)' }}>Order not found.</p>
        </div>
      ) : order ? (
        <>
          {/* Order header */}
          <div
            className="bg-white border rounded-lg p-6 mb-4"
            style={{ borderColor: 'var(--bg-border)' }}
          >
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-xl font-semibold" style={{ color: 'var(--text-heading)' }}>
                  Order {order.order_ref ?? '—'}
                </h1>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                  Placed on {formatDate(order.created_at)}
                </p>
              </div>
              {order.status && (
                <span
                  className="px-3 py-1.5 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: STATUS_STYLES[order.status]?.bg ?? '#F1F5F9',
                    color: STATUS_STYLES[order.status]?.color ?? '#64748B',
                  }}
                >
                  {STATUS_STYLES[order.status]?.label ?? order.status}
                </span>
              )}
            </div>
            <div className="mt-4 pt-4 border-t flex flex-wrap gap-6" style={{ borderColor: 'var(--bg-border)' }}>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-muted)' }}>Total</p>
                <p className="font-semibold" style={{ color: 'var(--text-heading)' }}>€{order.total.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-3">
            {order.items.map((item) => {
              const isComplete = ['completed', 'delivered', 'fulfilled'].includes(item.fulfillment_status ?? '');
              return (
                <div
                  key={item.id}
                  className="bg-white border rounded-lg p-5"
                  style={{ borderColor: 'var(--bg-border)' }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {item.company && (
                        <p className="font-semibold" style={{ color: 'var(--text-heading)' }}>
                          {item.company.name}
                          {item.company.reg_no && (
                            <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
                              Reg: {item.company.reg_no}
                            </span>
                          )}
                        </p>
                      )}
                      <p className="text-sm mt-0.5" style={{ color: 'var(--text-body)' }}>
                        {item.product?.name ?? 'Report'}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        €{item.unit_price.toFixed(2)}
                        {item.vat_amount ? ` + €${item.vat_amount.toFixed(2)} VAT` : ''}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {item.fulfillment_status && (
                        <span
                          className="px-2 py-1 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: STATUS_STYLES[item.fulfillment_status]?.bg ?? '#F1F5F9',
                            color: STATUS_STYLES[item.fulfillment_status]?.color ?? '#64748B',
                          }}
                        >
                          {STATUS_STYLES[item.fulfillment_status]?.label ?? item.fulfillment_status}
                        </span>
                      )}
                    </div>
                  </div>

                  {isComplete && item.report && (
                    <div
                      className="mt-4 pt-4 border-t flex items-center justify-between gap-4 flex-wrap"
                      style={{ borderColor: 'var(--bg-border)' }}
                    >
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Link expires: {item.report.download_expires_at ? formatDate(item.report.download_expires_at) : '30 days from delivery'}
                        </p>
                        {item.verified_at && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Verified Document
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded transition-all active:scale-95"
                        style={{ backgroundColor: 'var(--brand-accent)' }}
                        onClick={() => {
                          if (!item.report?.download_token) return;
                          const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/download-report?token=${encodeURIComponent(item.report.download_token)}`;
                          window.open(url, '_blank', 'noopener,noreferrer');
                        }}
                      >
                        <Download className="w-4 h-4" />
                        Download Report
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </AccountLayout>
  );
}
