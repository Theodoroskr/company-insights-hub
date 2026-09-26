import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FileText, Clock, CheckCircle2, Bookmark, ChevronRight, Search, User, Download, Receipt } from 'lucide-react';
import AccountLayout from '../../components/layout/AccountLayout';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../lib/tenant';

interface OrderRow {
  id: string;
  order_ref: string | null;
  created_at: string | null;
  status: string | null;
  total: number;
  company_name: string | null;
}

interface SavedRow {
  id: string;
  company: { id: string; name: string; slug: string | null; country_code: string | null } | null;
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  pending:    { bg: '#F1F5F9', color: '#64748B', label: 'Pending' },
  processing: { bg: '#DBEAFE', color: '#1D4ED8', label: 'Processing' },
  completed:  { bg: '#DCFCE7', color: '#16A34A', label: 'Completed' },
  cancelled:  { bg: '#FEE2E2', color: '#DC2626', label: 'Cancelled' },
  failed:     { bg: '#FEE2E2', color: '#7F1D1D', label: 'Failed' },
};

function statusStyle(status: string | null) {
  return STATUS_STYLES[status ?? ''] ?? STATUS_STYLES.pending;
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTotal(total: number) {
  return `€${total.toFixed(2)}`;
}

export default function AccountDashboard() {
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ full_name?: string; email?: string } | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [saved, setSaved] = useState<SavedRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }

      const [profileRes, ordersRes, savedRes] = await Promise.all([
        supabase.from('profiles').select('full_name, email').eq('id', session.user.id).maybeSingle(),
        supabase
          .from('orders')
          .select(`id, order_ref, created_at, status, total,
            order_items ( id, companies ( name ) )`)
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('saved_companies' as any)
          .select('id, companies:company_id ( id, name, slug, country_code )')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(3),
      ]);

      if (profileRes.data) setProfile({ ...profileRes.data, email: profileRes.data.email ?? session.user.email });

      const rows: OrderRow[] = ((ordersRes.data ?? []) as any[]).map((o) => ({
        id: o.id,
        order_ref: o.order_ref,
        created_at: o.created_at,
        status: o.status,
        total: o.total,
        company_name: o.order_items?.[0]?.companies?.name ?? null,
      }));
      setOrders(rows);

      const savedRows: SavedRow[] = ((savedRes.data ?? []) as any[]).map((r) => ({
        id: r.id,
        company: r.companies ?? null,
      }));
      setSaved(savedRows);
      setLoading(false);
    }
    load();
  }, []);

  const firstName = profile?.full_name ? profile.full_name.split(' ')[0] : null;
  const inProgress = orders.filter((o) => o.status === 'processing' || o.status === 'pending').length;
  const completed = orders.filter((o) => o.status === 'completed').length;

  const cards = [
    { icon: <FileText className="w-5 h-5" />, label: 'Total orders', value: orders.length, to: '/account/orders' },
    { icon: <Clock className="w-5 h-5" />, label: 'In progress', value: inProgress, to: '/account/orders' },
    { icon: <CheckCircle2 className="w-5 h-5" />, label: 'Completed', value: completed, to: '/account/orders' },
    { icon: <Bookmark className="w-5 h-5" />, label: 'Saved companies', value: saved.length, to: '/account/saved' },
  ];

  const quickLinks = [
    { icon: <User className="w-5 h-5" />, label: 'Profile', desc: 'Name, email and phone', to: '/account/profile' },
    { icon: <Download className="w-5 h-5" />, label: 'Downloads', desc: 'Your purchased reports', to: '/account/downloads' },
    { icon: <Receipt className="w-5 h-5" />, label: 'Invoices', desc: 'Download per order', to: '/account/invoices' },
    { icon: <Bookmark className="w-5 h-5" />, label: 'Saved Companies', desc: 'Companies you follow', to: '/account/saved' },
  ];

  return (
    <AccountLayout>
      <Helmet>
        <title>My Account — {tenant?.brand_name ?? 'Overview'}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="max-w-5xl mx-auto">
        {/* Greeting */}
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-heading)' }}>
          {firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
        </h1>
        {profile?.email && (
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{profile.email}</p>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {cards.map(({ icon, label, value, to }) => (
            <Link
              key={label}
              to={to}
              className="block rounded-lg border p-4 transition-shadow hover:shadow-sm"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--bg-border)' }}
            >
              <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                {icon}
                <span className="text-xs">{label}</span>
              </div>
              <p className="text-2xl font-semibold mt-2" style={{ color: 'var(--text-heading)' }}>
                {loading ? '–' : value}
              </p>
            </Link>
          ))}
        </div>

        {/* Recent orders */}
        <section className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-heading)' }}>Recent reports</h2>
            <Link to="/account/orders" className="text-sm font-medium" style={{ color: 'var(--brand-accent)' }}>
              View all →
            </Link>
          </div>
          {!loading && orders.length === 0 ? (
            <div
              className="rounded-lg border p-8 text-center"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--bg-border)' }}
            >
              <Search className="w-6 h-6 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--text-heading)' }}>No reports yet</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                Search for a company to order your first report.
              </p>
              <button
                onClick={() => navigate('/company/search')}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white"
                style={{ backgroundColor: 'var(--brand-accent)' }}
              >
                Search a company
              </button>
            </div>
          ) : (
            <div
              className="rounded-lg border divide-y"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--bg-border)' }}
            >
              {loading
                ? null
                : (orders.slice(0, 3).map((o) => {
                    const st = statusStyle(o.status);
                    return (
                      <Link
                        key={o.id}
                        to={`/account/orders/${o.id}`}
                        className="flex items-center justify-between gap-4 px-4 py-3 hover:opacity-80"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-heading)' }}>
                            {o.company_name ?? 'Report order'}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {o.order_ref ?? '—'} · {formatDate(o.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: st.bg, color: st.color }}
                          >
                            {st.label}
                          </span>
                          <span className="text-sm font-medium" style={{ color: 'var(--text-heading)' }}>
                            {formatTotal(o.total)}
                          </span>
                          <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                        </div>
                      </Link>
                    );
                  }))}
            </div>
          )}
        </section>

        {/* Saved companies preview */}
        <section className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-heading)' }}>Saved companies</h2>
            <Link to="/account/saved" className="text-sm font-medium" style={{ color: 'var(--brand-accent)' }}>
              View all →
            </Link>
          </div>
          {!loading && saved.length === 0 ? (
            <div
              className="rounded-lg border p-6 text-center"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--bg-border)' }}
            >
              <Bookmark className="w-5 h-5 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Bookmark companies from search results or a company page and they will appear here.
              </p>
            </div>
          ) : (
            <div
              className="rounded-lg border divide-y"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--bg-border)' }}
            >
              {loading
                ? null
                : saved.map((s) => (
                    <Link
                      key={s.id}
                      to={s.company?.slug ? `/company/${s.company.slug}` : '/company/search'}
                      className="flex items-center justify-between px-4 py-3 hover:opacity-80"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-heading)' }}>
                          {s.company?.name ?? 'Company'}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {s.company?.country_code ?? ''}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                    </Link>
                  ))}
            </div>
          )}
        </section>

        {/* Quick links */}
        <section className="mt-8 mb-4">
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-heading)' }}>Quick links</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quickLinks.map(({ icon, label, desc, to }) => (
              <Link
                key={label}
                to={to}
                className="flex items-center gap-3 rounded-lg border p-4 transition-shadow hover:shadow-sm"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--bg-border)' }}
              >
                <div
                  className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--brand-accent)' }}
                >
                  {icon}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-heading)' }}>{label}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 ml-auto flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </AccountLayout>
  );
}
