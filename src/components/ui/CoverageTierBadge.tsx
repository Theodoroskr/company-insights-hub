import React from 'react';
import { Zap, Clock, Mail } from 'lucide-react';
import type { CoverageTier } from '../../types/database';

interface CoverageTierBadgeProps {
  tier: CoverageTier | null | undefined;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

const TIER_CONFIG: Record<CoverageTier, { label: string; sla: string; color: string; bg: string; icon: React.ReactNode }> = {
  premium: {
    label: 'Premium',
    sla: 'Instant delivery',
    color: 'var(--tier-premium)',
    bg: 'var(--tier-premium-bg)',
    icon: <Zap className="w-3 h-3" />,
  },
  standard: {
    label: 'Standard',
    sla: '24h delivery',
    color: 'var(--tier-standard)',
    bg: 'var(--tier-standard-bg)',
    icon: <Clock className="w-3 h-3" />,
  },
  on_request: {
    label: 'On Request',
    sla: '2-5 business days',
    color: 'var(--tier-onrequest)',
    bg: 'var(--tier-onrequest-bg)',
    icon: <Mail className="w-3 h-3" />,
  },
};

const CoverageTierBadge = React.forwardRef<HTMLSpanElement, CoverageTierBadgeProps>(function CoverageTierBadge(
  { tier, size = 'md', showIcon = true, className = '' },
  ref
) {
  if (!tier) return null;
  const cfg = TIER_CONFIG[tier];
  const padding = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      ref={ref}
      className={`inline-flex items-center gap-1 font-semibold uppercase tracking-wider rounded-full ${padding} ${className}`}
      style={{ color: cfg.color, backgroundColor: cfg.bg, border: `1px solid ${cfg.color}33` }}
      title={cfg.sla}
    >
      {showIcon && cfg.icon}
      {cfg.label}
    </span>
  );
});

export default CoverageTierBadge;
