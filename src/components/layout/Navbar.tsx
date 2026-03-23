import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown, User, LogOut, Settings, Package, Download, ShoppingCart } from 'lucide-react';
import { useTenant } from '../../lib/tenant';
import { supabase } from '../../lib/supabase';
import { useCart } from '../../contexts/CartContext';
import type { Product } from '../../types/database';

const PRODUCT_TYPE_ICONS: Record<string, string> = {
  structure:   '📋',
  kyb:         '🔍',
  certificate: '📄',
  monitoring:  '👁',
  extract:     '💳',
  credit:      '📊',
};

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  structure:   'Reports',
  kyb:         'KYB & Compliance',
  certificate: 'Certificates',
  monitoring:  'Monitoring',
  extract:     'Extracts',
  credit:      'Credit Reports',
};

export default function Navbar() {
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const { totalItems } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [session, setSession] = useState<null | { user: { email?: string; id: string } }>(null);
  const [userProfile, setUserProfile] = useState<{ full_name?: string; role?: string } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const productsRef = useRef<HTMLDivElement>(null);
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
      if (productsRef.current && !productsRef.current.contains(e.target as Node)) {
        setProductsOpen(false);
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

  const isAdmin =
    userProfile?.role === 'admin' || userProfile?.role === 'super_admin';

  const initials = userProfile?.full_name
    ? userProfile.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : (session?.user?.email?.[0] ?? 'U').toUpperCase();

  // Group products by type
  const grouped = products.reduce<Record<string, Product[]>>((acc, p) => {
    if (!acc[p.type]) acc[p.type] = [];
    acc[p.type].push(p);
    return acc;
  }, {});

  return (
    <>
      <nav
        className="sticky top-0 z-50 bg-white"
        style={{ borderBottom: '1px solid var(--bg-border)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* ── Logo ── */}
            <Link
              to="/"
              className="flex-shrink-0 font-bold text-lg tracking-tight"
              style={{ color: 'var(--brand-primary)', fontSize: '1.1rem' }}
            >
              {tenant?.brand_name ?? 'Companies House'}
            </Link>

            {/* ── Desktop nav ── */}
            <div className="hidden md:flex items-center gap-6">

              {/* Products dropdown */}
              <div ref={productsRef} className="relative">
                <button
                  type="button"
                  onClick={() => setProductsOpen((v) => !v)}
                  className="flex items-center gap-1 text-sm font-medium transition-colors"
                  style={{ color: 'var(--text-body)' }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.color = 'var(--brand-accent)')
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.color = productsOpen ? 'var(--brand-accent)' : 'var(--text-body)')
                  }
                >
                  Products
                  <ChevronDown className={`w-4 h-4 transition-transform ${productsOpen ? 'rotate-180' : ''}`} />
                </button>

                {productsOpen && (
                  <div
                    className="absolute left-0 top-full mt-2 w-72 bg-white rounded-lg shadow-xl border z-50 py-2"
                    style={{ borderColor: 'var(--bg-border)' }}
                  >
                    {Object.entries(grouped).map(([type, typeProducts]) => (
                      <div key={type}>
                        <p
                          className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {PRODUCT_TYPE_LABELS[type] ?? type}
                        </p>
                        {typeProducts.map((p) => (
                          <Link
                            key={p.id}
                            to={`/report?type=${p.slug}`}
                            onClick={() => setProductsOpen(false)}
                            className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                            style={{ color: 'var(--text-body)' }}
                          >
                            <span>{PRODUCT_TYPE_ICONS[p.type] ?? '📋'}</span>
                            <span>{p.name}</span>
                          </Link>
                        ))}
                      </div>
                    ))}
                    {products.length === 0 && (
                      <p className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                        No products available
                      </p>
                    )}
                  </div>
                )}
              </div>

              <Link
                to="/about"
                className="text-sm font-medium transition-colors"
                style={{ color: 'var(--text-body)' }}
                onMouseOver={(e) => (e.currentTarget.style.color = 'var(--brand-accent)')}
                onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-body)')}
              >
                About
              </Link>

              <Link
                to="/contact"
                className="text-sm font-medium transition-colors"
                style={{ color: 'var(--text-body)' }}
                onMouseOver={(e) => (e.currentTarget.style.color = 'var(--brand-accent)')}
                onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-body)')}
              >
                Contact
              </Link>
            </div>

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
                    className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 rounded-full text-white flex items-center justify-center font-bold"
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
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = 'var(--brand-primary)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = 'transparent';
                    }}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-2 text-sm font-semibold rounded text-white transition-all active:scale-95"
                    style={{ backgroundColor: 'var(--brand-accent)', borderRadius: '6px' }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.backgroundColor = 'var(--brand-accent-hover)')
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.backgroundColor = 'var(--brand-accent)')
                    }
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
                          className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                          style={{ color: 'var(--text-body)' }}
                        >
                          {icon}
                          {label}
                        </Link>
                      ))}
                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                          style={{ color: 'var(--brand-accent)' }}
                        >
                          <Settings className="w-4 h-4" />
                          Admin Panel
                        </Link>
                      )}
                      <div className="border-t my-1" style={{ borderColor: 'var(--bg-border)' }} />
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                        style={{ color: 'var(--status-dissolved)' }}
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Mobile hamburger ── */}
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden p-2 rounded"
              style={{ color: 'var(--text-body)' }}
              aria-label="Toggle mobile menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile slide-in menu ── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40"
          onClick={() => setMobileOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute right-0 top-0 h-full w-72 bg-white shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between px-5 h-16 border-b"
              style={{ borderColor: 'var(--bg-border)' }}
            >
              <span className="font-bold" style={{ color: 'var(--brand-primary)' }}>
                {tenant?.brand_name ?? 'Companies House'}
              </span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                style={{ color: 'var(--text-muted)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 px-5 space-y-2">
              {[
                { to: '/', label: 'Home' },
                { to: '/company/search', label: 'Search Companies' },
                { to: '/about', label: 'About' },
                { to: '/contact', label: 'Contact' },
              ].map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className="block py-2 text-sm font-medium"
                  style={{ color: 'var(--text-body)' }}
                >
                  {label}
                </Link>
              ))}

              {products.length > 0 && (
                <div>
                  <p className="py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Products
                  </p>
                  {products.map((p) => (
                    <Link
                      key={p.id}
                      to={`/report?type=${p.slug}`}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2 py-2 text-sm"
                      style={{ color: 'var(--text-body)' }}
                    >
                      <span>{PRODUCT_TYPE_ICONS[p.type] ?? '📋'}</span>
                      {p.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div
              className="p-5 border-t space-y-2"
              style={{ borderColor: 'var(--bg-border)' }}
            >
              {!session ? (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="block w-full text-center py-2.5 text-sm font-medium border rounded"
                    style={{
                      borderColor: 'var(--brand-primary)',
                      color: 'var(--brand-primary)',
                      borderRadius: '6px',
                    }}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileOpen(false)}
                    className="block w-full text-center py-2.5 text-sm font-semibold text-white rounded"
                    style={{ backgroundColor: 'var(--brand-accent)', borderRadius: '6px' }}
                  >
                    Register
                  </Link>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="block w-full text-center py-2.5 text-sm font-medium border rounded"
                  style={{
                    borderColor: 'var(--bg-border)',
                    color: 'var(--status-dissolved)',
                    borderRadius: '6px',
                  }}
                >
                  Sign Out
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
