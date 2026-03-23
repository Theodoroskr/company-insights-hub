import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/lib/tenant';
import PageLayout from '@/components/layout/PageLayout';

export default function LoginPage() {
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  const returnTo =
    searchParams.get('returnTo') ||
    (location.state as { from?: { pathname: string } })?.from?.pathname ||
    '/account';

  function friendlyError(msg: string): string {
    if (msg.includes('Invalid login credentials')) return 'Incorrect email or password.';
    if (msg.includes('Email not confirmed')) return 'EMAIL_NOT_CONFIRMED';
    return msg;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setUnconfirmed(false);
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      const friendly = friendlyError(err.message);
      if (friendly === 'EMAIL_NOT_CONFIRMED') {
        setUnconfirmed(true);
      } else {
        setError(friendly);
      }
      return;
    }
    navigate(returnTo, { replace: true });
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${returnTo}` },
    });
    setGoogleLoading(false);
  };

  const handleResend = async () => {
    if (!email) return;
    await supabase.auth.resend({ type: 'signup', email });
    setResendSent(true);
  };

  const inputClass =
    'block w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all';

  return (
    <PageLayout>
      <Helmet>
        <title>Sign In | {tenant?.brand_name ?? 'Companies House'}</title>
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
          <p className="text-sm text-center mb-8" style={{ color: 'var(--text-muted)' }}>
            Sign in to your account
          </p>

          {/* Error */}
          {error && (
            <div className="mb-4 text-sm rounded-lg px-4 py-3" style={{ color: '#dc2626', backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
              {error}
            </div>
          )}

          {/* Email not confirmed */}
          {unconfirmed && (
            <div className="mb-4 text-sm rounded-lg px-4 py-3" style={{ color: '#92400e', backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
              <p>Please verify your email first. Check your inbox.</p>
              {resendSent ? (
                <p className="mt-1 font-medium">Verification email sent!</p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  className="mt-1 font-medium underline"
                  style={{ color: 'var(--brand-accent)' }}
                >
                  Resend verification email
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Email */}
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
                className={inputClass}
                style={{
                  borderColor: 'var(--bg-border)',
                  color: 'var(--text-body)',
                  '--tw-ring-color': 'var(--brand-accent)',
                } as React.CSSProperties}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--brand-accent)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--bg-border)')}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-body)' }}>
                Password
              </label>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                style={{ borderColor: 'var(--bg-border)', color: 'var(--text-body)' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--brand-accent)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--bg-border)')}
              />
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-body)' }}>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="rounded"
                />
                Remember me
              </label>
              <Link to="/forgot-password" className="text-sm" style={{ color: 'var(--brand-accent)' }}>
                Forgot password?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white rounded-lg transition-opacity disabled:opacity-70 mt-2"
              style={{ backgroundColor: 'var(--brand-accent)' }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--bg-border)' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>or</span>
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--bg-border)' }} />
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-2.5 text-sm font-medium border rounded-lg transition-colors hover:bg-gray-50 disabled:opacity-70"
            style={{ borderColor: 'var(--bg-border)', color: 'var(--text-body)' }}
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M47.5 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h13.2c-.6 3-2.3 5.6-5 7.3v6h8c4.7-4.3 7.3-10.7 7.3-17.5z" fill="#4285F4" />
                <path d="M24 48c6.5 0 12-2.1 16-5.8l-8-6c-2.2 1.5-5 2.4-8 2.4-6.1 0-11.3-4.1-13.1-9.7H2.5v6.2C6.5 42.8 14.7 48 24 48z" fill="#34A853" />
                <path d="M10.9 28.9c-.5-1.5-.8-3-.8-4.9s.3-3.4.8-4.9v-6.2H2.5C.9 16.3 0 20 0 24s.9 7.7 2.5 11.1l8.4-6.2z" fill="#FBBC05" />
                <path d="M24 9.5c3.4 0 6.5 1.2 8.9 3.5l6.6-6.6C35.9 2.4 30.4 0 24 0 14.7 0 6.5 5.2 2.5 12.9l8.4 6.2C12.7 13.6 17.9 9.5 24 9.5z" fill="#EA4335" />
              </svg>
            )}
            Continue with Google
          </button>

          {/* Bottom link */}
          <p className="text-sm text-center mt-6" style={{ color: 'var(--text-muted)' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--brand-accent)' }}>
              Register here
            </Link>
          </p>
        </div>
      </div>
    </PageLayout>
  );
}
