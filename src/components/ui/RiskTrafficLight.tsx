import React from 'react';
import type { RiskBand } from '../../types/database';

interface RiskTrafficLightProps {
  band: RiskBand;
  showLabel?: boolean;
  className?: string;
}

const RISK_CONFIG: Record<RiskBand, { color: string; label: string }> = {
  low:       { color: 'var(--risk-low)',       label: 'Low Risk' },
  medium:    { color: 'var(--risk-medium)',    label: 'Medium Risk' },
  high:      { color: 'var(--risk-high)',      label: 'High Risk' },
  very_high: { color: 'var(--risk-very-high)', label: 'Very High Risk' },
  critical:  { color: 'var(--risk-critical)',  label: 'Critical Risk' },
};

export default function RiskTrafficLight({
  band,
  showLabel = true,
  className = '',
}: RiskTrafficLightProps) {
  const config = RISK_CONFIG[band] ?? RISK_CONFIG.medium;

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: config.color }}
        aria-hidden="true"
      />
      {showLabel && (
        <span className="text-sm font-medium" style={{ color: config.color }}>
          {config.label}
        </span>
      )}
    </span>
  );
}
