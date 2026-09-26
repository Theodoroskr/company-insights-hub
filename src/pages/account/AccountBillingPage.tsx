import React, { useEffect, useState } from 'react';
import { Wallet, Building2, Check } from 'lucide-react';
import AccountLayout from '../../components/layout/AccountLayout';
import { supabase } from '@/integrations/supabase/client';
import { CREDIT_BUNDLES, useBilling } from '../../lib/billing';
import { formatEur } from '../../lib/pricing';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';

export default function AccountBillingPage() {
  const b = useBilling();
  const [params] = useSearchParams();
  const picked = params.get('bundle');
  const cart: any = useCart();
  const hasCart = (cart?.items?.length ?? 0) + (cart?.certificateOrders?.length ?? 0) + (cart?.bundleOrders?.length ?? 0) > 0;
  useEffect(() => {
    if (picked) document.getElementById(`bundle-${picked}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [picked]);
  const navigate = useNavigate();
  const [tx, setTx] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  const loadLists = async () => {
    const sb = supabase as any;
    const [t, i] = await Promise.all([
      sb.from('wallet_transactions').select('*').order('created_at', { ascending: false }).limit(50),
      sb.from('monthly_invoices').select('*').order('period_start', { ascending: false }),
    ]);
    setTx(t.data ?? []); setInvoices(i.data ?? []);
  };
  useEffect(() => { loadLists(); }, []);

  const buy = (tier: string) => {
    const bundle = CREDIT_BUNDLES.find((x) => x.tier === tier);
    if (!bundle) return;
    cart.addBundle({ tier: bundle.tier, name: bundle.name, pay: bundle.pay, bonus: bundle.bonus });
    toast({ title: `${bundle.name} bundle added to your cart` });
    navigate('/cart');
  };

  const card = 'rounded-lg border p-5 bg-card';
  const acc = b.account;

  return (
    <AccountLayout>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>Billing & Credits</h1>

        <div className={card}>
          <div className="flex items-center gap-3">
            <Wallet className="w-5 h-5" style={{ color: 'var(--brand-accent)' }} />
            <div>
              <p className="text-xs text-muted-foreground">Prepaid credit balance · valid on every country site</p>
              <p className="text-3xl font-bold" style={{ color: 'var(--text-heading)' }}>{formatEur(b.balance)}</p>
            </div>
          </div>
        </div>

        {hasCart && (
          <div className={card + ' flex flex-col sm:flex-row sm:items-center gap-3'} style={{ borderColor: 'var(--brand-accent)' }}>
            <Check className="w-5 h-5" style={{ color: 'var(--status-active)' }} />
            <p className="flex-1 text-sm">You have items in your cart. Credit is added to your account as soon as payment completes.</p>
            <Link to="/cart" className="px-4 py-2 rounded text-sm font-semibold text-primary-foreground" style={{ backgroundColor: 'var(--brand-accent)' }}>
              Go to cart
            </Link>
          </div>
        )}

        <div>
          <h2 className="font-semibold mb-3" style={{ color: 'var(--text-heading)' }}>Top up with a bundle</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {CREDIT_BUNDLES.map((x) => (
              <div key={x.tier} id={`bundle-${x.tier}`} className={card + ' flex flex-col' + (picked === x.tier ? ' ring-2' : '')} style={(picked ? picked === x.tier : x.tier === 'professional') ? { borderColor: 'var(--brand-accent)', ['--tw-ring-color' as any]: 'var(--brand-accent)' } : undefined}>
                {picked === x.tier && <p className="text-xs font-semibold mb-1" style={{ color: 'var(--brand-accent)' }}>Your selected bundle</p>}
                <p className="text-sm font-semibold" style={{ color: 'var(--brand-accent)' }}>{x.name}</p>
                <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-heading)' }}>{formatEur(x.pay, 0)}</p>
                <p className="text-sm text-muted-foreground mt-1">+{x.bonusPct}% bonus · {formatEur(x.bonus)} extra</p>
                <p className="text-sm mt-2 font-medium">You get {formatEur(x.pay + x.bonus)} credit</p>
                <p className="text-xs text-muted-foreground mt-1">Valid on every country site · valid for one year</p>
                <button onClick={() => buy(x.tier)}
                  className="mt-4 py-2 rounded text-sm font-semibold text-primary-foreground"
                  style={{ backgroundColor: 'var(--brand-accent)' }}>
                  Add to cart
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className={card}>
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-5 h-5" style={{ color: 'var(--brand-accent)' }} />
            <h2 className="font-semibold" style={{ color: 'var(--text-heading)' }}>Enterprise monthly invoicing</h2>
          </div>
          {!b.loading && acc?.status === 'approved' ? (
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div><p className="text-muted-foreground">Monthly limit</p><p className="font-semibold">{formatEur(acc.monthly_limit_eur)}</p></div>
              <div><p className="text-muted-foreground">Used this cycle</p><p className="font-semibold">{formatEur(b.unbilled)}</p></div>
              <div><p className="text-muted-foreground">Payment terms</p><p className="font-semibold">{acc.payment_terms_days} days{acc.po_required ? ' · PO required' : ''}</p></div>
              <p className="sm:col-span-3 text-xs text-muted-foreground flex items-center gap-1"><Check className="w-3.5 h-3.5" />Approved for {acc.company_name}. Choose "Pay on account" at checkout; you receive one invoice at the end of each month.</p>
            </div>
          ) : acc?.status === 'pending' ? (
            <p className="text-sm text-muted-foreground">Your application for {acc.company_name} is under review.</p>
          ) : acc?.status === 'suspended' ? (
            <p className="text-sm text-muted-foreground">Monthly invoicing is currently suspended. Please contact us.</p>
          ) : (
            <p className="text-sm text-muted-foreground">Monthly invoicing is available for approved business accounts and is enabled by our team. Contact us if you'd like to be set up.</p>
          )}
        </div>

        {invoices.length > 0 && (
          <div className={card}>
            <h2 className="font-semibold mb-3" style={{ color: 'var(--text-heading)' }}>Monthly invoices</h2>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-muted-foreground"><th className="py-2">Invoice</th><th>Period</th><th>Orders</th><th>Total</th><th>Due</th><th>Status</th></tr></thead>
              <tbody>{invoices.map((i) => (
                <tr key={i.id} className="border-t">
                  <td className="py-2 font-medium">{i.invoice_ref}</td>
                  <td>{format(new Date(i.period_start), 'MMM yyyy')}</td>
                  <td>{i.order_count}</td>
                  <td>{formatEur(i.total)}</td>
                  <td>{format(new Date(i.due_date), 'd MMM yyyy')}</td>
                  <td className="capitalize">{i.status}</td>
                </tr>))}
              </tbody>
            </table>
          </div>
        )}

        <div className={card}>
          <h2 className="font-semibold mb-3" style={{ color: 'var(--text-heading)' }}>Credit history</h2>
          {tx.length === 0 ? <p className="text-sm text-muted-foreground">No activity yet.</p> : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-muted-foreground"><th className="py-2">Date</th><th>Description</th><th className="text-right">Amount</th><th className="text-right">Balance</th></tr></thead>
              <tbody>{tx.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="py-2">{format(new Date(t.created_at), 'd MMM yyyy')}</td>
                  <td>{t.note}{Number(t.bonus_eur) > 0 ? ` (incl. ${formatEur(t.bonus_eur)} bonus)` : ''}</td>
                  <td className="text-right tabular-nums">{Number(t.amount_eur) > 0 ? '+' : ''}{formatEur(t.amount_eur)}</td>
                  <td className="text-right tabular-nums">{formatEur(t.balance_after)}</td>
                </tr>))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AccountLayout>
  );
}
