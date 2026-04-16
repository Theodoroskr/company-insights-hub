import React from 'react';

interface UKRiskSummaryPanelProps {
  bundle: Record<string, unknown> | null;
}

type Tone = 'good' | 'warn' | 'bad' | 'neutral';

interface Metric {
  label: string;
  value: string;
  hint?: string;
  tone: Tone;
}

const TONE_COLOR: Record<Tone, string> = {
  good: 'var(--risk-low)',
  warn: 'var(--risk-medium)',
  bad: 'var(--risk-high)',
  neutral: 'var(--text-muted)',
};

const TONE_BG: Record<Tone, string> = {
  good: 'var(--risk-low-bg)',
  warn: 'var(--risk-medium-bg)',
  bad: 'var(--risk-high-bg)',
  neutral: 'var(--bg-subtle)',
};

function yearsBetween(iso?: string): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return (Date.now() - t) / (365.25 * 24 * 3600 * 1000);
}

function pickProfile(bundle: Record<string, unknown> | null): Record<string, unknown> {
  if (!bundle) return {};
  const p = (bundle.company ?? bundle.profile ?? bundle.company_profile ?? bundle) as Record<string, unknown>;
  return p ?? {};
}

function asArray(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  if (v && typeof v === 'object' && Array.isArray((v as Record<string, unknown>).items)) {
    return (v as { items: unknown[] }).items;
  }
  return [];
}

function computeMetrics(bundle: Record<string, unknown> | null): { metrics: Metric[]; overall: Tone; overallLabel: string } {
  const profile = pickProfile(bundle);
  const accounts = (profile.accounts as Record<string, unknown> | undefined) ?? {};
  const confirmation = (profile.confirmation_statement as Record<string, unknown> | undefined) ?? {};
  const status = (profile.company_status as string | undefined) ?? '';
  const incorporated = profile.date_of_creation as string | undefined;

  // Officers — top-level array (or {items})
  const officerItems = asArray(bundle?.officers);
  const activeOfficers = officerItems.filter((o) => !((o as Record<string, unknown>).resigned_on)).length;

  // PSC — top-level array
  const pscItems = asArray(bundle?.psc);
  const activePsc = pscItems.filter((p) => !((p as Record<string, unknown>).ceased_on) && !((p as Record<string, unknown>).ceased)).length;

  // Charges — top-level array
  const chargeItems = asArray(bundle?.charges);
  const activeCharges = chargeItems.filter((c) => {
    const s = (c as Record<string, unknown>).status as string | undefined;
    return s === 'outstanding' || s === 'part-satisfied' || (!s && !(c as Record<string, unknown>).satisfied_on);
  }).length;

  // Overdue filings (accounts or confirmation)
  const accountsOverdue = !!accounts.overdue;
  const csOverdue = !!confirmation.overdue;
  const overdueCount = (accountsOverdue ? 1 : 0) + (csOverdue ? 1 : 0);

  // Age
  const ageYears = yearsBetween(incorporated);

  // Build metrics
  const metrics: Metric[] = [];

  metrics.push({
    label: 'Company Age',
    value: ageYears == null ? '—' : `${ageYears.toFixed(1)} yrs`,
    hint: incorporated ? `Incorp. ${new Date(incorporated).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}` : undefined,
    tone: ageYears == null ? 'neutral' : ageYears >= 5 ? 'good' : ageYears >= 1 ? 'warn' : 'bad',
  });

  metrics.push({
    label: 'Status',
    value: status ? status.replace(/-/g, ' ') : '—',
    tone: status === 'active' ? 'good' : status === 'dissolved' || status === 'liquidation' ? 'bad' : status ? 'warn' : 'neutral',
  });

  metrics.push({
    label: 'Overdue Filings',
    value: String(overdueCount),
    hint: overdueCount === 0 ? 'Up to date' : [accountsOverdue ? 'Accounts' : null, csOverdue ? 'Confirmation' : null].filter(Boolean).join(' · '),
    tone: overdueCount === 0 ? 'good' : overdueCount === 1 ? 'warn' : 'bad',
  });

  metrics.push({
    label: 'Active Charges',
    value: String(activeCharges),
    hint: chargeItems.length > 0 ? `${chargeItems.length} total` : undefined,
    tone: activeCharges === 0 ? 'good' : activeCharges <= 2 ? 'warn' : 'bad',
  });

  metrics.push({
    label: 'PSCs',
    value: String(activePsc),
    hint: pscItems.length > 0 && pscItems.length !== activePsc ? `${pscItems.length} total` : undefined,
    tone: activePsc === 0 ? 'warn' : activePsc <= 4 ? 'good' : 'warn',
  });

  metrics.push({
    label: 'Active Officers',
    value: String(activeOfficers),
    hint: officerItems.length > 0 && officerItems.length !== activeOfficers ? `${officerItems.length} total` : undefined,
    tone: activeOfficers === 0 ? 'bad' : activeOfficers >= 2 ? 'good' : 'warn',
  });

  // Overall scoring
  const score = metrics.reduce((s, m) => s + (m.tone === 'bad' ? 2 : m.tone === 'warn' ? 1 : 0), 0);
  const overall: Tone = score >= 4 ? 'bad' : score >= 2 ? 'warn' : 'good';
  const overallLabel = overall === 'good' ? 'Low Risk' : overall === 'warn' ? 'Medium Risk' : 'High Risk';

  return { metrics, overall, overallLabel };
}

export default function UKRiskSummaryPanel({ bundle }: UKRiskSummaryPanelProps) {
  const { metrics, overall, overallLabel } = computeMetrics(bundle);

  return (
    <div
      className="rounded-lg border p-5"
      style={{ borderColor: 'var(--bg-border)', backgroundColor: '#fff' }}
    >
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="font-semibold text-base" style={{ color: 'var(--text-subheading)' }}>
            Risk Summary
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Computed from your unlocked Companies House report
          </p>
        </div>
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
          style={{ backgroundColor: TONE_BG[overall], color: TONE_COLOR[overall] }}
        >
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: TONE_COLOR[overall] }} />
          Overall: {overallLabel}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-md border p-3"
            style={{ borderColor: 'var(--bg-border)', backgroundColor: TONE_BG[m.tone] }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span
                className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: TONE_COLOR[m.tone] }}
              />
              <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                {m.label}
              </span>
            </div>
            <p className="text-base font-semibold capitalize" style={{ color: TONE_COLOR[m.tone] }}>
              {m.value}
            </p>
            {m.hint && (
              <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                {m.hint}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
