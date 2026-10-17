import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { AlertTriangle, ChevronDown, ChevronRight, ExternalLink, RefreshCw, Search } from 'lucide-react';
import { format } from 'date-fns';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { deliverySummary, needsScreening, paymentStatus, reportStatus, itemDelivered, type StatusItem } from '@/lib/orderStatus';

interface Item extends StatusItem {
  id: string;
  fresh_investigation: boolean | null;
  companies: { name: string; country_code: string } | null;
  products: { name: string; slug: string } | null;
}
interface Order {
  id: string;
  order_ref: string | null;
  status: string | null;
  total: number;
  currency: string | null;
  created_at: string | null;
  guest_email: string | null;
  payment_method: string;
  stripe_payment_intent_id: string | null;
  profiles: { full_name: string | null; email: string | null } | null;
  order_items: Item[];
}

async function loadOrders(): Promise<Order[]> {
  const orders: Order[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from('orders').select(`
      id, order_ref, status, total, currency, created_at, guest_email, payment_method, stripe_payment_intent_id,
      profiles!orders_user_id_fkey(full_name, email),
      order_items(id, fulfillment_status, sla_deadline, fresh_investigation, screening_addon,
        companies(name, country_code), products(name, slug),
        generated_reports(id, generated_at, download_expires_at), screening_results(overall_status, error))
    `).order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + 499);
    if (error) throw error;
    const batch = (data ?? []) as unknown as Order[];
    orders.push(...batch);
    if (batch.length < 500) return orders;
  }
}

function date(value: string | null) {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : format(parsed, 'dd MMM yyyy, HH:mm');
}

function Chip({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'good' | 'warning' | 'bad' }) {
  const styles = {
    neutral: 'bg-muted text-muted-foreground',
    good: 'bg-[var(--risk-low-bg)] text-[var(--risk-low)]',
    warning: 'bg-[var(--risk-medium-bg)] text-[var(--risk-medium)]',
    bad: 'bg-[var(--risk-high-bg)] text-[var(--risk-high)]',
  };
  return <span className={`inline-flex rounded px-2 py-1 text-xs font-medium ${styles[tone]}`}>{children}</span>;
}

const filters = [
  ['all', 'All orders'], ['payment', 'Awaiting payment'], ['progress', 'In progress'], ['ready', 'Ready'], ['attention', 'Needs attention'],
];

export default function AdminOrderStatusPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const { data: orders = [], isPending, isFetching, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['admin-order-status'], queryFn: loadOrders, refetchInterval: 60_000,
  });
  const filtered = orders.filter(order => {
    const q = search.trim().toLowerCase();
    const matches = !q || [order.order_ref, order.id, order.guest_email, order.profiles?.email, order.profiles?.full_name,
      ...order.order_items.flatMap(item => [item.companies?.name, item.products?.name])].some(value => value?.toLowerCase().includes(q));
    const summary = deliverySummary(order.status, order.order_items);
    return matches && (filter === 'all' || filter === 'payment' && order.status === 'pending' ||
      filter === 'ready' && summary.label === 'Ready' || filter === 'attention' && (summary.attention || order.status === 'failed') ||
      filter === 'progress' && ['In progress', 'Partially ready'].includes(summary.label));
  });
  const pages = Math.max(1, Math.ceil(filtered.length / 25));
  const currentPage = Math.min(page, pages - 1);
  const visible = filtered.slice(currentPage * 25, (currentPage + 1) * 25);
  function toggle(id: string) {
    setExpanded(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }

  return <AdminLayout>
    <Helmet><title>Order Status — Infocredit World Admin</title><meta name="robots" content="noindex" /></Helmet>
    <div className="mx-auto max-w-screen-2xl space-y-6 p-4 pb-28 md:p-6 md:pb-28">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Order Status</h1>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-muted-foreground">{dataUpdatedAt ? `Updated ${format(dataUpdatedAt, 'HH:mm:ss')} · refreshes every minute` : ''}</span>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}><RefreshCw className={isFetching ? 'animate-spin motion-reduce:animate-none' : ''} />Refresh</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 border-y py-5 lg:grid-cols-4">
        {[
          ['Total orders', orders.length],
          ['Awaiting payment', orders.filter(order => order.status === 'pending').length],
          ['Ready', orders.filter(order => deliverySummary(order.status, order.order_items).label === 'Ready').length],
          ['Needs attention', orders.filter(order => deliverySummary(order.status, order.order_items).attention || order.status === 'failed').length],
        ].map(([label, value]) => <div key={label}><div className="text-xs font-medium text-muted-foreground">{label}</div><div className="mt-1 text-2xl font-semibold tabular-nums">{isPending ? '—' : value}</div></div>)}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input aria-label="Search orders" placeholder="Search order, customer or company…" className="pl-9" value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} />
        </div>
        <select aria-label="Order status filter" className="h-10 max-w-full rounded-md border bg-background px-3 text-sm" value={filter} onChange={event => { setFilter(event.target.value); setPage(0); }}>
          {filters.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      {error && <div role="alert" className="flex items-start gap-2 border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><AlertTriangle className="h-4 w-4 shrink-0" /><div>Could not refresh orders. {error instanceof Error ? error.message : 'Please try again.'}{orders.length > 0 && ' Previously loaded orders are shown below.'}</div></div>}

      <div className="overflow-x-auto border-b">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="border-y bg-muted/50 text-xs text-muted-foreground"><tr>{['Order', 'Customer', 'Payment', 'Reports', 'Delivery progress', ''].map((heading, index) => <th key={index} className="px-3 py-3 font-medium">{heading}</th>)}</tr></thead>
          <tbody>
            {isPending ? <tr><td colSpan={6} className="py-16 text-center text-muted-foreground">Loading orders…</td></tr> : visible.length === 0 ? <tr><td colSpan={6} className="py-16 text-center text-muted-foreground">{error ? 'Orders unavailable' : 'No orders found'}</td></tr> : visible.map(order => {
              const summary = deliverySummary(order.status, order.order_items);
              const payment = paymentStatus(order.status, order.payment_method, order.stripe_payment_intent_id);
              const open = expanded.has(order.id);
              return <OrderRows key={order.id} order={order} summary={summary} payment={payment} open={open} toggle={() => toggle(order.id)} />;
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{filtered.length ? `${currentPage * 25 + 1}–${Math.min((currentPage + 1) * 25, filtered.length)} of ${filtered.length}` : '0'} orders{filter !== 'all' || search ? ` · ${orders.length} total` : ''}</span>
        <div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</Button><span>{currentPage + 1} / {pages}</span><Button variant="outline" size="sm" disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}>Next</Button></div>
      </div>
    </div>
  </AdminLayout>;
}

function OrderRows({ order, summary, payment, open, toggle }: { order: Order; summary: ReturnType<typeof deliverySummary>; payment: string; open: boolean; toggle: () => void }) {
  const ref = order.order_ref ?? order.id.slice(0, 8);
  const method = { card: 'Card', wallet: 'Prepaid credit', invoice: 'Monthly invoice' }[order.payment_method] ?? order.payment_method;
  return <>
    <tr className="border-b align-top">
      <td className="px-3 py-4"><div className="flex items-start gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label={`${open ? 'Hide' : 'Show'} reports for ${ref}`} aria-expanded={open} onClick={toggle}>{open ? <ChevronDown /> : <ChevronRight />}</Button>
        <div><Link className="font-semibold text-primary hover:underline" to={`/admin/orders/${order.id}`}>{ref}</Link><div className="mt-1 whitespace-nowrap text-xs text-muted-foreground">{date(order.created_at)}</div><div className="mt-1 text-xs capitalize text-muted-foreground">Order: {order.status ?? 'Unknown'}</div></div>
      </div></td>
      <td className="max-w-56 break-words px-3 py-4"><div>{order.profiles?.full_name || (order.guest_email ? 'Guest' : 'Customer')}</div><div className="mt-1 text-xs text-muted-foreground">{order.profiles?.email ?? order.guest_email ?? '—'}</div></td>
      <td className="px-3 py-4"><Chip tone={['Failed', 'Cancelled', 'Refunded'].includes(payment) ? 'bad' : payment.includes('unverified') || payment === 'Awaiting payment' ? 'warning' : 'neutral'}>{payment}</Chip><div className="mt-2 text-xs text-muted-foreground">{method} · {new Intl.NumberFormat('en-IE', { style: 'currency', currency: order.currency || 'EUR' }).format(Number(order.total))}</div></td>
      <td className="px-3 py-4"><span className="font-medium">{order.order_items.length} {order.order_items.length === 1 ? 'item' : 'items'}</span><div className="mt-1 text-xs text-muted-foreground">{order.order_items.filter(item => reportStatus(item) === 'Report available' || reportStatus(item) === 'Screening ready').length} available</div></td>
      <td className="min-w-44 px-3 py-4"><Chip tone={summary.label === 'Ready' ? 'good' : summary.attention ? 'bad' : 'neutral'}>{summary.label}</Chip>{summary.total > 0 && <><Progress aria-label={`Delivery progress for ${ref}`} value={summary.percent} className="my-2 h-1.5" /><span className="text-xs text-muted-foreground">{summary.ready} / {summary.total} fully ready</span></>}{summary.overdue && <div className="mt-1 text-xs font-medium text-destructive">Delivery overdue</div>}</td>
      <td className="px-3 py-4"><Button variant="outline" size="icon" asChild><Link to={`/admin/orders/${order.id}`} aria-label={`Open order ${ref}`} title="Open order"><ExternalLink /></Link></Button></td>
    </tr>
    {open && <tr className="border-b bg-muted/20"><td colSpan={6} className="px-6 py-4">
      {order.order_items.length === 0 ? <p className="text-sm text-muted-foreground">No report items are attached to this order. View the order details to check credit or other purchases.</p> : <div className="space-y-4">
        {order.order_items.map(item => {
          const screening = item.screening_results[0];
          const ready = itemDelivered(item);
          const overdue = !ready && summary.overdue && item.sla_deadline && new Date(item.sla_deadline).getTime() < Date.now();
          return <div key={item.id} className="grid grid-cols-[minmax(180px,2fr)_minmax(150px,1fr)_minmax(130px,1fr)_minmax(180px,1fr)] gap-4 border-b pb-4 last:border-0 last:pb-0">
            <div><div className="font-medium">{item.companies?.name ?? 'No company attached'}</div><div className="mt-1 text-xs text-muted-foreground">{item.products?.name ?? 'Product unavailable'}{item.companies?.country_code ? ` · ${item.companies.country_code}` : ''}</div>{item.fresh_investigation && <div className="mt-1 text-xs text-muted-foreground">Fresh investigation</div>}</div>
            <div><div className="mb-2 text-xs text-muted-foreground">Report status</div><Chip tone={ready ? 'good' : item.fulfillment_status === 'failed' ? 'bad' : 'neutral'}>{reportStatus(item)}</Chip></div>
            <div><div className="mb-2 text-xs text-muted-foreground">Compliance screening</div>{needsScreening(item) ? <Chip tone={screening?.overall_status === 'clear' ? 'good' : screening?.overall_status === 'error' || screening?.error ? 'bad' : 'warning'}>{screening?.error ? 'Failed' : ({ clear: 'Clear', review: 'Review required', hit: 'Hit', error: 'Failed', pending: 'Pending' }[screening?.overall_status ?? ''] ?? 'Pending')}</Chip> : <span className="text-xs text-muted-foreground">Not ordered</span>}</div>
            <div><div className="mb-2 text-xs text-muted-foreground">Delivery</div><div className={`text-xs ${overdue ? 'text-destructive' : 'text-muted-foreground'}`}>{item.sla_deadline ? `${overdue ? 'Overdue' : 'Due'}: ${date(item.sla_deadline)}` : 'No deadline set'}</div>{item.generated_reports[0] && <div className="mt-1 text-xs text-muted-foreground">Generated: {date(item.generated_reports[0].generated_at)}</div>}{item.generated_reports.some(report => report.download_expires_at && new Date(report.download_expires_at).getTime() < Date.now()) && <div className="mt-1 text-xs text-destructive">Download access expired</div>}</div>
          </div>;
        })}
      </div>}
    </td></tr>}
  </>;
}