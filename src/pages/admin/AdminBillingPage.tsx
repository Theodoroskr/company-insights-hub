import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { formatEur } from '../../lib/pricing';
import { toast } from '@/hooks/use-toast';
import { format, startOfMonth, subMonths } from 'date-fns';

export default function AdminBillingPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [period, setPeriod] = useState(format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM'));
  const sb = supabase as any;

  const load = async () => {
    const [a, i] = await Promise.all([
      sb.from('billing_accounts').select('*').order('created_at', { ascending: false }),
      sb.from('monthly_invoices').select('*').order('created_at', { ascending: false }).limit(200),
    ]);
    setAccounts(a.data ?? []); setInvoices(i.data ?? []);
    const ids = Array.from(new Set([...(a.data ?? []), ...(i.data ?? [])].map((r: any) => r.user_id)));
    if (ids.length) {
      const { data } = await supabase.from('profiles').select('id, email').in('id', ids as string[]);
      setEmails(Object.fromEntries((data ?? []).map((p) => [p.id, p.email ?? ''])));
    }
  };
  useEffect(() => { load(); }, []);

  const save = async (row: any, patch: any) => {
    const { error } = await sb.from('billing_accounts').update({ ...patch, ...(patch.status === 'approved' ? { approved_at: new Date().toISOString() } : {}) }).eq('user_id', row.user_id);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    toast({ title: 'Saved' }); load();
  };

  const generate = async () => {
    const { data, error } = await sb.rpc('generate_monthly_invoices', { _period_start: `${period}-01` });
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    toast({ title: `${data} invoice(s) created` }); load();
  };

  const markPaid = async (id: string) => {
    const { error } = await sb.from('monthly_invoices').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', id);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    load();
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>Enterprise Billing</h1>

        <div className="bg-card border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
              {['Company', 'Customer', 'Expected / mo', 'Status', 'Monthly limit €', 'Terms (days)', 'PO required', ''].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}
            </tr></thead>
            <tbody>
              {accounts.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">No applications yet</td></tr>}
              {accounts.map((r) => <AccountRow key={r.user_id} row={r} email={emails[r.user_id]} onSave={save} />)}
            </tbody>
          </table>
        </div>

        <div className="bg-card border rounded-xl p-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Invoice month</label>
            <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="border rounded px-2 py-1.5 text-sm" />
          </div>
          <button onClick={generate} className="px-4 py-2 rounded text-sm font-semibold text-primary-foreground" style={{ backgroundColor: 'var(--brand-accent)' }}>Generate month-end invoices</button>
          <p className="text-xs text-muted-foreground">Bundles every un-invoiced "on account" order up to the end of that month into one invoice per client.</p>
        </div>

        <div className="bg-card border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
              {['Invoice', 'Customer', 'Period', 'Orders', 'Total', 'Due', 'Status', ''].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}
            </tr></thead>
            <tbody>
              {invoices.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">No invoices yet</td></tr>}
              {invoices.map((i) => (
                <tr key={i.id} className="border-b last:border-0">
                  <td className="px-3 py-2 font-medium">{i.invoice_ref}</td>
                  <td className="px-3 py-2">{emails[i.user_id] ?? '—'}</td>
                  <td className="px-3 py-2">{format(new Date(i.period_start), 'MMM yyyy')}</td>
                  <td className="px-3 py-2">{i.order_count}</td>
                  <td className="px-3 py-2">{formatEur(i.total)}</td>
                  <td className="px-3 py-2">{format(new Date(i.due_date), 'd MMM yyyy')}</td>
                  <td className="px-3 py-2 capitalize">{i.status}</td>
                  <td className="px-3 py-2">{i.status !== 'paid' && <button onClick={() => markPaid(i.id)} className="text-xs underline">Mark paid</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}

function AccountRow({ row, email, onSave }: { row: any; email?: string; onSave: (r: any, p: any) => void }) {
  const [s, setS] = useState({ status: row.status, monthly_limit_eur: row.monthly_limit_eur, payment_terms_days: row.payment_terms_days, po_required: row.po_required });
  return (
    <tr className="border-b last:border-0">
      <td className="px-3 py-2 font-medium">{row.company_name}<div className="text-xs text-muted-foreground">{row.vat_number}</div></td>
      <td className="px-3 py-2">{email ?? '—'}</td>
      <td className="px-3 py-2">{row.expected_monthly_spend ? formatEur(row.expected_monthly_spend, 0) : '—'}</td>
      <td className="px-3 py-2">
        <select value={s.status} onChange={(e) => setS({ ...s, status: e.target.value })} className="border rounded px-1 py-1 text-xs">
          {['pending', 'approved', 'rejected', 'suspended'].map((o) => <option key={o}>{o}</option>)}
        </select>
      </td>
      <td className="px-3 py-2"><input type="number" min={0} value={s.monthly_limit_eur} onChange={(e) => setS({ ...s, monthly_limit_eur: Number(e.target.value) })} className="border rounded px-2 py-1 w-24 text-xs" /></td>
      <td className="px-3 py-2"><input type="number" min={0} value={s.payment_terms_days} onChange={(e) => setS({ ...s, payment_terms_days: Number(e.target.value) })} className="border rounded px-2 py-1 w-16 text-xs" /></td>
      <td className="px-3 py-2"><input type="checkbox" checked={s.po_required} onChange={(e) => setS({ ...s, po_required: e.target.checked })} /></td>
      <td className="px-3 py-2"><button onClick={() => onSave(row, s)} className="text-xs font-semibold" style={{ color: 'var(--brand-accent)' }}>Save</button></td>
    </tr>
  );
}
