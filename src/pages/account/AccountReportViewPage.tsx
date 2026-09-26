import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Printer } from 'lucide-react';
import AccountLayout from '../../components/layout/AccountLayout';
import UKComplianceScreeningPanel from '../../components/company/UKComplianceScreeningPanel';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../lib/tenant';
import { ReportDisclaimerFooter } from '../../lib/reportDisclaimer';

/** Reports that are delivered only as analyst documents, never shown online. */
export const OFFLINE_ONLY_SLUGS = ['edd-report'];

const HIDDEN_KEYS = new Set(['raw', 'raw_response', 'token', 'access_token']);

function label(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function isPlain(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function scalar(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'object') {
    if (Array.isArray(v)) return v.map(scalar).join(', ');
    return Object.entries(v as Record<string, unknown>).map(([k, x]) => `${label(k)}: ${scalar(x)}`).join(' · ');
  }
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}(T|$)/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toLocaleDateString('en-GB');
  }
  return s;
}

function Fields({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data).filter(([k, v]) => !HIDDEN_KEYS.has(k) && !Array.isArray(v) && !isPlain(v));
  if (!entries.length) return null;
  return (
    <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
      {entries.map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label(k)}</dt>
          <dd className="text-sm break-words" style={{ color: 'var(--text-heading)' }}>{scalar(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

function Table({ rows }: { rows: unknown[] }) {
  if (!rows.length) return <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No records.</p>;
  if (!rows.every(isPlain)) return <ul className="list-disc pl-5 text-sm">{rows.map((r, i) => <li key={i}>{scalar(r)}</li>)}</ul>;
  const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r as object)))).filter((c) => !HIDDEN_KEYS.has(c)).slice(0, 8);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>{cols.map((c) => <th key={c} className="text-left font-medium py-2 pr-4 border-b" style={{ color: 'var(--text-muted)', borderColor: 'var(--bg-border)' }}>{label(c)}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>{cols.map((c) => <td key={c} className="py-2 pr-4 border-b align-top" style={{ borderColor: 'var(--bg-border)', color: 'var(--text-body)' }}>{scalar((r as Record<string, unknown>)[c])}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Section({ title, value }: { title: string; value: unknown }) {
  return (
    <section className="bg-white border rounded-lg p-5 mb-4 break-inside-avoid" style={{ borderColor: 'var(--bg-border)' }}>
      <h2 className="font-semibold mb-3" style={{ color: 'var(--text-heading)' }}>{title}</h2>
      {Array.isArray(value) ? <Table rows={value} /> : isPlain(value) ? (
        <>
          <Fields data={value} />
          {Object.entries(value).filter(([k, v]) => !HIDDEN_KEYS.has(k) && (Array.isArray(v) || isPlain(v))).map(([k, v]) => (
            <div key={k} className="mt-4">
              <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-heading)' }}>{label(k)}</h3>
              {Array.isArray(v) ? <Table rows={v} /> : <Fields data={v as Record<string, unknown>} />}
            </div>
          ))}
        </>
      ) : <p className="text-sm">{scalar(value)}</p>}
    </section>
  );
}

export default function AccountReportViewPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const { tenant } = useTenant();
  const [state, setState] = useState<{ loading: boolean; error?: string; title?: string; company?: string; orderId?: string; orderRef?: string | null; data?: Record<string, unknown>; generated?: string | null; screening?: boolean }>({ loading: true });

  useEffect(() => {
    if (!itemId) return;
    (async () => {
      const { data, error } = await supabase
        .from('order_items')
        .select('id, order_id, screening_addon, products ( name, slug ), companies ( name ), orders ( order_ref ), generated_reports ( api4all_raw_json, generated_at )')
        .eq('id', itemId)
        .maybeSingle();
      const i = data as any;
      if (error || !i) return setState({ loading: false, error: 'Report not found.' });
      if (OFFLINE_ONLY_SLUGS.includes(i.products?.slug)) return setState({ loading: false, error: 'This report is delivered as a document only. Please use Download.', orderId: i.order_id });
      const screening = i.screening_addon === true || i.products?.slug === 'enhanced-uk-kyb-report';
      const rep = [...(i.generated_reports ?? [])].sort((a: any, b: any) => (b.generated_at ?? '').localeCompare(a.generated_at ?? ''))[0];
      if (!rep?.api4all_raw_json) return setState({ loading: false, error: 'This report is not ready yet.', orderId: i.order_id });
      setState({ loading: false, title: i.products?.name, company: i.companies?.name, orderId: i.order_id, orderRef: i.orders?.order_ref ?? null, data: rep.api4all_raw_json, generated: rep.generated_at, screening });
    })();
  }, [itemId]);

  const data = state.data ?? {};
  const topFields = Object.fromEntries(Object.entries(data).filter(([, v]) => !Array.isArray(v) && !isPlain(v)));
  const sections = Object.entries(data).filter(([k, v]) => !HIDDEN_KEYS.has(k) && (Array.isArray(v) || isPlain(v)));

  return (
    <AccountLayout>
      <Helmet><title>{state.title ?? 'Report'} — View online</title><meta name="robots" content="noindex" /></Helmet>
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link to={state.orderId ? `/account/orders/${state.orderId}` : '/account/orders'} className="inline-flex items-center gap-2 text-sm hover:underline" style={{ color: 'var(--brand-accent)' }}>
          <ArrowLeft className="w-4 h-4" /> Back to order
        </Link>
        {state.data && (
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 text-sm px-3 py-1.5 border rounded" style={{ borderColor: 'var(--bg-border)' }}>
            <Printer className="w-4 h-4" /> Print
          </button>
        )}
      </div>
      {state.loading ? (
        <p className="py-16 text-center" style={{ color: 'var(--text-muted)' }}>Loading report…</p>
      ) : state.error ? (
        <p className="py-16 text-center" style={{ color: 'var(--text-muted)' }}>{state.error}</p>
      ) : (
        <>
          <div className="mb-5">
            <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-heading)' }}>{state.company}</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{state.title}{state.generated ? ` · generated ${new Date(state.generated).toLocaleDateString('en-GB')}` : ''}</p>
          </div>
          {Object.keys(topFields).length > 0 && <Section title="Summary" value={topFields} />}
          {sections.map(([k, v]) => <Section key={k} title={label(k)} value={v} />)}
          {state.screening && itemId && (
            <div className="mb-4 break-inside-avoid">
              <UKComplianceScreeningPanel orderItemId={itemId} isEnhanced />
            </div>
          )}
          <ReportDisclaimerFooter
            brandName={tenant?.brand_name}
            generatedAt={state.generated}
            orderRef={state.orderRef ?? undefined}
          />
        </>

      )}
    </AccountLayout>
  );
}
