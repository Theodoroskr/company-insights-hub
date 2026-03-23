import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, AlertTriangle, RefreshCw, Clock } from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';

interface KPI {
  ordersToday: number;
  revenueToday: number;
  pendingFulfillment: number;
  failedOrders: number;
  ordersYesterday: number;
  revenueYesterday: number;
}

interface SlaAlert {
  id: string;
  order_id: string;
  order_ref: string;
  company_name: string;
  product_name: string;
  sla_deadline: string;
}

interface RecentOrder {
  id: string;
  order_ref: string;
  status: string;
  total: number;
  created_at: string;
  guest_email: string;
  user_email?: string;
}

interface ApiHealthState {
  status: 'checking' | 'healthy' | 'degraded' | 'down';
  lastChecked: Date | null;
  responseMs: number | null;
}

export default function AdminDashboard() {
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [slaAlerts, setSlaAlerts] = useState<SlaAlert[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [apiHealth, setApiHealth] = useState<ApiHealthState>({ status: 'checking', lastChecked: null, responseMs: null });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();

    const [todayOrders, yesterdayOrders, pendingItems, failedOrders, overdueItems, recent] = await Promise.all([
      supabase.from('orders').select('id, total').gte('created_at', todayStart),
      supabase.from('orders').select('id, total').gte('created_at', yesterdayStart).lt('created_at', todayStart),
      supabase.from('order_items').select('id').eq('fulfillment_status', 'pending'),
      supabase.from('orders').select('id').eq('status', 'failed'),
      supabase.from('order_items')
        .select('id, order_id, sla_deadline, orders(order_ref), companies(name), products(name)')
        .lt('sla_deadline', now.toISOString())
        .neq('fulfillment_status', 'completed'),
      supabase.from('orders')
        .select('id, order_ref, status, total, created_at, guest_email, user_id')
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    setKpi({
      ordersToday: todayOrders.data?.length ?? 0,
      revenueToday: todayOrders.data?.reduce((s, o) => s + Number(o.total), 0) ?? 0,
      pendingFulfillment: pendingItems.data?.length ?? 0,
      failedOrders: failedOrders.data?.length ?? 0,
      ordersYesterday: yesterdayOrders.data?.length ?? 0,
      revenueYesterday: yesterdayOrders.data?.reduce((s, o) => s + Number(o.total), 0) ?? 0,
    });

    setSlaAlerts(
      (overdueItems.data ?? []).map((item: any) => ({
        id: item.id,
        order_id: item.order_id,
        order_ref: item.orders?.order_ref ?? item.order_id?.slice(0, 8),
        company_name: item.companies?.name ?? '—',
        product_name: item.products?.name ?? '—',
        sla_deadline: item.sla_deadline,
      }))
    );

    setRecentOrders(
      (recent.data ?? []).map((o: any) => ({
        id: o.id,
        order_ref: o.order_ref ?? o.id.slice(0, 8),
        status: o.status,
        total: Number(o.total),
        created_at: o.created_at,
        guest_email: o.guest_email ?? '',
      }))
    );

    setLoading(false);
  }, []);

  const testApiHealth = useCallback(async () => {
    setApiHealth(prev => ({ ...prev, status: 'checking' }));
    const start = Date.now();
    try {
      const { error } = await supabase.functions.invoke('search-companies', {
        body: { q: 'test', country: 'cy', tenant_id: 'health-check' },
      });
      const ms = Date.now() - start;
      setApiHealth({ status: error ? 'degraded' : 'healthy', lastChecked: new Date(), responseMs: ms });
    } catch {
      setApiHealth({ status: 'down', lastChecked: new Date(), responseMs: null });
    }
  }, []);

  useEffect(() => {
    fetchData();
    testApiHealth();
  }, [fetchData, testApiHealth]);

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    refunded: 'bg-gray-100 text-gray-700',
  };

  const healthColor = { checking: 'text-muted-foreground', healthy: 'text-green-600', degraded: 'text-amber-600', down: 'text-red-600' };
  const healthLabel = { checking: 'Checking…', healthy: '✅ Healthy', degraded: '⚠️ Degraded', down: '❌ Down' };

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>Dashboard</h1>
          <button
            onClick={() => { fetchData(); testApiHealth(); }}
            className="flex items-center gap-2 text-sm px-3 py-1.5 border rounded-lg hover:bg-muted transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'Orders Today',
              value: kpi?.ordersToday ?? '—',
              prev: kpi?.ordersYesterday,
              suffix: '',
            },
            {
              label: 'Revenue Today',
              value: kpi ? `€${kpi.revenueToday.toFixed(2)}` : '—',
              prev: kpi?.revenueYesterday,
              suffix: '',
            },
            {
              label: 'Pending Fulfillment',
              value: kpi?.pendingFulfillment ?? '—',
              prev: null,
              suffix: '',
              warn: kpi ? kpi.pendingFulfillment > 0 : false,
            },
            {
              label: 'Failed Orders',
              value: kpi?.failedOrders ?? '—',
              prev: null,
              suffix: '',
              warn: kpi ? kpi.failedOrders > 0 : false,
            },
          ].map((card) => (
            <div key={card.label} className="bg-card border rounded-xl p-5 flex flex-col gap-2">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{card.label}</span>
              <span className={`text-2xl font-bold tabular-nums ${card.warn ? 'text-red-600' : ''}`} style={!card.warn ? { color: 'var(--text-heading)' } : {}}>
                {loading ? '…' : card.value}
              </span>
              {card.prev !== null && card.prev !== undefined && kpi && (
                <div className="flex items-center gap-1 text-xs">
                  {card.prev < (typeof card.value === 'number' ? card.value : 0)
                    ? <TrendingUp className="h-3 w-3 text-green-600" />
                    : <TrendingDown className="h-3 w-3 text-red-500" />}
                  <span className="text-muted-foreground">vs yesterday</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* API4All Health */}
        <div className="bg-card border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text-heading)' }}>API4All Source Health</h2>
            <button onClick={testApiHealth} className="text-xs px-3 py-1.5 border rounded-lg hover:bg-muted transition-colors flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              Test connection
            </button>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <span className={`font-semibold ${healthColor[apiHealth.status]}`}>
              {healthLabel[apiHealth.status]}
            </span>
            {apiHealth.lastChecked && (
              <span className="text-xs text-muted-foreground">
                Last checked: {format(apiHealth.lastChecked, 'HH:mm:ss')}
              </span>
            )}
            {apiHealth.responseMs !== null && (
              <span className="text-xs text-muted-foreground">
                Response: {apiHealth.responseMs}ms
              </span>
            )}
          </div>
        </div>

        {/* SLA Alerts */}
        {slaAlerts.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <h2 className="font-semibold text-sm text-red-800">SLA Overdue ({slaAlerts.length})</h2>
            </div>
            <div className="space-y-2">
              {slaAlerts.map(alert => (
                <div key={alert.id} className="flex items-center justify-between gap-4 text-sm text-red-700">
                  <span className="font-medium">{alert.company_name}</span>
                  <span>{alert.product_name}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Overdue by {formatDistanceToNow(new Date(alert.sla_deadline))}
                  </span>
                  <Link to={`/admin/orders/${alert.order_id}`} className="text-red-600 underline hover:no-underline text-xs">
                    View #{alert.order_ref}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Orders */}
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text-heading)' }}>Recent Orders</h2>
            <Link to="/admin/orders" className="text-xs hover:underline" style={{ color: 'var(--brand-accent)' }}>
              View all →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {['Date', 'Ref', 'Customer', 'Status', 'Total'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">Loading…</td></tr>
                ) : recentOrders.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">No orders yet</td></tr>
                ) : (
                  recentOrders.map(order => (
                    <tr key={order.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground text-xs">{format(new Date(order.created_at), 'MMM d, HH:mm')}</td>
                      <td className="px-4 py-3">
                        <Link to={`/admin/orders/${order.id}`} className="font-medium hover:underline" style={{ color: 'var(--brand-accent)' }}>
                          #{order.order_ref}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{order.guest_email || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor[order.status] ?? 'bg-gray-100 text-gray-700'}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold tabular-nums">€{order.total.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
