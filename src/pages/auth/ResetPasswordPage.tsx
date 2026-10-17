import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import PageLayout from '@/components/layout/PageLayout';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) return setError(err.message);
    navigate('/account');
  };

  return (
    <PageLayout>
      <Helmet><title>Set new password</title><meta name="robots" content="noindex" /></Helmet>
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12" style={{ backgroundColor: 'var(--bg-subtle)' }}>
        <form onSubmit={submit} className="w-full max-w-md bg-card rounded-xl border shadow-sm p-8 space-y-4" style={{ borderColor: 'var(--bg-border)' }}>
          <h1 className="text-xl font-bold text-center" style={{ color: 'var(--text-heading)' }}>Set a new password</h1>
          {!ready ? (
            <p className="text-sm text-center text-muted-foreground">Open this page from the link in your reset email. If the link expired, request a new one from "Forgot password".</p>
          ) : (
            <>
              <input type="password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm" />
              <input type="password" placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm" />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button type="submit" disabled={loading} className="w-full rounded-md py-2 text-sm font-semibold text-primary-foreground flex justify-center" style={{ backgroundColor: 'var(--brand-primary)' }}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save password'}
              </button>
            </>
          )}
        </form>
      </div>
    </PageLayout>
  );
}
