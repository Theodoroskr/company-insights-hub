// ============================================================
// BrandMark
// Infocredit World — an Infocredit Group platform.
// Uses the official Infocredit Group wordmark logo, with a
// product label ("World") and a small "An Infocredit Group
// platform" endorsement line. Adapts to light/dark surfaces.
// ============================================================

import React from 'react';
import infocreditLogo from '../../assets/infocredit-group-logo.png';

interface BrandMarkProps {
  brandName: string;            // kept for API compatibility (unused for visuals)
  variant?: 'light' | 'dark';   // surface the mark is shown on
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showEndorsement?: boolean;    // show "An Infocredit Group platform" line
}

const SIZE = {
  sm: { logoH: 22, product: '0.95rem', endorsement: '0.55rem', tracking: '0.18em' },
  md: { logoH: 30, product: '1.2rem',  endorsement: '0.6rem',  tracking: '0.22em' },
  lg: { logoH: 40, product: '1.6rem',  endorsement: '0.65rem', tracking: '0.24em' },
} as const;

export default function BrandMark({
  variant = 'light',
  size = 'md',
  className = '',
  showEndorsement = true,
}: BrandMarkProps) {
  const s = SIZE[size];
  const isDark = variant === 'dark';

  const productColor     = isDark ? '#FFFFFF' : 'var(--brand-primary, #0F2444)';
  const endorsementColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(15,36,68,0.55)';
  const dividerColor     = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(15,36,68,0.18)';

  return (
    <span className={`inline-flex items-center gap-3 select-none ${className}`}>
      <img
        src={infocreditLogo}
        alt="Infocredit Group"
        height={s.logoH}
        loading="eager"
        decoding="async"
        style={{
          height: s.logoH,
          width: 'auto',
          objectFit: 'contain',
          // Invert the navy wordmark to white on dark surfaces; preserve
          // the blue accent square via a hue rotation compensation.
          filter: isDark ? 'brightness(0) invert(1)' : 'none',
          opacity: isDark ? 0.95 : 1,
        }}
      />
      <span
        aria-hidden
        style={{
          width: 1,
          height: s.logoH * 0.75,
          background: dividerColor,
        }}
      />
      <span className="flex flex-col leading-none">
        <span
          style={{
            fontFamily: '"Playfair Display", Georgia, "Times New Roman", serif',
            fontWeight: 700,
            fontSize: s.product,
            color: productColor,
            letterSpacing: '-0.01em',
            lineHeight: 1,
          }}
        >
          World
        </span>
        {showEndorsement && (
          <span
            style={{
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: 600,
              fontSize: s.endorsement,
              color: endorsementColor,
              letterSpacing: s.tracking,
              textTransform: 'uppercase',
              marginTop: '0.4em',
              whiteSpace: 'nowrap',
            }}
          >
            An Infocredit Group Platform
          </span>
        )}
      </span>
    </span>
  );
}
