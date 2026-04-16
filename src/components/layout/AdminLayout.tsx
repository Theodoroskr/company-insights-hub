import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Settings2,
  Package,
  Users,
  Tag,
  Activity,
  ScrollText,
  Settings,
  ChevronLeft,
  Menu,
  X,
  Globe,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/lib/tenant';

const NAV_ITEMS = [
  { label: 'Dashboard',     icon: LayoutDashboard, to: '/admin' },
  { label: 'Orders',        icon: ClipboardList,    to: '/admin/orders' },
  { label: 'Fulfillment',   icon: Settings2,        to: '/admin/fulfillment' },
  { label: 'Products',      icon: Package,          to: '/admin/products' },
  { label: 'Customers',     icon: Users,            to: '/admin/customers' },
  { label: 'Promo Codes',   icon: Tag,              to: '/admin/promo-codes' },
  { label: 'Source Health', icon: Activity,         to: '/admin/source-health' },
  { label: 'Audit Logs',    icon: ScrollText,       to: '/admin/audit-logs' },
  { label: 'Settings',      icon: Settings,         to: '/admin/settings' },
  { label: 'Tenants',       icon: Globe,            to: '/admin/tenants', superAdminOnly: true },
] as const;

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const [adminName, setAdminName] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', data.session.user.id)
          .maybeSingle();
        setAdminName(profile?.full_name || profile?.email || 'Admin');
      }
    });
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const isActive = (to: string) => {
    if (to === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(to);
  };

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Sidebar */}
      <aside
        className="flex flex-col flex-shrink-0 transition-all duration-300"
        style={{
          width: sidebarOpen ? '220px' : '56px',
          background: 'var(--brand-dark)',
        }}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-3 py-4 border-b border-white/10">
          {sidebarOpen && (
            <span className="text-white font-bold text-sm truncate">Admin Panel</span>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-white/60 hover:text-white p-1 rounded transition-colors ml-auto"
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {NAV_ITEMS.map(({ label, icon: Icon, to }) => (
            <Link
              key={to}
              to={to}
              title={!sidebarOpen ? label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg text-sm transition-all duration-150 mb-0.5 group
                ${isActive(to)
                  ? 'bg-white/15 text-white font-medium'
                  : 'text-white/65 hover:text-white hover:bg-white/10'
                }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {sidebarOpen && <span className="truncate">{label}</span>}
            </Link>
          ))}
        </nav>

        {/* Sidebar footer */}
        {sidebarOpen && (
          <div className="px-3 py-4 border-t border-white/10">
            <div className="text-white/50 text-xs truncate mb-2">{adminName}</div>
            <button
              onClick={handleSignOut}
              className="text-white/50 hover:text-white text-xs transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header
          className="flex items-center justify-between px-6 py-3 text-white flex-shrink-0"
          style={{ background: 'var(--brand-primary)' }}
        >
          <div className="flex items-center gap-3">
            <span className="font-semibold text-sm">
              Admin Panel
              {tenant?.brand_name && (
                <span className="text-white/70 font-normal"> — {tenant.brand_name}</span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-white/70 text-sm hidden sm:block">{adminName}</span>
            <Link
              to="/"
              className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to site
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
