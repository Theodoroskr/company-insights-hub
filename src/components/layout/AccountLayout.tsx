import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User, FileText, Receipt, Download, Bookmark } from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';
import { supabase } from '../../lib/supabase';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  to: string;
}

const NAV_ITEMS: NavItem[] = [
  { icon: <User className="w-4 h-4" />, label: 'Profile', to: '/account/profile' },
  { icon: <FileText className="w-4 h-4" />, label: 'Reports', to: '/account/orders' },
  { icon: <Bookmark className="w-4 h-4" />, label: 'Saved Companies', to: '/account/saved' },
  { icon: <Download className="w-4 h-4" />, label: 'Downloads', to: '/account/downloads' },
  { icon: <Receipt className="w-4 h-4" />, label: 'Invoices', to: '/account/invoices' },
];

interface AccountLayoutProps {
  children: React.ReactNode;
}

export default function AccountLayout({ children }: AccountLayoutProps) {
  const location = useLocation();
  const [profile, setProfile] = useState<{ full_name?: string; email?: string } | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', session.user.id)
        .maybeSingle();
      setProfile(data ? { ...data, email: data.email ?? session.user.email } : { email: session.user.email });
    }
    load();
  }, []);

  const initials = profile?.full_name
    ? profile.full_name
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--bg-page)' }}>
      <Navbar />
      <div className="flex flex-1">
        {/* ── Sidebar ── */}
        <aside
          className="hidden md:flex flex-col flex-shrink-0"
          style={{
            width: '280px',
            backgroundColor: '#fff',
            borderRight: '1px solid var(--bg-border)',
          }}
        >
          {/* User card */}
          <div className="m-3 p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-subtle)' }}>
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 select-none"
                style={{ backgroundColor: '#E8A598' }}
              >
                {initials}
              </div>
              <div className="min-w-0">
                {profile?.full_name ? (
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-heading)' }}>
                    {profile.full_name}
                  </p>
                ) : (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Complete your profile
                  </p>
                )}
                {profile?.email && (
                  <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {profile.email}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section label */}
          <p
            className="px-4 mt-4 mb-2 text-xs tracking-widest uppercase"
            style={{ color: 'var(--text-muted)' }}
          >
            General
          </p>

          {/* Nav links */}
          <nav className="flex flex-col">
            {NAV_ITEMS.map(({ icon, label, to }) => {
              const active = location.pathname === to || (to === '/account/orders' && location.pathname.startsWith('/account/orders'));
              return (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-3 px-4 py-3 text-sm transition-colors relative"
                  style={{
                    color: active ? 'var(--brand-accent)' : 'var(--text-body)',
                    backgroundColor: active ? 'var(--bg-subtle)' : 'transparent',
                    borderLeft: active ? '3px solid var(--brand-accent)' : '3px solid transparent',
                    fontWeight: active ? 600 : 400,
                  }}
                  onMouseOver={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-subtle)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {icon}
                  {label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 min-w-0 p-6 md:p-8">
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
}
