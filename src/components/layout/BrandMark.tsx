// ============================================================
// BrandMark
// Refined logo lockup: monogram mark + serif wordmark.
// Used in the navbar and footer. Adapts colors to the surface
// (light surface uses navy text; dark surface uses white text).
// ============================================================

import React from 'react';
import icwMark from '../../assets/icw-mark.png';

interface BrandMarkProps {
  brandName: string;
  variant?: 'light' | 'dark';     // surface the mark is shown on
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE = {
  sm: { mark: 22, primary: '0.95rem', secondary: '0.55rem', tracking: '0.18em' },
  md: { mark: 30, primary: '1.15rem', secondary: '0.6rem',  tracking: '0.22em' },
  lg: { mark: 40, primary: '1.5rem',  secondary: '0.65rem', tracking: '0.24em' },
} as const;

export default function BrandMark({
  brandName,
  variant = 'light',
  size = 'md',
  className = '',
}: BrandMarkProps) {
  const s = SIZE[size];
  const isDark = variant === 'dark';

  // Split the brand into a primary + tail, e.g. "Infocredit World"
  // becomes "Infocredit" / "World" so the wordmark gets a hierarchy.
  const parts = brandName.trim().split(/\s+/);
  const primary = parts[0];
  const tail = parts.slice(1).join(' ');

  const primaryColor   = isDark ? '#FFFFFF' : 'var(--brand-primary, #0F2444)';
  const secondaryColor = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(15,36,68,0.55)';
  const accentColor    = '#C9A84C';

  return (
    <span className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <img
        src={icwMark}
        alt=""
        width={s.mark}
        height={s.mark}
        loading="eager"
        decoding="async"
        style={{
          width: s.mark,
          height: s.mark,
          objectFit: 'contain',
          // Invert the navy mark to white on dark surfaces while preserving
          // the gold ring intensity through brightness compensation.
          filter: isDark ? 'brightness(0) invert(1)' : 'none',
          opacity: isDark ? 0.95 : 1,
        }}
      />
      <span className="flex flex-col leading-none">
        <span
          style={{
            fontFamily: '"Playfair Display", Georgia, "Times New Roman", serif',
            fontWeight: 700,
            fontSize: s.primary,
            color: primaryColor,
            letterSpacing: '-0.01em',
            lineHeight: 1,
          }}
        >
          {primary}
          {tail && (
            <span style={{ color: accentColor, marginLeft: '0.15em' }}>·</span>
          )}
        </span>
        {tail && (
          <span
            style={{
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: 600,
              fontSize: s.secondary,
              color: secondaryColor,
              letterSpacing: s.tracking,
              textTransform: 'uppercase',
              marginTop: '0.32em',
            }}
          >
            {tail}
          </span>
        )}
      </span>
    </span>
  );
}
