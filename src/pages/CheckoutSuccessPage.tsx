import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { CheckCircle } from 'lucide-react';
import PageLayout from '../components/layout/PageLayout';
import { useTenant } from '../lib/tenant';

interface SuccessData {
  orderRef: string;
  email: string;
  slaHours: number;
  isInstant: boolean;
}

export default function CheckoutSuccessPage() {
  const { tenant } = useTenant();
  const [data, setData] = useState<SuccessData | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('checkout_success');
    if (raw) {
      setData(JSON.parse(raw));
      sessionStorage.removeItem('checkout_success');
    }
  }, []);

  const orderRef = data?.orderRef ?? `ICG-${new Date().getFullYear()}-XXXX`;
  const email = data?.email ?? 'your email';
  const slaHours = data?.slaHours ?? 24;
  const isInstant = data?.isInstant ?? false;

  return (
    <PageLayout>
      <Helmet>
        <title>Order Confirmed | {tenant?.brand_name ?? 'Companies House'}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        {/* Animated check */}
        <div className="flex justify-center mb-6">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center animate-fade-in-up"
            style={{ backgroundColor: '#f0fdf4' }}
          >
            <CheckCircle className="w-12 h-12" style={{ color: 'var(--status-active)' }} />
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-heading)' }}>
          Order Confirmed!
        </h1>

        <p className="text-base mb-1" style={{ color: 'var(--text-muted)' }}>
          Order reference:{' '}
          <span className="font-semibold" style={{ color: 'var(--text-heading)' }}>
            #{orderRef}
          </span>
        </p>

        <div
          className="mt-5 mb-6 rounded-lg p-5 text-sm space-y-2 text-left"
          style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--bg-border)' }}
        >
          <div className="flex gap-3">
            <span>📧</span>
            <span style={{ color: 'var(--text-body)' }}>
              Your report will be delivered to{' '}
              <strong>{email}</strong>
            </span>
          </div>
          <div className="flex gap-3">
            <span>📅</span>
            <span style={{ color: 'var(--text-body)' }}>
              Download link valid for <strong>30 days</strong> from delivery
            </span>
          </div>
          <div className="flex gap-3">
            <span>{isInstant ? '⚡' : '🕐'}</span>
            <span style={{ color: 'var(--text-body)' }}>
              Estimated delivery:{' '}
              <strong>{isInstant ? 'Instant' : `${slaHours} hours`}</strong>
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/account/orders"
            className="px-5 py-2.5 rounded text-sm font-semibold text-white transition-all active:scale-95"
            style={{ backgroundColor: 'var(--brand-accent)', borderRadius: '6px' }}
          >
            Track my order →
          </Link>
          <Link
            to="/"
            className="px-5 py-2.5 rounded text-sm font-medium border transition-all active:scale-95"
            style={{
              borderColor: 'var(--bg-border)',
              color: 'var(--text-body)',
              backgroundColor: '#fff',
            }}
          >
            Order another report
          </Link>
        </div>
      </div>
    </PageLayout>
  );
}
