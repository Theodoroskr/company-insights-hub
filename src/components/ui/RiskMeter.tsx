import React from 'react';
import type { RiskBand } from '../../types/database';

interface RiskMeterProps {
  label: string;
  band: RiskBand | null | undefined;
  /** Optional 0-100 score for filled bar */
  score?: number | null;
  className?: string;
}

const BAND_CONFIG: Record<RiskBand, { color: string; bg: string; label: string; pct: number }> = {
  low:       { color: 'var(--risk-low)',       bg: 'var(--risk-low-bg)',       label: 'Low',       pct: 25 },
  medium:    { color: 'var(--risk-medium)',    bg: 'var(--risk-medium-bg)',    label: 'Medium',    pct: 50 },
  high:      { color: 'var(--risk-high)',      bg: 'var(--risk-high-bg)',      label: 'High',      pct: 75 },
  very_high: { color: 'var(--risk-very-high)', bg: 'var(--risk-very-high-bg)', label: 'Very High', pct: 92 },
  critical:  { color: 'var(--risk-critical)',  bg: 'var(--risk-very-high-bg)', label: 'Critical',  pct: 100 },
};

export default function RiskMeter({ label, band, score, className = '' }: RiskMeterProps) {
  const cfg = band ? BAND_CONFIG[band] : null;
  const pct = score ?? cfg?.pct ?? 0;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
        <span className="text-xs font-bold" style={{ color: cfg?.color ?? 'var(--text-muted)' }}>
          {cfg?.label ?? 'N/A'}
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-subtle)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: cfg
              ? `linear-gradient(90deg, ${cfg.color} 0%, ${cfg.color} 100%)`
              : '#cbd5e1',
          }}
        />
      </div>
    </div>
  );
}
