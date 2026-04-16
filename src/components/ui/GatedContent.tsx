import React, { ReactNode } from 'react';

interface GatedContentProps {
  isUnlocked: boolean;
  message: string;
  children: ReactNode;
  ctaLabel?: string;
  onCta?: () => void;
}

export default function GatedContent({
  isUnlocked,
  message,
  children,
  ctaLabel,
  onCta,
}: GatedContentProps) {
  if (isUnlocked) {
    return <>{children}</>;
  }

  return (
    <div className="relative rounded-lg" style={{ minHeight: ctaLabel ? '180px' : '120px' }}>
      {/* Blurred content behind the overlay */}
      <div
        style={{
          filter: 'blur(5px)',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Lock overlay */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg"
        style={{ backgroundColor: 'rgba(248, 250, 252, 0.9)' }}
      >
        <span className="text-2xl" role="img" aria-label="locked">
          🔒
        </span>
        <p
          className="text-sm font-medium text-center max-w-xs px-4 leading-snug"
          style={{ color: 'var(--text-subheading)' }}
        >
          {message}
        </p>
        {ctaLabel && onCta && (
          <button
            onClick={onCta}
            className="mt-1 px-5 py-2 rounded text-sm font-semibold text-white transition-all active:scale-95"
            style={{
              backgroundColor: 'var(--brand-accent)',
              borderRadius: '6px',
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.backgroundColor = 'var(--brand-accent-hover)')
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.backgroundColor = 'var(--brand-accent)')
            }
          >
            {ctaLabel}
          </button>
        )}
      </div>
    </div>
  );
}
