import React from 'react';
import {
  FileBarChart,
  ScanSearch,
  ScrollText,
  Eye,
  Receipt,
  TrendingUp,
  ClipboardList,
  Building2,
  Briefcase,
  Users,
  CheckCircle2,
  ShieldCheck,
  FileSignature,
  Banknote,
} from 'lucide-react';

/**
 * Unified product/service icon system.
 *
 * Style: Lucide outline, 1.5px stroke, navy (var(--brand-primary)).
 * Replaces the previous emoji-based product icons across the navbar
 * dropdown, homepage cards, and company profile sidebar.
 *
 * Variants:
 *   - 'inline' : just the glyph, navy stroke. For dense lists (sidebar).
 *   - 'tile'   : glyph inside a soft navy-tinted square tile. For cards.
 */

export type ProductIconKey =
  // report types (DB product.type)
  | 'structure'
  | 'kyb'
  | 'credit'
  | 'monitoring'
  | 'extract'
  | 'certificate'
  // navbar / register column
  | 'company-cert'
  | 'business-cert'
  | 'partnership-cert'
  | 'company-setup'
  | 'business-name'
  | 'trade-registration'
  | 'report-generic';

const ICON_MAP: Record<ProductIconKey, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  structure: ClipboardList,
  kyb: ScanSearch,
  credit: TrendingUp,
  monitoring: Eye,
  extract: Receipt,
  certificate: ScrollText,
  'company-cert': Building2,
  'business-cert': Briefcase,
  'partnership-cert': Users,
  'company-setup': Building2,
  'business-name': CheckCircle2,
  'trade-registration': FileSignature,
  'report-generic': FileBarChart,
};

interface ProductIconProps {
  /** Product type key. Falls back to a generic report icon. */
  type: string | undefined | null;
  /** Visual variant. */
  variant?: 'inline' | 'tile';
  /** Glyph size in px. Default 16 for inline, 20 for tile. */
  size?: number;
  className?: string;
}

export const ProductIcon: React.FC<ProductIconProps> = ({
  type,
  variant = 'inline',
  size,
  className = '',
}) => {
  const key = (type ?? 'report-generic') as ProductIconKey;
  const Icon = ICON_MAP[key] ?? FileBarChart;
  const px = size ?? (variant === 'tile' ? 20 : 16);

  if (variant === 'tile') {
    return (
      <span
        className={`inline-flex items-center justify-center shrink-0 rounded-lg ${className}`}
        style={{
          width: px + 18,
          height: px + 18,
          backgroundColor: 'color-mix(in srgb, var(--brand-primary) 8%, transparent)',
          color: 'var(--brand-primary)',
          border: '1px solid color-mix(in srgb, var(--brand-primary) 14%, transparent)',
        }}
      >
        <Icon className="" strokeWidth={1.5} />
      </span>
    );
  }

  return (
    <Icon
      strokeWidth={1.5}
      className={`inline-block shrink-0 ${className}`}
      style={{ width: px, height: px, color: 'var(--brand-primary)' } as React.CSSProperties}
    />
  );
};

export default ProductIcon;
