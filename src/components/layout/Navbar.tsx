import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown, User, LogOut, Settings, Package, Download, ShoppingCart, Search, Loader2 } from 'lucide-react';
import { useTenant } from '../../lib/tenant';
import { supabase } from '../../lib/supabase';
import { useCart } from '../../contexts/CartContext';
import type { Product, Company } from '../../types/database';

// ── Debounce hook ─────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ── Navbar Search ─────────────────────────────────────────────
function NavbarSearch({ tenantId }: { tenantId: string }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Company[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Search on debounced query
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);

    supabase.functions
      .invoke('search-companies', {
        body: { q: debouncedQuery, tenant_id: tenantId },
      })
      .then(({ data }) => {
        if (cancelled) return;
        const res = (data?.results ?? []) as Company[];
        setResults(res.slice(0, 6));
        setShowResults(true);
        setIsSearching(false);
      })
      .catch(() => {
        if (!cancelled) setIsSearching(false);
      });

    return () => { cancelled = true; };
  }, [debouncedQuery, tenantId]);

  const handleSelect = (company: Company) => {
    setShowResults(false);
    setQuery('');
    navigate(`/company/${company.slug ?? company.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.length >= 2) {
      setShowResults(false);
      setQuery('');
      navigate(`/company/search?q=${encodeURIComponent(query)}`);
    }
    if (e.key === 'Escape') {
      setShowResults(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all"
        style={{
          backgroundColor: 'var(--bg-subtle)',
          border: '1px solid var(--bg-border)',
          width: '220px',
        }}
      >
        {isSearching ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--text-muted)' }} />
        ) : (
          <Search className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search companies..."
          className="bg-transparent border-none outline-none text-sm flex-1"
          style={{ color: 'var(--text-body)' }}
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); setResults([]); setShowResults(false); }}
            className="p-0.5"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Dropdown results */}
      {showResults && results.length > 0 && (
        <div
          className="absolute top-full mt-1.5 left-0 right-0 bg-white rounded-lg shadow-xl border z-50 overflow-hidden"
          style={{ borderColor: 'var(--bg-border)', minWidth: '280px' }}
        >
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => handleSelect(r)}
              className="flex items-center gap-3 w-full px-3 py-2.5 text-left text-sm transition-colors"
              style={{ color: 'var(--text-body)' }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <span className="text-base">🏢</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate" style={{ color: 'var(--text-heading)' }}>
                  {r.name}
                </p>
                {r.reg_no && (
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                    {r.reg_no}
                  </p>
                )}
              </div>
              {r.status && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: r.status.toLowerCase() === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    color: r.status.toLowerCase() === 'active' ? 'var(--status-active)' : 'var(--status-dissolved)',
                  }}
                >
                  {r.status}
                </span>
              )}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setShowResults(false);
              setQuery('');
              navigate(`/company/search?q=${encodeURIComponent(query)}`);
            }}
            className="w-full px-3 py-2 text-xs font-medium text-center border-t"
            style={{ color: 'var(--brand-accent)', borderColor: 'var(--bg-border)' }}
          >
            View all results →
          </button>
        </div>
      )}
    </div>
  );
}

type OpenMenu = 'reports' | 'certificates' | 'register' | null;

export default function Navbar() {
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const { totalItems } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [session, setSession] = useState<null | { user: { email?: string; id: string } }>(null);
  const [userProfile, setUserProfile] = useState<{ full_name?: string; role?: string } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Auth state
  useEffect(() => {
    supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s as typeof session);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session as typeof session);
    });
  }, []);

  // Fetch profile
  useEffect(() => {
    if (!session?.user?.id) return;
    supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => setUserProfile(data));
  }, [session]);

  // Fetch products
  useEffect(() => {
    if (!tenant?.id) return;
    supabase
      .from('products')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .then(({ data }) => setProducts((data as unknown as Product[]) ?? []));
  }, [tenant]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUserMenuOpen(false);
    navigate('/');
  };

  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin';

  const initials = userProfile?.full_name
    ? userProfile.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : (session?.user?.email?.[0] ?? 'U').toUpperCase();

  const isCert = (type: string) => type === 'certificate' || type === 'cert';
  const reportProducts = products.filter((p) => !isCert(p.type as string));
  const certProducts = products.filter((p) => isCert(p.type as string));

  const toggleMenu = (menu: OpenMenu) => setOpenMenu((prev) => (prev === menu ? null : menu));

  const menuBtnStyle = (menu: OpenMenu) => ({
    color: openMenu === menu ? 'var(--brand-accent)' : 'var(--text-body)',
  });

  const dropdownLinkClass =
    'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors w-full text-left';

  return (
    <>
      <nav
        ref={navRef}
        className="sticky top-0 z-50 bg-white"
        style={{ borderBottom: '1px solid var(--bg-border)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* ── Logo ── */}
            <Link
              to="/"
              className="flex-shrink-0 font-bold tracking-tight"
              style={{ color: 'var(--brand-primary)', fontSize: '1.05rem' }}
            >
              {tenant?.brand_name ?? 'Companies House'}
            </Link>

            {/* ── Desktop nav ── */}
            <div className="hidden md:flex items-center gap-1">

              {/* Products mega menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => toggleMenu('reports')}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded transition-colors"
                  style={menuBtnStyle('reports')}
                >
                  Products
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openMenu === 'reports' ? 'rotate-180' : ''}`} />
                </button>

                {openMenu === 'reports' && (
                  <div
                    className="absolute left-0 top-full mt-1 bg-white rounded-xl shadow-2xl border z-50 overflow-hidden"
                    style={{ borderColor: 'var(--bg-border)', width: '720px' }}
                  >
                    <div className="grid grid-cols-3 divide-x" style={{ borderColor: 'var(--bg-border)' }}>
                      {/* Reports column */}
                      <div className="py-3">
                        <p className="px-4 pb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                          Reports
                        </p>
                        {reportProducts.length === 0 ? (
                          <p className="px-4 py-2 text-sm" style={{ color: 'var(--text-muted)' }}>No reports available</p>
                        ) : (
                          reportProducts.map((p) => (
                            <Link
                              key={p.id}
                              to={`/report?type=${p.slug}`}
                              onClick={() => setOpenMenu(null)}
                              className="block px-4 py-2 text-sm transition-colors"
                              style={{ color: 'var(--text-body)' }}
                              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
                              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <span className="mr-2">📋</span>
                              {p.name}
                            </Link>
                          ))
                        )}
                      </div>

                      {/* Certificates column */}
                      <div className="py-3">
                        <p className="px-4 pb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                          Certificates
                        </p>
                        {certProducts.length === 0 ? (
                          <p className="px-4 py-2 text-sm" style={{ color: 'var(--text-muted)' }}>No certificates available</p>
                        ) : (
                          certProducts.map((p) => (
                            <Link
                              key={p.id}
                              to={`/report?type=${p.slug}`}
                              onClick={() => setOpenMenu(null)}
                              className="block px-4 py-2 text-sm transition-colors"
                              style={{ color: 'var(--text-body)' }}
                              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
                              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <span className="mr-2">📄</span>
                              {p.name}
                            </Link>
                          ))
                        )}
                      </div>

                      {/* Register column */}
                      <div className="py-3">
                        <p className="px-4 pb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                          Register a Company
                        </p>
                        <Link
                          to="/company-set-up"
                          onClick={() => setOpenMenu(null)}
                          className="block px-4 py-2.5 transition-colors"
                          style={{ color: 'var(--text-body)' }}
                          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
                          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <p className="font-semibold text-sm" style={{ color: 'var(--text-heading)' }}>🏢 Company Set Up</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Register a new company</p>
                        </Link>
                        <Link
                          to="/business-name-approval"
                          onClick={() => setOpenMenu(null)}
                          className="block px-4 py-2.5 transition-colors"
                          style={{ color: 'var(--text-body)' }}
                          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
                          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <p className="font-semibold text-sm" style={{ color: 'var(--text-heading)' }}>✅ Business Name Approval</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Check and reserve your name</p>
                        </Link>
                      </div>
                    </div>

                    {/* Footer CTA */}
                    <div
                      className="px-4 py-2.5 text-center border-t"
                      style={{ borderColor: 'var(--bg-border)', backgroundColor: 'var(--bg-subtle)' }}
                    >
                      <Link
                        to="/pricing"
                        onClick={() => setOpenMenu(null)}
                        className="text-xs font-medium"
                        style={{ color: 'var(--brand-accent)' }}
                      >
                        View all products & pricing →
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              <Link
                to="/pricing"
                className="px-3 py-2 text-sm font-medium rounded transition-colors"
                style={{ color: 'var(--text-body)' }}
                onMouseOver={(e) => (e.currentTarget.style.color = 'var(--brand-accent)')}
                onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-body)')}
              >
                Pricing
              </Link>

              <Link
                to="/about"
                className="px-3 py-2 text-sm font-medium rounded transition-colors"
                style={{ color: 'var(--text-body)' }}
                onMouseOver={(e) => (e.currentTarget.style.color = 'var(--brand-accent)')}
                onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-body)')}
              >
                About
              </Link>

              <Link
                to="/contact"
                className="px-3 py-2 text-sm font-medium rounded transition-colors"
                style={{ color: 'var(--text-body)' }}
                onMouseOver={(e) => (e.currentTarget.style.color = 'var(--brand-accent)')}
                onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-body)')}
              >
                Contact
              </Link>
            </div>

            {/* ── Navbar Search ── */}
            {tenant?.id && (
              <div className="hidden md:block">
                <NavbarSearch tenantId={tenant.id} />
              </div>
            )}

            {/* ── Auth / User ── */}
            <div className="hidden md:flex items-center gap-3">
              {/* Cart icon */}
              <Link
                to="/cart"
                className="relative p-2 rounded transition-colors"
                style={{ color: 'var(--text-body)' }}
                onMouseOver={(e) => (e.currentTarget.style.color = 'var(--brand-accent)')}
                onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-body)')}
                aria-label="Cart"
              >
                <ShoppingCart className="w-5 h-5" />
                {totalItems > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 rounded-full text-white flex items-center justify-center font-bold"
                    style={{
                      backgroundColor: 'var(--brand-accent)',
                      fontSize: '10px',
                      minWidth: '18px',
                      height: '18px',
                      lineHeight: '18px',
                      textAlign: 'center',
                      padding: '0 4px',
                    }}
                  >
                    {totalItems}
                  </span>
                )}
              </Link>
              {!session ? (
                <>
                  <Link
                    to="/login"
                    className="px-4 py-2 text-sm font-medium rounded transition-all border border-transparent"
                    style={{ color: 'var(--brand-primary)' }}
                    onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--brand-primary)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.borderColor = 'transparent'; }}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-2 text-sm font-semibold rounded text-white transition-all active:scale-95"
                    style={{ backgroundColor: 'var(--brand-accent)', borderRadius: '6px' }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--brand-accent-hover)')}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'var(--brand-accent)')}
                  >
                    Register
                  </Link>
                </>
              ) : (
                <div ref={userMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((v) => !v)}
                    className="flex items-center gap-2 rounded-full focus:outline-none"
                    aria-label="User menu"
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                      style={{ backgroundColor: 'var(--brand-primary)' }}
                    >
                      {initials}
                    </div>
                  </button>

                  {userMenuOpen && (
                    <div
                      className="absolute right-0 top-full mt-2 w-52 bg-white rounded-lg shadow-xl border z-50 py-1"
                      style={{ borderColor: 'var(--bg-border)' }}
                    >
                      <div className="px-4 py-2 border-b" style={{ borderColor: 'var(--bg-border)' }}>
                        <p className="text-xs font-semibold" style={{ color: 'var(--text-heading)' }}>
                          {userProfile?.full_name || 'My Account'}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                          {session.user.email}
                        </p>
                      </div>
                      {[
                        { to: '/account', icon: <User className="w-4 h-4" />, label: 'My Account' },
                        { to: '/account/orders', icon: <Package className="w-4 h-4" />, label: 'My Orders' },
                        { to: '/account/downloads', icon: <Download className="w-4 h-4" />, label: 'Downloads' },
                      ].map(({ to, icon, label }) => (
                        <Link
                          key={to}
                          to={to}
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 text-sm transition-colors"
                          style={{ color: 'var(--text-body)' }}
                          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
                          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          {icon}
                          {label}
                        </Link>
                      ))}
                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 text-sm transition-colors"
                          style={{ color: 'var(--brand-accent)' }}
                          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
                          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <Settings className="w-4 h-4" />
                          Admin Panel
                        </Link>
                      )}
                      <div className="border-t my-1" style={{ borderColor: 'var(--bg-border)' }} />
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors"
                        style={{ color: 'var(--status-dissolved)' }}
                        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
                        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Mobile cart + hamburger ── */}
            <div className="md:hidden flex items-center gap-1">
              <Link
                to="/cart"
                className="relative p-2 rounded transition-colors"
                style={{ color: 'var(--text-body)' }}
                aria-label="Cart"
              >
                <ShoppingCart className="w-5 h-5" />
                {totalItems > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 rounded-full text-white flex items-center justify-center font-bold"
                    style={{
                      backgroundColor: 'var(--brand-accent)',
                      fontSize: '10px',
                      minWidth: '18px',
                      height: '18px',
                      lineHeight: '18px',
                      textAlign: 'center',
                      padding: '0 4px',
                    }}
                  >
                    {totalItems}
                  </span>
                )}
              </Link>
              <button
                type="button"
                onClick={() => setMobileOpen((v) => !v)}
                className="p-2 rounded"
                style={{ color: 'var(--text-body)' }}
                aria-label="Toggle mobile menu"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Mobile slide-in menu ── */}
      {mobileOpen && (
        <MobileMenu
          tenant={tenant}
          session={session}
          reportProducts={reportProducts}
          certProducts={certProducts}
          onClose={() => setMobileOpen(false)}
          onSignOut={handleSignOut}
        />
      )}
    </>
  );
}

// ── Collapsible section for mobile ───────────────────────────
function MobileAccordion({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b" style={{ borderColor: 'var(--bg-border)' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full py-3 text-sm font-medium"
        style={{ color: 'var(--text-heading)' }}
      >
        {title}
        <ChevronDown
          className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
          style={{ color: 'var(--text-muted)' }}
        />
      </button>
      {open && <div className="pb-3 space-y-0.5">{children}</div>}
    </div>
  );
}

// ── Mobile menu component ────────────────────────────────────
function MobileMenu({
  tenant,
  session,
  reportProducts,
  certProducts,
  onClose,
  onSignOut,
}: {
  tenant: ReturnType<typeof useTenant>['tenant'];
  session: { user: { email?: string; id: string } } | null;
  reportProducts: Product[];
  certProducts: Product[];
  onClose: () => void;
  onSignOut: () => void;
}) {
  const mobileLinkClass = 'flex items-center gap-2 py-2 pl-2 text-sm rounded transition-colors';

  return (
    <div className="md:hidden fixed inset-0 z-40" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="absolute right-0 top-0 h-full w-72 bg-white shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 h-16 border-b shrink-0"
          style={{ borderColor: 'var(--bg-border)' }}
        >
          <span className="font-bold" style={{ color: 'var(--brand-primary)' }}>
            {tenant?.brand_name ?? 'Companies House'}
          </span>
          <button type="button" onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pt-3 pb-4">
          {/* Top links */}
          {[
            { to: '/', label: 'Home' },
            { to: '/company/search', label: 'Search Companies' },
            { to: '/pricing', label: 'Pricing' },
          ].map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              onClick={onClose}
              className="block py-2.5 text-sm font-medium border-b"
              style={{ color: 'var(--text-body)', borderColor: 'var(--bg-border)' }}
            >
              {label}
            </Link>
          ))}

          {/* Reports accordion */}
          {reportProducts.length > 0 && (
            <MobileAccordion title={`Reports (${reportProducts.length})`}>
              {reportProducts.map((p) => (
                <Link
                  key={p.id}
                  to={`/report?type=${p.slug}`}
                  onClick={onClose}
                  className={mobileLinkClass}
                  style={{ color: 'var(--text-body)' }}
                >
                  <span className="text-sm">📋</span>
                  <span className="truncate">{p.name}</span>
                </Link>
              ))}
            </MobileAccordion>
          )}

          {/* Certificates accordion */}
          {certProducts.length > 0 && (
            <MobileAccordion title={`Certificates (${certProducts.length})`}>
              {certProducts.map((p) => (
                <Link
                  key={p.id}
                  to={`/report?type=${p.slug}`}
                  onClick={onClose}
                  className={mobileLinkClass}
                  style={{ color: 'var(--text-body)' }}
                >
                  <span className="text-sm">📄</span>
                  <span className="truncate">{p.name}</span>
                </Link>
              ))}
            </MobileAccordion>
          )}

          {/* Register accordion */}
          <MobileAccordion title="Register a Company">
            <Link to="/company-set-up" onClick={onClose} className={mobileLinkClass} style={{ color: 'var(--text-body)' }}>
              <span className="text-sm">🏢</span> Company Set Up
            </Link>
            <Link to="/business-name-approval" onClick={onClose} className={mobileLinkClass} style={{ color: 'var(--text-body)' }}>
              <span className="text-sm">✅</span> Business Name Approval
            </Link>
          </MobileAccordion>

          {/* Bottom links */}
          {[
            { to: '/about', label: 'About' },
            { to: '/contact', label: 'Contact' },
          ].map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              onClick={onClose}
              className="block py-2.5 text-sm font-medium border-b"
              style={{ color: 'var(--text-body)', borderColor: 'var(--bg-border)' }}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Footer auth */}
        <div className="p-5 border-t space-y-2 shrink-0" style={{ borderColor: 'var(--bg-border)' }}>
          {!session ? (
            <>
              <Link
                to="/login"
                onClick={onClose}
                className="block w-full text-center py-2.5 text-sm font-medium border rounded"
                style={{ borderColor: 'var(--brand-primary)', color: 'var(--brand-primary)', borderRadius: '6px' }}
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={onClose}
                className="block w-full text-center py-2.5 text-sm font-semibold text-white rounded"
                style={{ backgroundColor: 'var(--brand-accent)', borderRadius: '6px' }}
              >
                Register
              </Link>
            </>
          ) : (
            <button
              type="button"
              onClick={onSignOut}
              className="block w-full text-center py-2.5 text-sm font-medium border rounded"
              style={{ borderColor: 'var(--bg-border)', color: 'var(--status-dissolved)', borderRadius: '6px' }}
            >
              Sign Out
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
