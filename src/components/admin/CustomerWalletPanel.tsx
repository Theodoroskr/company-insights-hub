import React, { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { formatEur } from '@/lib/pricing';
import { toast } from '@/hooks/use-toast';

const sb = supabase as any;

/** Live wallet balance, ledger and manual adjust form for one customer (staff only). */
export default function CustomerWalletPanel({ userId, onChanged }: { userId: string; onChanged?: () => void }) {
  const [wallet, setWallet] = useState<{ balance_eur: number; expires_at: string | null } | null>(null);
  const [tx, setTx] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [w, t] = await Promise.all([
      sb.from('user_wallets').select('balance_eur, expires_at').eq('user_id', userId).maybeSingle(),
      sb.from('wallet_transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
    ]);
    setWallet(w.data ?? null);
    setTx(t.data ?? []);
  }, [userId]);
  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    const n = Number(amount);
    if (!n) return toast({ title: 'Enter a non-zero amount', variant: 'destructive' });
    if (reason.trim().length < 3) return toast({ title: 'A reason is required', variant: 'destructive' });
    setBusy(true);
    const { error } = await sb.rpc('admin_adjust_user_wallet', { _user_id: userId, _amount: n, _reason: reason.trim() });
    setBusy(false);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    toast({ title: `Balance ${n > 0 ? 'credited' : 'debited'} ${formatEur(Math.abs(n))}` });
    setAmount(''); setReason(''); setOpen(false);
    load(); onChanged?.();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs text-muted-foreground">Current balance</div>
          <div className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text-heading)' }}>{formatEur(Number(wallet?.balance_eur ?? 0))}</div>
          <div className="text-xs text-muted-foreground">Expires: {wallet?.expires_at ? format(new Date(wallet.expires_at), 'd MMM yyyy') : 'No expiry'}</div>
        </div>
        <button onClick={() => setOpen((o) => !o)} className="px-3 py-1.5 rounded text-xs font-semibold text-primary-foreground" style={{ backgroundColor: 'var(--brand-accent)' }}>
          Adjust balance
        </button>
      </div>

      {open && (
        <div className="border rounded-lg p-3 space-y-2 bg-muted/20">
          <label className="block text-xs text-muted-foreground">Amount € (use minus to debit, e.g. -50)</label>
          <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm bg-background" />
          <label className="block text-xs text-muted-foreground">Reason (saved in the ledger and audit log)</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="e.g. Refund for order ICG-2026-1234" className="w-full border rounded px-2 py-1.5 text-sm bg-background" />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setOpen(false)} className="text-xs px-3 py-1.5">Cancel</button>
            <button disabled={busy} onClick={submit} className="text-xs px-3 py-1.5 rounded font-semibold text-primary-foreground disabled:opacity-50" style={{ backgroundColor: 'var(--brand-accent)' }}>
              {busy ? 'Saving…' : 'Confirm'}
            </button>
          </div>
        </div>
      )}

      <div>
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Transactions</div>
        {tx.length === 0 ? <p className="text-sm text-muted-foreground">No activity yet</p> : (
          <div className="divide-y text-sm">
            {tx.map((t) => (
              <div key={t.id} className="py-2 flex justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium capitalize">{t.type}{t.bundle ? ` · ${t.bundle}` : ''}</div>
                  <div className="text-xs text-muted-foreground truncate">{t.note ?? ''}</div>
                  <div className="text-xs text-muted-foreground">{format(new Date(t.created_at), 'd MMM yyyy HH:mm')}</div>
                </div>
                <div className="text-right tabular-nums">
                  <div className={Number(t.amount_eur) < 0 ? 'text-destructive' : ''}>{Number(t.amount_eur) > 0 ? '+' : ''}{formatEur(Number(t.amount_eur))}</div>
                  <div className="text-xs text-muted-foreground">Bal. {formatEur(Number(t.balance_after))}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
