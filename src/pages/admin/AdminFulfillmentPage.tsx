import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Upload } from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInMinutes, differenceInHours } from 'date-fns';
import { toast } from '@/hooks/use-toast';

interface FulfillmentItem {
  id: string;
  order_id: string;
  order_ref: string;
  company_name: string | null;
  product_name: string | null;
  customer_email: string | null;
  fulfillment_status: string;
  sla_deadline: string | null;
  api4all_order_id: string | null;
  assigned_to: string | null;
}

function rowBg(slaDeadline: string | null) {
  if (!slaDeadline) return '';
  const mins = differenceInMinutes(new Date(slaDeadline), new Date());
  if (mins < 0) return 'bg-red-50 border-l-4 border-l-red-500';
  if (mins < 120) return 'bg-amber-50 border-l-4 border-l-amber-400';
  return '';
}

function SlaLabel({ deadline }: { deadline: string | null }) {
  if (!deadline) return <span className="text-xs text-muted-foreground">—</span>;
  const now = new Date();
  const dl = new Date(deadline);
  const mins = differenceInMinutes(dl, now);
  const hrs = differenceInHours(dl, now);
  if (mins < 0) return <span className="text-xs font-semibold text-red-600">Overdue {format(dl, 'HH:mm')}</span>;
  if (hrs < 2) return <span className="text-xs font-semibold text-amber-600">{hrs}h {mins % 60}m</span>;
  return <span className="text-xs text-green-700">{format(dl, 'MMM d HH:mm')}</span>;
}

const FULFILLMENT_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  submitted: 'bg-blue-100 text-blue-800',
  processing: 'bg-indigo-100 text-indigo-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

export default function AdminFulfillmentPage() {
  const [items, setItems] = useState<FulfillmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user?.id) {
        const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('id', data.session.user.id).maybeSingle();
        setCurrentUser({ id: data.session.user.id, name: profile?.full_name || profile?.email || 'Admin' });
      }
    });
  }, []);

  const fetchItems = useCallback(async () => {
    const { data } = await supabase
      .from('order_items')
      .select(`
        id, order_id, fulfillment_status, sla_deadline, api4all_order_id, assigned_to,
        orders ( order_ref, guest_email ),
        companies ( name ),
        products ( name )
      `)
      .neq('fulfillment_status', 'completed')
      .order('sla_deadline', { ascending: true, nullsFirst: false });

    setItems(
      (data ?? []).map((i: any) => ({
        id: i.id,
        order_id: i.order_id,
        order_ref: i.orders?.order_ref ?? i.order_id?.slice(0, 8),
        company_name: i.companies?.name ?? null,
        product_name: i.products?.name ?? null,
        customer_email: i.orders?.guest_email ?? null,
        fulfillment_status: i.fulfillment_status,
        sla_deadline: i.sla_deadline,
        api4all_order_id: i.api4all_order_id,
        assigned_to: i.assigned_to,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();
    intervalRef.current = setInterval(fetchItems, 60_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchItems]);

  const claim = async (itemId: string) => {
    if (!currentUser) return;
    await supabase.from('order_items').update({ assigned_to: currentUser.name }).eq('id', itemId);
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, assigned_to: currentUser.name } : i));
    toast({ title: 'Claimed', description: `Assigned to ${currentUser.name}` });
  };

  const markComplete = async (itemId: string) => {
    await supabase.from('order_items').update({ fulfillment_status: 'completed' }).eq('id', itemId);
    setItems(prev => prev.filter(i => i.id !== itemId));
    toast({ title: 'Marked complete' });
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>Fulfillment Queue</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Auto-refreshes every 60 seconds. Sorted by SLA deadline.</p>
          </div>
          <button onClick={fetchItems} className="flex items-center gap-2 text-sm px-3 py-1.5 border rounded-lg hover:bg-muted transition-colors">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh now
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-200 border-l-2 border-l-red-500" />Overdue</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-100 border-l-2 border-l-amber-400" />&lt; 2 hours</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-white border border-border" />On track</span>
        </div>

        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {['SLA', 'Company', 'Product', 'Customer', 'API4All', 'Status', 'Assigned to', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">Loading…</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">✅ No pending items — queue is clear</td></tr>
                ) : (
                  items.map(item => (
                    <tr key={item.id} className={`border-b last:border-0 transition-colors ${rowBg(item.sla_deadline)}`}>
                      <td className="px-4 py-3 whitespace-nowrap"><SlaLabel deadline={item.sla_deadline} /></td>
                      <td className="px-4 py-3 font-medium max-w-40 truncate">{item.company_name ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-32 truncate">{item.product_name ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-36 truncate">{item.customer_email ?? '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.api4all_order_id ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${FULFILLMENT_COLORS[item.fulfillment_status] ?? 'bg-gray-100 text-gray-700'}`}>
                          {item.fulfillment_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{item.assigned_to ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {!item.assigned_to && (
                            <button onClick={() => claim(item.id)} className="text-xs px-2 py-1 border rounded hover:bg-muted transition-colors">
                              Claim
                            </button>
                          )}
                          <button onClick={() => markComplete(item.id)} className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors">
                            Complete
                          </button>
                          <Link to={`/admin/orders/${item.order_id}`} className="text-xs px-2 py-1 border rounded hover:bg-muted transition-colors">
                            Order
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t text-xs text-muted-foreground">
            {items.length} items pending fulfillment
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
