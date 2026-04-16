import React from 'react';

interface CountryFlagProps {
  iso2?: string | null;
  emoji?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  rounded?: boolean;
  className?: string;
  title?: string;
}

const SIZE_MAP = {
  sm: { px: 16, text: 'text-sm' },
  md: { px: 24, text: 'text-xl' },
  lg: { px: 36, text: 'text-3xl' },
  xl: { px: 56, text: 'text-5xl' },
  hero: { px: 96, text: 'text-7xl' },
};

/**
 * CountryFlag — renders SVG flag from flagcdn (no API key, CDN cached)
 * with emoji fallback. Crisp at any size, accessible.
 */
export default function CountryFlag({
  iso2,
  emoji,
  size = 'md',
  rounded = true,
  className = '',
  title,
}: CountryFlagProps) {
  const { px, text } = SIZE_MAP[size];
  const code = iso2?.toLowerCase();

  // flagcdn supported widths — snap requested width up to nearest valid one
  const VALID_WIDTHS = [20, 40, 80, 160, 320, 640, 1280, 2560];
  const snap = (w: number) => VALID_WIDTHS.find((v) => v >= w) ?? 2560;

  if (code) {
    const w1 = snap(px);
    const w2 = snap(px * 2);
    return (
      <img
        src={`https://flagcdn.com/w${w1}/${code}.png`}
        srcSet={`https://flagcdn.com/w${w1}/${code}.png 1x, https://flagcdn.com/w${w2}/${code}.png 2x`}
        width={px}
        height={Math.round(px * 0.66)}
        alt={title ?? `${iso2} flag`}
        title={title ?? iso2 ?? ''}
        loading="lazy"
        className={`inline-block object-cover shadow-sm ${rounded ? 'rounded-sm' : ''} ${className}`}
        style={{ width: px, height: Math.round(px * 0.66) }}
      />
    );
  }

  if (emoji) {
    return (
      <span className={`inline-block ${text} ${className}`} title={title}>
        {emoji}
      </span>
    );
  }

  return (
    <span
      className={`inline-block bg-slate-200 ${rounded ? 'rounded-sm' : ''} ${className}`}
      style={{ width: px, height: Math.round(px * 0.66) }}
      aria-hidden
    />
  );
}
