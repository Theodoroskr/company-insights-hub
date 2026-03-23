import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/lib/tenant';
import PageLayout from '@/components/layout/PageLayout';

export default function RegisterPage() {
  const { tenant } = useTenant();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'Full name is required.';
    if (!email.trim()) errs.email = 'Email is required.';
    if (password.length < 8) errs.password = 'Password must be at least 8 characters.';
    if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match.';
    if (!agreed) errs.agreed = 'You must accept the Terms and Conditions.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setLoading(true);
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/account`,
      },
    });
    setLoading(false);
    if (err) {
      if (err.message.includes('User already registered') || err.message.includes('already been registered')) {
        setError('An account with this email already exists. Sign in instead.');
      } else {
        setError(err.message);
      }
      return;
    }
    setSuccess(true);
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/account` },
    });
    setGoogleLoading(false);
  };

  const handleResend = async () => {
    await supabase.auth.resend({ type: 'signup', email });
    setResendSent(true);
  };

  const inputClass =
    'block w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none transition-all';

  const fieldClass = (field: string) =>
    `${inputClass} ${fieldErrors[field] ? 'border-red-400' : ''}`;

  if (success) {
    return (
      <PageLayout>
        <Helmet>
          <title>Create Account | {tenant?.brand_name ?? 'Companies House'}</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <div
          className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12"
          style={{ backgroundColor: 'var(--bg-subtle)' }}
        >
          <div
            className="w-full max-w-md bg-white rounded-xl border shadow-sm p-8 text-center"
            style={{ borderColor: 'var(--bg-border)' }}
          >
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="w-14 h-14" style={{ color: 'var(--status-active)' }} />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-heading)' }}>
              Account created! Check your email
            </h2>
            <p className="text-sm mb-1" style={{ color: 'var(--text-body)' }}>
              We sent a verification link to <strong>{email}</strong>
            </p>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              Click the link in the email to activate your account.
            </p>
            {resendSent ? (
              <p className="text-sm font-medium" style={{ color: 'var(--status-active)' }}>
                Verification email resent!
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="text-sm underline"
                style={{ color: 'var(--brand-accent)' }}
              >
                Resend verification email
              </button>
            )}
            <div className="mt-6">
              <Link to="/login" className="text-sm" style={{ color: 'var(--brand-accent)' }}>
                ← Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Helmet>
        <title>Create Account | {tenant?.brand_name ?? 'Companies House'}</title>
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
          <p className="text-sm text-center mb-2" style={{ color: 'var(--text-heading)' }}>
            Create your account
          </p>
          <p className="text-sm text-center mb-8" style={{ color: 'var(--text-muted)' }}>
            Join {tenant?.brand_name ?? 'us'} to order and track reports
          </p>

          {/* Error */}
          {error && (
            <div className="mb-4 text-sm rounded-lg px-4 py-3" style={{ color: '#dc2626', backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
              {error}{' '}
              {error.includes('already exists') && (
                <Link to="/login" className="font-medium underline" style={{ color: '#dc2626' }}>
                  Sign in instead
                </Link>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-body)' }}>
                Full Name
              </label>
              <input
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={fieldClass('fullName')}
                style={{ borderColor: fieldErrors.fullName ? '#f87171' : 'var(--bg-border)', color: 'var(--text-body)' }}
                onFocus={(e) => { if (!fieldErrors.fullName) e.currentTarget.style.borderColor = 'var(--brand-accent)'; }}
                onBlur={(e) => { if (!fieldErrors.fullName) e.currentTarget.style.borderColor = 'var(--bg-border)'; }}
              />
              {fieldErrors.fullName && <p className="mt-1 text-xs text-red-500">{fieldErrors.fullName}</p>}
            </div>

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
                className={fieldClass('email')}
                style={{ borderColor: fieldErrors.email ? '#f87171' : 'var(--bg-border)', color: 'var(--text-body)' }}
                onFocus={(e) => { if (!fieldErrors.email) e.currentTarget.style.borderColor = 'var(--brand-accent)'; }}
                onBlur={(e) => { if (!fieldErrors.email) e.currentTarget.style.borderColor = 'var(--bg-border)'; }}
              />
              {fieldErrors.email && <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-body)' }}>
                Password
              </label>
              <input
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={fieldClass('password')}
                style={{ borderColor: fieldErrors.password ? '#f87171' : 'var(--bg-border)', color: 'var(--text-body)' }}
                onFocus={(e) => { if (!fieldErrors.password) e.currentTarget.style.borderColor = 'var(--brand-accent)'; }}
                onBlur={(e) => { if (!fieldErrors.password) e.currentTarget.style.borderColor = 'var(--bg-border)'; }}
              />
              <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Minimum 8 characters</p>
              {fieldErrors.password && <p className="text-xs text-red-500">{fieldErrors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-body)' }}>
                Confirm Password
              </label>
              <input
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={fieldClass('confirmPassword')}
                style={{ borderColor: fieldErrors.confirmPassword ? '#f87171' : 'var(--bg-border)', color: 'var(--text-body)' }}
                onFocus={(e) => { if (!fieldErrors.confirmPassword) e.currentTarget.style.borderColor = 'var(--brand-accent)'; }}
                onBlur={(e) => { if (!fieldErrors.confirmPassword) e.currentTarget.style.borderColor = 'var(--bg-border)'; }}
              />
              {fieldErrors.confirmPassword && <p className="mt-1 text-xs text-red-500">{fieldErrors.confirmPassword}</p>}
            </div>

            {/* Terms */}
            <div>
              <label className="flex items-start gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-body)' }}>
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 rounded flex-shrink-0"
                />
                <span>
                  I agree to the{' '}
                  <Link to="/terms" target="_blank" className="underline" style={{ color: 'var(--brand-accent)' }}>
                    Terms and Conditions
                  </Link>
                </span>
              </label>
              {fieldErrors.agreed && <p className="mt-1 text-xs text-red-500">{fieldErrors.agreed}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white rounded-lg transition-opacity disabled:opacity-70 mt-2"
              style={{ backgroundColor: 'var(--brand-accent)' }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Creating account…' : 'Create Account'}
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
            Sign up with Google
          </button>

          {/* Bottom link */}
          <p className="text-sm text-center mt-6" style={{ color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--brand-accent)' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </PageLayout>
  );
}
