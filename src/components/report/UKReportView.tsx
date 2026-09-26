import React from 'react';
import { Building2, Users, UserCheck, Landmark, FileText, CalendarClock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { describeSicCode } from '../../lib/sicCodes';

type Any = Record<string, any>;

const fmtDate = (s?: string) => {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};
const human = (s?: string) => (s ? s.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : '—');
const addr = (a?: Any) =>
  a ? [a.care_of && `c/o ${a.care_of}`, a.premises, a.address_line_1, a.address_line_2, a.locality, a.region, a.postal_code, a.country].filter(Boolean).join(', ') : '—';
const dob = (d?: Any) => (d?.year ? new Date(d.year, (d.month ?? 1) - 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : null);

const FORM_LABELS: Record<string, string> = {
  AA: 'Annual accounts', CS01: 'Confirmation statement', AD01: 'Registered office change', AP01: 'Director appointed',
  TM01: 'Director terminated', PSC01: 'PSC notified', PSC07: 'PSC ceased', MR01: 'Charge registered', MR04: 'Charge satisfied',
  CH01: 'Director details changed', SH01: 'Share allotment', RESOLUTIONS: 'Resolutions', NM01: 'Change of name',
};

function Card({ icon: Icon, title, count, children }: { icon: any; title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="bg-white border rounded-xl mb-5 overflow-hidden break-inside-avoid" style={{ borderColor: 'var(--bg-border)' }}>
      <header className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: 'var(--bg-border)', background: 'color-mix(in srgb, var(--brand-accent) 5%, white)' }}>
        <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--brand-accent) 14%, white)', color: 'var(--brand-accent)' }}>
          <Icon className="w-4 h-4" />
        </span>
        <h2 className="font-semibold" style={{ color: 'var(--text-heading)' }}>{title}</h2>
        {count !== undefined && <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-subtle, #f5f7fa)', color: 'var(--text-muted)' }}>{count}</span>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-muted)' }}>{k}</dt>
      <dd className="text-sm" style={{ color: 'var(--text-heading)' }}>{v || '—'}</dd>
    </div>
  );
}

function Pill({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ background: ok ? 'color-mix(in srgb, var(--success, #16a34a) 12%, white)' : 'color-mix(in srgb, var(--danger, #dc2626) 12%, white)', color: ok ? 'var(--success, #16a34a)' : 'var(--danger, #dc2626)' }}>
      {ok ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}{children}
    </span>
  );
}

export default function UKReportView({ data }: { data: Any }) {
  const c: Any = data.company ?? {};
  const officers: Any[] = (data.officers ?? []).filter((o: Any) => !o.resigned_on);
  const psc: Any[] = data.psc ?? [];
  const charges: Any[] = data.charges ?? [];
  const filings: Any[] = data.filings ?? [];
  const outstanding = charges.filter((ch) => ch.status === 'outstanding').length;
  const active = (c.company_status ?? '').toLowerCase() === 'active';

  return (
    <>
      {/* Snapshot */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          ['Status', <Pill ok={active}>{human(c.company_status)}</Pill>],
          ['Incorporated', fmtDate(c.date_of_creation)],
          ['Active directors', officers.length],
          ['Outstanding charges', `${outstanding} of ${data.charges_total ?? charges.length}`],
        ].map(([k, v], i) => (
          <div key={i} className="bg-white border rounded-xl p-4" style={{ borderColor: 'var(--bg-border)' }}>
            <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>{k as string}</p>
            <div className="text-lg font-semibold" style={{ color: 'var(--text-heading)' }}>{v as React.ReactNode}</div>
          </div>
        ))}
      </div>

      <Card icon={Building2} title="Company details">
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
          <KV k="Company name" v={c.company_name} />
          <KV k="Company number" v={c.company_number} />
          <KV k="Type" v={human(c.type)} />
          <KV k="Jurisdiction" v={human(c.jurisdiction)} />
          <KV k="Registered office" v={addr(c.registered_office_address)} />
          <KV k="Nature of business (SIC)" v={(c.sic_codes ?? []).map((s: string) => `${s} — ${describeSicCode(s) ?? 'Other'}`).join('; ')} />
          <KV k="Insolvency history" v={<Pill ok={!c.has_insolvency_history}>{c.has_insolvency_history ? 'Yes' : 'None'}</Pill>} />
          <KV k="Liquidated" v={<Pill ok={!c.has_been_liquidated}>{c.has_been_liquidated ? 'Yes' : 'No'}</Pill>} />
        </dl>
        {c.previous_company_names?.length > 0 && (
          <div className="mt-5">
            <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-heading)' }}>Previous names</h3>
            <ul className="text-sm space-y-1" style={{ color: 'var(--text-body)' }}>
              {c.previous_company_names.map((p: Any, i: number) => (
                <li key={i}>{p.name} <span style={{ color: 'var(--text-muted)' }}>· {fmtDate(p.effective_from)} – {fmtDate(p.ceased_on)}</span></li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card icon={CalendarClock} title="Filing obligations">
        <div className="grid sm:grid-cols-2 gap-4">
          {[['Accounts', c.accounts], ['Confirmation statement', c.confirmation_statement]].map(([t, o]: any) => (
            <div key={t} className="rounded-lg border p-4" style={{ borderColor: 'var(--bg-border)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm" style={{ color: 'var(--text-heading)' }}>{t}</span>
                <Pill ok={!o?.overdue}>{o?.overdue ? 'Overdue' : 'Up to date'}</Pill>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-body)' }}>Next due: {fmtDate(o?.next_due)}</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Made up to: {fmtDate(o?.last_made_up_to ?? o?.last_accounts?.made_up_to ?? o?.next_made_up_to)}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card icon={Users} title="Directors & officers" count={officers.length}>
        {officers.length === 0 ? <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No active officers.</p> : (
          <div className="grid md:grid-cols-2 gap-3">
            {officers.map((o, i) => (
              <div key={i} className="rounded-lg border p-4" style={{ borderColor: 'var(--bg-border)' }}>
                <p className="font-medium" style={{ color: 'var(--text-heading)' }}>{o.name}</p>
                <p className="text-xs mb-2" style={{ color: 'var(--brand-accent)' }}>{human(o.officer_role)} · appointed {fmtDate(o.appointed_on)}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{[o.nationality, dob(o.date_of_birth) && `born ${dob(o.date_of_birth)}`, o.occupation].filter(Boolean).join(' · ')}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card icon={UserCheck} title="Persons with significant control" count={psc.length}>
        {psc.length === 0 ? <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No PSCs registered.</p> : (
          <div className="space-y-3">
            {psc.map((p, i) => (
              <div key={i} className="rounded-lg border p-4" style={{ borderColor: 'var(--bg-border)' }}>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium" style={{ color: 'var(--text-heading)' }}>{p.name}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'color-mix(in srgb, var(--brand-accent) 10%, white)', color: 'var(--brand-accent)' }}>
                    {String(p.kind ?? '').includes('corporate') ? 'Corporate' : 'Individual'}
                  </span>
                  {p.ceased_on && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>ceased {fmtDate(p.ceased_on)}</span>}
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Notified {fmtDate(p.notified_on)}{p.nationality ? ` · ${p.nationality}` : ''} · {addr(p.address)}</p>
                {p.natures_of_control?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {p.natures_of_control.map((n: string) => <span key={n} className="text-xs px-2 py-0.5 rounded border" style={{ borderColor: 'var(--bg-border)', color: 'var(--text-body)' }}>{human(n)}</span>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card icon={Landmark} title="Charges & mortgages" count={data.charges_total ?? charges.length}>
        {charges.length === 0 ? <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No charges registered.</p> : (
          <div className="space-y-3">
            {charges.map((ch, i) => (
              <div key={i} className="rounded-lg border p-4" style={{ borderColor: 'var(--bg-border)' }}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="font-medium text-sm" style={{ color: 'var(--text-heading)' }}>{ch.charge_code ? `Charge ${ch.charge_code}` : `Charge #${ch.charge_number ?? i + 1}`}</p>
                  <Pill ok={ch.status !== 'outstanding'}>{human(ch.status)}</Pill>
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Created {fmtDate(ch.created_on)} · delivered {fmtDate(ch.delivered_on)}{ch.satisfied_on ? ` · satisfied ${fmtDate(ch.satisfied_on)}` : ''}
                  {ch.persons_entitled?.length ? ` · in favour of ${ch.persons_entitled.map((p: Any) => p.name).join(', ')}` : ''}
                </p>
                {ch.particulars?.description && <p className="text-sm mt-2" style={{ color: 'var(--text-body)' }}>{ch.particulars.description}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card icon={FileText} title="Recent filings" count={data.filings_total ?? filings.length}>
        {filings.length === 0 ? <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No filings.</p> : (
          <ol className="relative border-l ml-2" style={{ borderColor: 'var(--bg-border)' }}>
            {filings.map((f, i) => (
              <li key={i} className="ml-4 pb-3">
                <span className="absolute -left-1.5 w-3 h-3 rounded-full" style={{ background: 'var(--brand-accent)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--text-heading)' }}>
                  {FORM_LABELS[f.type] ?? human(f.description ?? f.category)} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>· {f.type}</span>
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {fmtDate(f.date)} · {human(f.category)}{f.description_values?.made_up_date ? ` · made up to ${fmtDate(f.description_values.made_up_date)}` : ''}{f.pages ? ` · ${f.pages} pages` : ''}
                </p>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </>
  );
}
