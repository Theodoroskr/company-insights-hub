import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const CREDIT_BUNDLES = [
  { tier: 'starter', name: 'Starter', pay: 250, bonusPct: 5, bonus: 12.5 },
  { tier: 'professional', name: 'Professional', pay: 500, bonusPct: 10, bonus: 50 },
  { tier: 'corporate', name: 'Corporate', pay: 1000, bonusPct: 15, bonus: 150 },
] as const;

export interface BillingAccount {
  user_id: string;
  company_name: string;
  vat_number: string | null;
  expected_monthly_spend: number | null;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  monthly_limit_eur: number;
  payment_terms_days: number;
  po_required: boolean;
}

/** Wallet balance, enterprise account and unbilled on-account spend for the signed-in user. */
export function useBilling() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [account, setAccount] = useState<BillingAccount | null>(null);
  const [unbilled, setUnbilled] = useState(0);

  const refresh = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id ?? null;
    setUserId(uid);
    if (!uid) { setLoading(false); return; }
    const sb = supabase as any;
    const [w, a, o] = await Promise.all([
      sb.from('user_wallets').select('balance_eur, expires_at').eq('user_id', uid).maybeSingle(),
      sb.from('billing_accounts').select('*').eq('user_id', uid).maybeSingle(),
      sb.from('orders').select('total').eq('user_id', uid).eq('payment_method', 'invoice').is('monthly_invoice_id', null).neq('status', 'cancelled'),
    ]);
    setBalance(Number(w.data?.balance_eur ?? 0));
    setExpiresAt(w.data?.expires_at ?? null);
    setAccount(a.data ?? null);
    setUnbilled((o.data ?? []).reduce((s: number, r: any) => s + Number(r.total), 0));
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const accountApproved = account?.status === 'approved';
  const availableOnAccount = accountApproved ? Math.max(0, Number(account!.monthly_limit_eur) - unbilled) : 0;
  const creditExpired = !!expiresAt && new Date(expiresAt).getTime() < Date.now();
  return { loading, userId, balance, expiresAt, creditExpired, account, accountApproved, unbilled, availableOnAccount, refresh };
}
