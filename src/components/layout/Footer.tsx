import React from 'react';
import { Link } from 'react-router-dom';
import { useTenant } from '../../lib/tenant';
import BrandMark from './BrandMark';

export default function Footer() {
  const { tenant } = useTenant();
  const year = new Date().getFullYear();

  return (
    <footer style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--text-inverse)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Top row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }}
        >
          <div>
            <BrandMark
              brandName={tenant?.brand_name ?? 'Companies House'}
              variant="dark"
              size="lg"
            />
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.65)' }}>
              Professional company intelligence, delivered digitally.
            </p>
          </div>
        </div>

        {/* Middle row — links */}
        <div className="py-8" style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
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
                style={{ color: 'rgba(255,255,255,0.75)' }}
                onMouseOver={(e) => (e.currentTarget.style.color = '#fff')}
                onMouseOut={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.75)')}
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
