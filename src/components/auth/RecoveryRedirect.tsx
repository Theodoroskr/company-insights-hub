import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

/** Sends anyone arriving from a password-reset email to the "Set a new password" page, whichever page the link landed on. */
export default function RecoveryRedirect() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (window.location.hash.includes('type=recovery') && pathname !== '/reset-password') {
      navigate('/reset-password' + window.location.hash, { replace: true });
    }
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' && window.location.pathname !== '/reset-password') {
        navigate('/reset-password', { replace: true });
      }
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
