// ============================================================
// IntelligenceKpiStrip
// Dense 6-tile KPI row at the top of company profile pages.
// All tiles render compactly; sensitive numerics are blurred
// when the profile is locked, mirroring the gating pattern.
// ============================================================

import React from 'react';
import { Shield, CheckCircle2, Calendar, Users, Briefcase, MapPin, Clock } from 'lucide-react';
import type { Company, Country, DirectorEntry } from '../../types/database';

interface Props {
  company: Company;
  country?: Country;
  isUnlocked: boolean;
}

function yearsSince(iso?: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / (365.25 * 24 * 3600 * 1000)));
}

function timeAgo(iso?: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return '—';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60)  return `${minutes}m ago`;
  const hours   = Math.floor(minutes / 60);
  if (hours   < 24)  return `${hours}h ago`;
  const days    = Math.floor(hours   / 24);
  if (days    < 30)  return `${days}d ago`;
  const months  = Math.floor(days    / 30);
  if (months  < 12)  return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

const RISK_COLORS: Record<string, { fg: string; bg: string; label: string }> = {
  low:        { fg: '#16A34A', bg: 'rgba(22,163,74,0.10)',  label: 'Low' },
  medium:     { fg: '#CA8A04', bg: 'rgba(202,138,4,0.10)',  label: 'Medium' },
  high:       { fg: '#DC2626', bg: 'rgba(220,38,38,0.10)',  label: 'High' },
  very_high:  { fg: '#991B1B', bg: 'rgba(153,27,27,0.10)',  label: 'Very High' },
  critical:   { fg: '#7F1D1D', bg: 'rgba(127,29,29,0.10)',  label: 'Critical' },
};

function Tile({
  icon,
  label,
  value,
  accent,
  blurred,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  accent?: string;
  blurred?: boolean;
}) {
  return (
    <div
      className="relative flex flex-col gap-1.5 px-4 py-3 min-w-0 transition-colors hover:bg-[var(--bg-subtle)]"
    >
      <div
        className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
        style={{ color: 'var(--text-muted)' }}
      >
        <span style={{ color: accent ?? 'var(--text-muted)' }}>{icon}</span>
        {label}
      </div>
      <div
        className="text-base font-bold leading-tight truncate"
        style={{
          color: 'var(--text-heading)',
          filter: blurred ? 'blur(6px)' : undefined,
          userSelect: blurred ? 'none' : undefined,
        }}
        title={typeof value === 'string' ? value : undefined}
      >
        {value}
      </div>
    </div>
  );
}

export default function IntelligenceKpiStrip({ company, country, isUnlocked }: Props) {
  const directors: DirectorEntry[] = Array.isArray(company.directors_json) ? company.directors_json : [];
  const directorCount = directors.length;

  // Try to derive incorporation date from raw_source_json (UK shape: incorporated_on)
  const raw = (company.raw_source_json ?? null) as
    | { incorporated_on?: string; date_of_creation?: string; sic_codes?: string[]; nature_of_business?: string }
    | null;
  const incorporatedIso = raw?.incorporated_on ?? raw?.date_of_creation ?? null;
  const ageYears        = yearsSince(incorporatedIso);
  const sector          = raw?.nature_of_business ?? raw?.sic_codes?.[0] ?? company.legal_form ?? '—';

  const status        = company.status ?? 'Unknown';
  const statusActive  = /active|registered|in good standing/i.test(status);
  const statusColor   = statusActive ? '#16A34A' : '#DC2626';
  const companyRiskBand = (country?.risk_band ?? 'medium') as keyof typeof RISK_COLORS;
  const companyRisk   = RISK_COLORS[companyRiskBand] ?? RISK_COLORS.medium;
  const countryRisk   = RISK_COLORS[(country?.risk_band ?? 'medium') as keyof typeof RISK_COLORS] ?? RISK_COLORS.medium;

  const tiles = [
    {
      icon: <Shield className="w-3.5 h-3.5" />,
      label: 'Overall Risk',
      value: (
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-sm font-semibold"
          style={{ color: companyRisk.fg, backgroundColor: companyRisk.bg }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: companyRisk.fg }} />
          {companyRisk.label}
        </span>
      ),
      accent: companyRisk.fg,
      blurred: !isUnlocked,
    },
    {
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      label: 'Registry Status',
      value: (
        <span style={{ color: statusColor }}>{status}</span>
      ),
      accent: statusColor,
    },
    {
      icon: <Calendar className="w-3.5 h-3.5" />,
      label: 'Company Age',
      value: ageYears !== null ? `${ageYears} ${ageYears === 1 ? 'year' : 'years'}` : '—',
    },
    {
      icon: <Users className="w-3.5 h-3.5" />,
      label: 'Directors',
      value: directorCount > 0 ? String(directorCount) : '—',
    },
    {
      icon: <Briefcase className="w-3.5 h-3.5" />,
      label: 'Sector',
      value: <span className="text-sm">{sector}</span>,
    },
    {
      icon: <MapPin className="w-3.5 h-3.5" />,
      label: 'Country Risk',
      value: (
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-sm font-semibold"
          style={{ color: countryRisk.fg, backgroundColor: countryRisk.bg }}
        >
          {country?.flag_emoji ?? '🌐'} {countryRisk.label}
        </span>
      ),
      accent: countryRisk.fg,
    },
  ];

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: '#fff',
        border: '1px solid var(--bg-border)',
        boxShadow: '0 1px 2px rgba(15,36,68,0.04)',
      }}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y sm:divide-y-0 lg:divide-y-0"
           style={{ borderColor: 'var(--bg-border)' }}>
        {tiles.map((t) => (
          <Tile key={t.label} {...t} />
        ))}
      </div>
      <div
        className="flex items-center gap-1.5 px-4 py-2 text-[11px]"
        style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', borderTop: '1px solid var(--bg-border)' }}
      >
        <Clock className="w-3 h-3" />
        Last update: {timeAgo(company.cached_at)} · Source: official registry
      </div>
    </div>
  );
}
