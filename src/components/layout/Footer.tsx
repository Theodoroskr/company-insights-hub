import React from 'react';
import { Link } from 'react-router-dom';
import { useTenant } from '../../lib/tenant';
import BrandMark from './BrandMark';

export default function Footer() {
  const { tenant } = useTenant();
  const year = new Date().getFullYear();

  return (
    <footer
      className="relative overflow-hidden"
      style={{
        background:
          'linear-gradient(135deg, #1B3A6B 0%, #0F2444 55%, #0a1830 100%)',
        color: 'var(--text-inverse)',
      }}
    >
      {/* Multi-color radial accents — match country hero palette */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(60% 80% at 12% 0%, rgba(56,189,248,0.22), transparent 60%),
            radial-gradient(50% 70% at 88% 10%, rgba(16,185,129,0.18), transparent 65%),
            radial-gradient(70% 90% at 100% 100%, rgba(236,72,153,0.15), transparent 60%),
            radial-gradient(50% 70% at 0% 100%, rgba(245,158,11,0.12), transparent 60%)
          `,
        }}
      />
      {/* Subtle dot grid */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        {/* Top row */}
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}
        >
          <div>
            <BrandMark
              brandName={tenant?.brand_name ?? 'Companies House'}
              variant="dark"
              size="lg"
            />
            <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Professional company intelligence, delivered digitally.
            </p>
          </div>

          {/* Decorative color dots — echo country tier colors */}
          <div className="hidden sm:flex items-center gap-2" aria-hidden>
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#10b981', boxShadow: '0 0 12px rgba(16,185,129,0.6)' }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#f59e0b', boxShadow: '0 0 12px rgba(245,158,11,0.6)' }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#ef4444', boxShadow: '0 0 12px rgba(239,68,68,0.6)' }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#38bdf8', boxShadow: '0 0 12px rgba(56,189,248,0.6)' }} />
          </div>
        </div>

        {/* Middle row — links */}
        <div className="py-8" style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            {[
              { to: '/about', label: 'About' },
              { to: '/contact', label: 'Contact' },
              { to: '/terms', label: 'Terms of Service' },
              { to: '/privacy', label: 'Privacy Policy' },
              { to: '/sample', label: 'Sample Report' },
            ].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="text-sm transition-colors"
                style={{ color: 'rgba(255,255,255,0.78)' }}
                onMouseOver={(e) => (e.currentTarget.style.color = '#fff')}
                onMouseOut={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.78)')}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom row */}
        <div className="pt-8 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
            © {year} {tenant?.brand_name ?? 'Companies House'}. All rights reserved.
          </p>
          {tenant?.footer_disclaimer && (
            <p
              className="text-xs max-w-md text-right"
              style={{ color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}
            >
              {tenant.footer_disclaimer}
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}
