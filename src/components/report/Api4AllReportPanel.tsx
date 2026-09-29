import React from 'react';
import { normalizeApi4AllReport } from '../../lib/api4all/normalize';

const d = (s?: string) => (s ? new Date(s).toLocaleDateString('en-GB') : '');
const n = (s?: string | number) => (s !== undefined && s !== '' ? Number(s).toLocaleString('en-GB') : '');

function Card({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="bg-white border rounded-lg p-5" style={{ borderColor: 'var(--bg-border)' }}>
      <h2 className="font-semibold text-base mb-3" style={{ color: 'var(--text-subheading)' }}>
        {title}{count !== undefined && <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>{count} record{count === 1 ? '' : 's'}</span>}
      </h2>
      {children}
    </section>
  );
}

function Row({ main, sub }: { main: React.ReactNode; sub: (string | undefined | false)[] }) {
  return (
    <div className="text-sm py-2 border-b last:border-0" style={{ borderColor: 'var(--bg-border)' }}>
      <div className="font-medium" style={{ color: 'var(--text-heading)' }}>{main}</div>
      {sub.filter(Boolean).map((s, i) => <p key={i} className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s}</p>)}
    </div>
  );
}

const Muted = ({ children }: { children: React.ReactNode }) => <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>{children}</span>;

/** Renders a delivered API4ALL structure report (Cyprus / global) on the company page. */
export default function Api4AllReportPanel({ bundle }: { bundle: Record<string, any> }) {
  const r = normalizeApi4AllReport(bundle);
  if (!r) return null;

  const details: [string, string | undefined][] = [
    ['Status', r.status],
    ['Legal form', r.legalForm],
    ...r.dates.map((x) => [x.label, d(x.date)] as [string, string]),
    ['Website', r.website],
    ['Email / phone', [r.emails, r.phones].filter(Boolean).join(' · ')],
    ...r.identifiers.map((i) => [i.label, i.value] as [string, string]),
    ...r.addresses.map((a) => [a.label, a.value] as [string, string]),
  ];

  return (
    <div className="space-y-4">
      <Card title="Company details (from your report)">
        <dl className="grid sm:grid-cols-2 gap-3 text-sm">
          {details.filter(([, v]) => v).map(([k, v], i) => (
            <div key={i}><dt className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>{k}</dt><dd className="break-words" style={{ color: 'var(--text-body)' }}>{v}</dd></div>
          ))}
        </dl>
      </Card>

      {r.officers.length > 0 && (
        <Card title="Directors & Secretaries" count={r.officers.length}>
          {r.officers.map((o, i) => (
            <Row key={i} main={<>{o.name} <Muted>· {o.roles.join(' / ')}</Muted></>}
              sub={[o.appointed && `Appointed ${d(o.appointed)}`, o.nationality && `Nationality: ${o.nationality}`, o.address && `Address: ${o.address}`]} />
          ))}
        </Card>
      )}

      {r.shareholders.length > 0 && (
        <Card title="Shareholders" count={r.shareholders.length}>
          {r.shareholders.map((s, i) => (
            <Row key={i} main={<>{s.name} {s.pct && <Muted>· {s.pct}%</Muted>}</>}
              sub={[s.shares && `${n(s.shares)} shares`, s.isCompany ? 'Corporate shareholder' : s.nationality && `Nationality: ${s.nationality}`, s.address && `Address: ${s.address}`]} />
          ))}
        </Card>
      )}

      {r.capital && (
        <Card title="Share capital">
          <p className="text-sm" style={{ color: 'var(--text-body)' }}>
            Authorised {n(r.capital.authorised || 0)} · Issued {n(r.capital.issued || 0)} · Paid up {n(r.capital.paidUp || 0)} {r.capital.currency}
          </p>
          {r.capital.classes.length > 0 && (
            <ul className="mt-2 text-xs space-y-0.5" style={{ color: 'var(--text-muted)' }}>
              {r.capital.classes.map((c, i) => <li key={i}>{c.type}: {n(c.issued)} shares{c.value ? ` of ${c.value}` : ''}</li>)}
            </ul>
          )}
        </Card>
      )}

      {r.activities.length > 0 && (
        <Card title="Activities" count={r.activities.length}>
          {r.activities.map((a, i) => <Row key={i} main={a.description} sub={[`${a.type} ${a.code}`]} />)}
        </Card>
      )}

      {r.charges.length > 0 && (
        <Card title="Mortgages & charges" count={r.charges.length}>
          {r.charges.map((m, i) => (
            <Row key={i}
              main={<>{m.kind === 'mortgage' ? `Mortgage${m.number ? ` ${m.number}` : ''}` : m.type} {m.amount !== undefined && <Muted>· {n(m.amount)} {m.currency}</Muted>}</>}
              sub={[m.beneficiary && `In favour of ${m.beneficiary}`, m.registered && `Registered ${d(m.registered)}${m.prepared ? ` (prepared ${d(m.prepared)})` : ''}`, m.ended ? `Satisfied ${d(m.ended)}` : 'Outstanding']} />
          ))}
        </Card>
      )}
    </div>
  );
}
