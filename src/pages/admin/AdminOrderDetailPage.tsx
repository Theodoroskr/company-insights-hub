import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, RefreshCw, ChevronDown, ChevronRight, ShieldCheck, Link2 } from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

interface OrderDetail {
  id: string;
  order_ref: string;
  status: string;
  total: number;
  subtotal: number;
  vat_amount: number;
  discount_amount: number;
  currency: string;
  created_at: string;
  guest_email: string | null;
  notes: string | null;
  guest_details: any;
  stripe_payment_intent_id: string | null;
  items: ItemDetail[];
}

interface ItemDetail {
  id: string;
  unit_price: number;
  vat_amount: number;
  speed: string;
  fulfillment_status: string;
  sla_deadline: string | null;
  api4all_order_id: string | null;
  api4all_item_code: string | null;
  assigned_to: string | null;
  company_name: string | null;
  product_name: string | null;
  raw_json: any;
  verified_at: string | null;
  verified_by: string | null;
  verification_note: string | null;
}

const STATUS_OPTIONS = ['pending', 'paid', 'processing', 'completed', 'failed', 'refunded', 'cancelled'];
const FULFILLMENT_OPTIONS = ['pending', 'submitted', 'processing', 'completed', 'failed'];

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-700',
};

function JsonViewer({ data }: { data: any }) {
  const [open, setOpen] = useState(false);
  if (!data) return <span className="text-xs text-muted-foreground">No data</span>;
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        Raw API Response
      </button>
      {open && (
        <pre className="mt-2 p-3 bg-muted/50 rounded text-xs overflow-auto max-h-48 text-foreground font-mono">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [statusOverride, setStatusOverride] = useState('');
  const [refundModal, setRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [reconciling, setReconciling] = useState(false);

  const reconcileWithApi4All = async () => {
    if (!id) return;
    setReconciling(true);
    try {
      const { data, error } = await supabase.functions.invoke('reconcile-api4all-order', {
        body: { order_id: id },
      });
      if (error) throw error;
      if (data?.matched) {
        toast({
          title: 'Reconciled with API4ALL',
          description: `Linked ${data.linked_count} item(s) to API4ALL order ${data.api4all_order_id}.`,
        });
        await fetchOrder();
      } else {
        toast({
          title: 'No match found',
          description: data?.reason ?? 'API4ALL has no order with this reference.',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Reconciliation failed',
        description: err?.message ?? 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setReconciling(false);
    }
  };

  const fetchOrder = async () => {
    if (!id) return;
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select(`
        id, order_ref, status, total, subtotal, vat_amount, discount_amount, currency,
        created_at, guest_email, notes, guest_details, stripe_payment_intent_id,
        order_items (
          id, unit_price, vat_amount, speed, fulfillment_status, sla_deadline,
          api4all_order_id, api4all_item_code, assigned_to,
          verified_at, verified_by, verification_note,
          companies ( name ),
          products ( name ),
          generated_reports ( api4all_raw_json )
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (data) {
      const o = data as any;
      setOrder({
        ...o,
        total: Number(o.total),
        subtotal: Number(o.subtotal),
        vat_amount: Number(o.vat_amount),
        discount_amount: Number(o.discount_amount ?? 0),
        items: (o.order_items ?? []).map((i: any) => ({
          id: i.id,
          unit_price: Number(i.unit_price),
          vat_amount: Number(i.vat_amount ?? 0),
          speed: i.speed,
          fulfillment_status: i.fulfillment_status,
          sla_deadline: i.sla_deadline,
          api4all_order_id: i.api4all_order_id,
          api4all_item_code: i.api4all_item_code,
          assigned_to: i.assigned_to,
          company_name: i.companies?.name ?? null,
          product_name: i.products?.name ?? null,
          raw_json: i.generated_reports?.[0]?.api4all_raw_json ?? null,
          verified_at: i.verified_at ?? null,
          verified_by: i.verified_by ?? null,
          verification_note: i.verification_note ?? null,
        })),
      });
      setNotes(o.notes ?? '');
      setStatusOverride(o.status);
    }
    setLoading(false);
  };

  useEffect(() => { fetchOrder(); }, [id]);

  const saveNotes = async () => {
    if (!id) return;
    setSavingNotes(true);
    const { error } = await supabase.from('orders').update({ notes }).eq('id', id);
    setSavingNotes(false);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else toast({ title: 'Notes saved' });
  };

  const updateOrderStatus = async (s: string) => {
    if (!id) return;
    await supabase.from('orders').update({ status: s }).eq('id', id);
    setStatusOverride(s);
    setOrder(prev => prev ? { ...prev, status: s } : prev);
    toast({ title: `Status updated to ${s}` });
  };

  const updateItemStatus = async (itemId: string, status: string) => {
    await supabase.from('order_items').update({ fulfillment_status: status }).eq('id', itemId);
    setOrder(prev => prev ? {
      ...prev,
      items: prev.items.map(i => i.id === itemId ? { ...i, fulfillment_status: status } : i),
    } : prev);
    toast({ title: `Item status updated to ${status}` });
  };

  const verifyItem = async (itemId: string) => {
    const note = prompt('Optional verification note:');
    const { data: userData } = await supabase.auth.getUser();
    const verifierEmail = userData?.user?.email ?? 'admin';
    const now = new Date().toISOString();
    await supabase.from('order_items').update({
      verified_at: now,
      verified_by: verifierEmail,
      verification_note: note || null,
    } as any).eq('id', itemId);
    setOrder(prev => prev ? {
      ...prev,
      items: prev.items.map(i => i.id === itemId ? { ...i, verified_at: now, verified_by: verifierEmail, verification_note: note || null } : i),
    } : prev);
    toast({ title: 'Certificate marked as verified' });
  };

  const unverifyItem = async (itemId: string) => {
    await supabase.from('order_items').update({
      verified_at: null,
      verified_by: null,
      verification_note: null,
    } as any).eq('id', itemId);
    setOrder(prev => prev ? {
      ...prev,
      items: prev.items.map(i => i.id === itemId ? { ...i, verified_at: null, verified_by: null, verification_note: null } : i),
    } : prev);
    toast({ title: 'Verification removed' });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6 text-muted-foreground">Loading order…</div>
      </AdminLayout>
    );
  }

  if (!order) {
    return (
      <AdminLayout>
        <div className="p-6">
          <p className="text-muted-foreground">Order not found.</p>
          <Link to="/admin/orders" className="text-sm mt-2 inline-flex items-center gap-1 hover:underline" style={{ color: 'var(--brand-accent)' }}>
            <ChevronLeft className="h-3.5 w-3.5" /> Back to orders
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 flex-wrap">
          <Link to="/admin/orders" className="text-sm flex items-center gap-1 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-3.5 w-3.5" /> Orders
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>
            Order #{order.order_ref}
          </h1>
          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusColor[order.status] ?? 'bg-gray-100 text-gray-700'}`}>
            {order.status}
          </span>
          <button onClick={fetchOrder} className="ml-auto flex items-center gap-1.5 text-sm px-3 py-1.5 border rounded-lg hover:bg-muted transition-colors">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-5">
            {/* Customer info */}
            <div className="bg-card border rounded-xl p-5">
              <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--text-heading)' }}>Customer</h2>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Email</dt>
                <dd>{order.guest_email ?? '—'}</dd>
                {order.guest_details && typeof order.guest_details === 'object' && Object.entries(order.guest_details as Record<string, string>).slice(0, 6).map(([k, v]) => (
                  <React.Fragment key={k}>
                    <dt className="text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</dt>
                    <dd className="truncate">{String(v)}</dd>
                  </React.Fragment>
                ))}
              </dl>
            </div>

            {/* Order Items */}
            <div className="bg-card border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b">
                <h2 className="font-semibold text-sm" style={{ color: 'var(--text-heading)' }}>Items ({order.items.length})</h2>
              </div>
              {order.items.map(item => (
                <div key={item.id} className="px-5 py-4 border-b last:border-0">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="font-medium text-sm">{item.company_name ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">{item.product_name ?? '—'} · {item.speed}</div>
                    </div>
                    <div className="text-right text-sm font-semibold tabular-nums">€{item.unit_price.toFixed(2)}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground mb-3">
                    <div>API4All Order ID: <span className="font-mono">{item.api4all_order_id ?? '—'}</span></div>
                    <div>Item Code: <span className="font-mono">{item.api4all_item_code ?? '—'}</span></div>
                    {item.sla_deadline && <div>SLA Deadline: {format(new Date(item.sla_deadline), 'MMM d, HH:mm')}</div>}
                    {item.assigned_to && <div>Assigned to: {item.assigned_to}</div>}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <select
                      value={item.fulfillment_status}
                      onChange={e => updateItemStatus(item.id, e.target.value)}
                      className="text-xs border rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {FULFILLMENT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button
                      onClick={() => updateItemStatus(item.id, 'completed')}
                      className="text-xs px-2.5 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors"
                    >
                      Mark Complete
                    </button>
                    <button
                      onClick={() => updateItemStatus(item.id, 'pending')}
                      className="text-xs px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 transition-colors"
                    >
                      Retry
                    </button>
                    {!item.verified_at ? (
                      <button
                        onClick={() => verifyItem(item.id)}
                        className="text-xs px-2.5 py-1 rounded transition-colors flex items-center gap-1"
                        style={{ backgroundColor: 'var(--brand-accent)', color: '#fff' }}
                      >
                        <ShieldCheck className="h-3 w-3" /> Verify Certificate
                      </button>
                    ) : (
                      <button
                        onClick={() => unverifyItem(item.id)}
                        className="text-xs px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded hover:bg-emerald-200 transition-colors flex items-center gap-1"
                      >
                        <ShieldCheck className="h-3 w-3" /> Verified ✓
                      </button>
                    )}
                  </div>
                  {item.verified_at && (
                    <div className="mt-2 text-xs text-emerald-700 bg-emerald-50 rounded px-3 py-1.5 inline-flex items-center gap-2">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Verified by {item.verified_by} on {format(new Date(item.verified_at), 'MMM d, yyyy HH:mm')}
                      {item.verification_note && <span className="text-muted-foreground ml-1">— {item.verification_note}</span>}
                    </div>
                  )}
                  <div className="mt-3">
                    <JsonViewer data={item.raw_json} />
                  </div>
                </div>
              ))}
            </div>

            {/* Internal Notes */}
            <div className="bg-card border rounded-xl p-5">
              <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--text-heading)' }}>Internal Notes</h2>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={4}
                className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Add internal notes…"
              />
              <button
                onClick={saveNotes}
                disabled={savingNotes}
                className="mt-2 text-sm px-4 py-2 rounded-lg text-white disabled:opacity-50 transition-opacity"
                style={{ background: 'var(--brand-accent)' }}
              >
                {savingNotes ? 'Saving…' : 'Save note'}
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Summary */}
            <div className="bg-card border rounded-xl p-5">
              <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--text-heading)' }}>Summary</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Date</dt><dd>{format(new Date(order.created_at), 'MMM d, yyyy')}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>€{order.subtotal.toFixed(2)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">VAT</dt><dd>€{order.vat_amount.toFixed(2)}</dd></div>
                {order.discount_amount > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">Discount</dt><dd>-€{order.discount_amount.toFixed(2)}</dd></div>}
                <div className="flex justify-between border-t pt-2 font-semibold"><dt>Total</dt><dd>€{order.total.toFixed(2)}</dd></div>
              </dl>
              {order.stripe_payment_intent_id && (
                <div className="mt-3 pt-3 border-t text-xs text-muted-foreground font-mono break-all">
                  PI: {order.stripe_payment_intent_id}
                </div>
              )}
            </div>

            {/* Status Override */}
            <div className="bg-card border rounded-xl p-5">
              <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--text-heading)' }}>Status Override</h2>
              <select
                value={statusOverride}
                onChange={e => updateOrderStatus(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>

            {/* Refund */}
            <div className="bg-card border rounded-xl p-5">
              <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--text-heading)' }}>Actions</h2>
              <button
                onClick={() => setRefundModal(true)}
                className="w-full text-sm py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              >
                Issue Refund
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Refund Modal */}
      {refundModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-lg mb-4" style={{ color: 'var(--text-heading)' }}>Issue Refund</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Refund Amount (€)</label>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={e => setRefundAmount(e.target.value)}
                  placeholder={order.total.toFixed(2)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Reason</label>
                <textarea
                  value={refundReason}
                  onChange={e => setRefundReason(e.target.value)}
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Customer requested…"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setRefundModal(false)} className="flex-1 py-2 text-sm border rounded-lg hover:bg-muted transition-colors">
                Cancel
              </button>
              <button
                onClick={async () => {
                  await updateOrderStatus('refunded');
                  setRefundModal(false);
                  toast({ title: 'Refund recorded', description: `€${refundAmount} — ${refundReason}` });
                }}
                className="flex-1 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Confirm Refund
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
