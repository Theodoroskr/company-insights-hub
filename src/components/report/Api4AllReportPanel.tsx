import React from 'react';

type R = Record<string, any>;
const arr = (v: unknown): R[] => (Array.isArray(v) ? (v as R[]) : []);
const personName = (p: R) =>
  p.IsCompany ? p.CompanyName : [p.FirstName, p.MiddleName, p.LastName].filter(Boolean).join(' ') || p.CompanyName || '—';
const addr = (p: R) => arr(p.Address).filter((a) => a.Active !== 0).map((a) => [a.Address, a.City, a.PostalCode, a.Country].filter(Boolean).join(', '))[0];
const d = (s?: string) => (s ? new Date(s).toLocaleDateString('en-GB') : '');

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

/** Renders a delivered API4ALL structure report (Cyprus / global) on the company page. */
export default function Api4AllReportPanel({ bundle }: { bundle: R }) {
  const c: R = arr(bundle.Company)[0];
  if (!c) return null;
  const admins = arr(c.Administrators).filter((a) => a.Active !== 0);
  const holders = arr(c.Shareholders).filter((s) => s.Active !== 0);
  const cap = arr(c.Capitals)[0];
  const acts = arr(arr(c.Activities)[0]?.ActivityCode);
  const charges = arr(c.MortgagesCharges);
  const gen = arr(c.GeneralInfo)[0] ?? {};

  return (
    <div className="space-y-4">
      <Card title="Company details (from your report)">
        <dl className="grid sm:grid-cols-2 gap-3 text-sm">
          {[
            ['Status', arr(gen.Status)[0]?.Description],
            ['Legal form', arr(gen.LegalType)[0]?.Description],
            ['Website', gen.Website],
            ['Email / phone', [arr(c.MoreInfo)[0]?.Emails, arr(c.MoreInfo)[0]?.Phones].filter(Boolean).join(' · ')],
            ...arr(c.Identifiers).map((i) => [i.Description, i.Number]),
            ...arr(gen.Address).map((a) => [a.Type, [a.Address, a.City, a.PostalCode, a.Country].filter(Boolean).join(', ')]),
          ].filter(([, v]) => v).map(([k, v], i) => (
            <div key={i}><dt className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>{k}</dt><dd className="break-words" style={{ color: 'var(--text-body)' }}>{v}</dd></div>
          ))}
        </dl>
      </Card>

      {admins.length > 0 && (
        <Card title="Officers" count={admins.length}>
          {admins.map((a, i) => (
            <Row key={i} main={<>{personName(a)} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>· {a.Position}</span></>}
              sub={[a.StartDate && `Appointed ${d(a.StartDate)}`, a.Nationality && `Nationality: ${a.Nationality}`, addr(a) && `Address: ${addr(a)}`]} />
          ))}
        </Card>
      )}

      {holders.length > 0 && (
        <Card title="Shareholders" count={holders.length}>
          {holders.map((s, i) => (
            <Row key={i} main={<>{personName(s)} {s.SharesPercentage && <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>· {s.SharesPercentage}%</span>}</>}
              sub={[s.IssuedShares && `${Number(s.IssuedShares).toLocaleString('en-GB')} shares`, s.Nationality && `Nationality: ${s.Nationality}`, addr(s) && `Address: ${addr(s)}`]} />
          ))}
        </Card>
      )}

      {cap && (
        <Card title="Share capital">
          <p className="text-sm" style={{ color: 'var(--text-body)' }}>
            Authorised {Number(cap.AuthorisedCapital || 0).toLocaleString('en-GB')} · Issued {Number(cap.IssuedShares || 0).toLocaleString('en-GB')} · Paid up {Number(cap.PaidUpCapital || 0).toLocaleString('en-GB')} {cap.Currency}
          </p>
        </Card>
      )}

      {acts.length > 0 && (
        <Card title="Activities" count={acts.length}>
          {acts.map((a, i) => <Row key={i} main={a.Description} sub={[`${a.Type} ${a.Code}`]} />)}
        </Card>
      )}

      {charges.length > 0 && (
        <Card title="Mortgages & charges" count={charges.length}>
          {charges.map((m, i) => (
            <Row key={i} main={m.Description || m.Type || m.CreditorName || `Charge ${i + 1}`}
              sub={Object.entries(m).filter(([k, v]) => typeof v === 'string' && v && !['Description', 'Type'].includes(k)).slice(0, 4).map(([k, v]) => `${k}: ${v}`)} />
          ))}
        </Card>
      )}
    </div>
  );
}
