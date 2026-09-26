import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/lib/tenant';
import type { Product } from '../../types/database';
import {
  runPricingAudit,
  FINDING_LABELS,
  type Finding,
  type FindingKind,
  type AuditOrder,
} from '../../lib/pricingAudit';

const KIND_ORDER: FindingKind[] = [
  'service_fee',
  'vat_flags',
  'surface_parity',
  'hardcoded_price',
  'order_integrity',
];

export default function AdminPricingHealthPage() {
  const { tenant } = useTenant();
  const [findings, setFindings] = useState<Finding[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [counts, setCounts] = useState({ products: 0, orders: 0 });

  const run = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: products }, { data: orders }] = await Promise.all([
        supabase.from('products').select('*'),
        supabase
          .from('orders')
          .select('id, order_ref, subtotal, vat_amount, total, discount_amount, order_items(unit_price, vat_amount, screening_price_eur)')
          .order('created_at', { ascending: false })
          .limit(200),
      ]);

      const auditOrders: AuditOrder[] = (orders ?? []).map((o: any) => ({
        id: o.id,
        order_ref: o.order_ref,
        subtotal: Number(o.subtotal),
        vat_amount: Number(o.vat_amount ?? 0),
        total: Number(o.total),
        discount_amount: Number(o.discount_amount ?? 0),
        items: (o.order_items ?? []).map((i: any) => ({
          unit_price: Number(i.unit_price),
          vat_amount: Number(i.vat_amount ?? 0),
          screening_price_eur: Number(i.screening_price_eur ?? 0),
        })),
      }));

      setCounts({ products: products?.length ?? 0, orders: auditOrders.length });
      setFindings(
        runPricingAudit({
          products: (products ?? []) as unknown as Product[],
          tenantSlug: tenant?.slug ?? 'cy',
          orders: auditOrders,
        }),
      );
      setCheckedAt(new Date());
    } finally {
      setLoading(false);
    }
  }, [tenant?.slug]);

  useEffect(() => {
    run();
  }, [run]);

  const errors = findings?.filter((f) => f.severity === 'error') ?? [];
  const warnings = findings?.filter((f) => f.severity === 'warning') ?? [];

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>Pricing Health</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Checks report prices, service fees and order totals across listings, cart, checkout and confirmations.
          </p>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border disabled:opacity-60"
          style={{ borderColor: 'var(--border-default)', color: 'var(--text-body)' }}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Re-run checks
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <SummaryCard tone="error" value={errors.length} label="Problems to fix" />
        <SummaryCard tone="warning" value={warnings.length} label="Worth a look" />
        <SummaryCard
          tone="neutral"
          value={counts.products}
          label={`Products checked · ${counts.orders} recent orders`}
        />
      </div>

      {findings && findings.length === 0 && (
        <div className="rounded-xl border p-8 text-center bg-green-50" style={{ borderColor: '#bbf7d0' }}>
          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-600" />
          <p className="font-semibold text-green-800">Everything matches</p>
          <p className="text-sm text-green-700">No price or fee mismatches found.</p>
        </div>
      )}

      {KIND_ORDER.map((kind) => {
        const group = (findings ?? []).filter((f) => f.kind === kind);
        if (!group.length) return null;
        return (
          <section key={kind} className="mb-6">
            <h2 className="font-semibold mb-2" style={{ color: 'var(--text-heading)' }}>
              {FINDING_LABELS[kind]} <span style={{ color: 'var(--text-muted)' }}>({group.length})</span>
            </h2>
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-default)' }}>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr style={{ color: 'var(--text-muted)' }}>
                    <th className="text-left font-medium px-4 py-2">What</th>
                    <th className="text-left font-medium px-4 py-2">Where</th>
                    <th className="text-left font-medium px-4 py-2">Expected</th>
                    <th className="text-left font-medium px-4 py-2">Found</th>
                    <th className="text-left font-medium px-4 py-2">Why it matters</th>
                  </tr>
                </thead>
                <tbody>
                  {group.map((f, i) => (
                    <tr key={i} className="border-t" style={{ borderColor: 'var(--border-default)' }}>
                      <td className="px-4 py-2">
                        <span className="inline-flex items-center gap-2" style={{ color: 'var(--text-body)' }}>
                          {f.severity === 'error' ? (
                            <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          )}
                          {f.subject}
                        </span>
                      </td>
                      <td className="px-4 py-2" style={{ color: 'var(--text-muted)' }}>
                        {f.link ? (
                          <Link to={f.link} className="underline">{f.where}</Link>
                        ) : (
                          f.where
                        )}
                      </td>
                      <td className="px-4 py-2" style={{ color: 'var(--text-body)' }}>{f.expected}</td>
                      <td className="px-4 py-2 font-medium text-red-700">{f.actual}</td>
                      <td className="px-4 py-2" style={{ color: 'var(--text-muted)' }}>{f.hint}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      {checkedAt && (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Last checked {checkedAt.toLocaleString()}
        </p>
      )}
    </AdminLayout>
  );
}

function SummaryCard({ tone, value, label }: { tone: 'error' | 'warning' | 'neutral'; value: number; label: string }) {
  const color = tone === 'error' ? 'text-red-700' : tone === 'warning' ? 'text-amber-700' : 'text-slate-700';
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-default)' }}>
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
}
