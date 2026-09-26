// ============================================================
// BrandMark
// Infocredit World — an Infocredit Group platform.
// Renders the official Infocredit World wordmark (uploaded
// infocreditworld-wordmark.svg, inlined so the navy/blue colors
// can adapt to light and dark surfaces) plus an optional
// "An Infocredit Group platform" endorsement line.
// ============================================================

import React from 'react';

interface BrandMarkProps {
  brandName: string;            // kept for API compatibility (unused for visuals)
  variant?: 'light' | 'dark';   // surface the mark is shown on
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showEndorsement?: boolean;    // show "An Infocredit Group platform" endorsement line
  tagline?: string;             // small line rendered under the wordmark (replaces endorsement)
}

const SIZE = {
  sm: { logoH: 22, endorsement: '0.55rem', tagline: '0.62rem', tracking: '0.18em' },
  md: { logoH: 30, endorsement: '0.6rem',  tagline: '0.68rem', tracking: '0.22em' },
  lg: { logoH: 40, endorsement: '0.65rem', tagline: '0.74rem', tracking: '0.24em' },
} as const;

// Inline wordmark so the brand colors can flip on dark surfaces
// (navy text → white) while the blue accent stays blue.
function Wordmark({ height, isDark }: { height: number; isDark: boolean }) {
  const navy = isDark ? '#FFFFFF' : '#14294C';
  const blue = '#00A9E8';
  const width = (height / 88) * 600;

  return (
    <svg
      viewBox="0 0 600 88"
      width={width}
      height={height}
      role="img"
      aria-label="Infocredit World"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <title>infocreditworld</title>
      <rect x="2" y="7" width="10" height="10" fill={blue} />
      <rect x="4" y="25" width="7" height="40" fill={navy} />
      <text x="16" y="63" fontFamily="Arial, Helvetica, sans-serif" fontSize="62" letterSpacing="-2.5">
        <tspan fill={navy}>nfocredit</tspan>
        <tspan fill={blue} fontWeight="700">world</tspan>
      </text>
    </svg>
  );
}

export default function BrandMark({
  variant = 'light',
  size = 'md',
  className = '',
  showEndorsement = true,
}: BrandMarkProps) {
  const s = SIZE[size];
  const isDark = variant === 'dark';

  const endorsementColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(15,36,68,0.55)';
  const dividerColor     = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(15,36,68,0.18)';

  return (
    <span className={`inline-flex items-center gap-3 select-none ${className}`}>
      <Wordmark height={s.logoH} isDark={isDark} />
      {showEndorsement && (
        <>
          <span
            aria-hidden
            style={{
              width: 1,
              height: s.logoH * 0.75,
              background: dividerColor,
            }}
          />
          <span
            style={{
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: 600,
              fontSize: s.endorsement,
              color: endorsementColor,
              letterSpacing: s.tracking,
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            An Infocredit Group Platform
          </span>
        </>
      )}
    </span>
  );
}
