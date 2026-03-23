import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/lib/tenant';
import PageLayout from '@/components/layout/PageLayout';

export default function ForgotPasswordPage() {
  const { tenant } = useTenant();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const redirectTo = tenant?.domain
    ? `https://${tenant.domain}/reset-password`
    : `${window.location.origin}/reset-password`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSuccess(true);
  };

  return (
    <PageLayout>
      <Helmet>
        <title>Reset Password | {tenant?.brand_name ?? 'Companies House'}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div
        className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12"
        style={{ backgroundColor: 'var(--bg-subtle)' }}
      >
        <div
          className="w-full max-w-md bg-white rounded-xl border shadow-sm p-8"
          style={{ borderColor: 'var(--bg-border)' }}
        >
          {/* Header */}
          <p className="text-xl font-bold text-center mb-1" style={{ color: 'var(--brand-primary)' }}>
            {tenant?.brand_name ?? 'Companies House'}
          </p>
          <p className="text-sm text-center mb-1 font-semibold" style={{ color: 'var(--text-heading)' }}>
            Reset your password
          </p>
          <p className="text-sm text-center mb-8" style={{ color: 'var(--text-muted)' }}>
            Enter your email and we'll send a reset link
          </p>

          {success ? (
            <div>
              <div className="flex justify-center mb-4">
                <CheckCircle2 className="w-12 h-12" style={{ color: 'var(--status-active)' }} />
              </div>
              <div
                className="rounded-lg px-4 py-4 text-sm text-center mb-6"
                style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' }}
              >
                <p className="font-medium mb-1">Reset link sent to {email}</p>
                <p>Check your inbox and click the link to set a new password.</p>
              </div>
              <p className="text-center">
                <Link to="/login" className="text-sm" style={{ color: 'var(--brand-accent)' }}>
                  ← Back to Sign In
                </Link>
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 text-sm rounded-lg px-4 py-3" style={{ color: '#dc2626', backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-body)' }}>
                    Email address
                  </label>
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none transition-all"
                    style={{ borderColor: 'var(--bg-border)', color: 'var(--text-body)' }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--brand-accent)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--bg-border)')}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white rounded-lg transition-opacity disabled:opacity-70"
                  style={{ backgroundColor: 'var(--brand-accent)' }}
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>

              <p className="text-sm text-center mt-6">
                <Link to="/login" style={{ color: 'var(--brand-accent)' }}>
                  ← Back to Sign In
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
