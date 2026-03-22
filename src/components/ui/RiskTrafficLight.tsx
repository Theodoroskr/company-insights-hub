import React from 'react';
import type { RiskBand } from '../../types/database';

interface RiskTrafficLightProps {
  band: RiskBand;
  showLabel?: boolean;
  className?: string;
}

const RISK_CONFIG: Record<RiskBand, { color: string; label: string }> = {
  low:      { color: '#16A34A', label: 'Low Risk' },
  medium:   { color: '#D97706', label: 'Medium Risk' },
  high:     { color: '#DC2626', label: 'High Risk' },
  critical: { color: '#7F1D1D', label: 'Critical Risk' },
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
