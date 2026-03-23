import React from 'react';

interface EmptyStateProps {
  message?: string;
}

export default function EmptyState({ message = 'No Data' }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      {/* Document with X SVG */}
      <svg
        width="80"
        height="96"
        viewBox="0 0 80 96"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Document body */}
        <rect x="8" y="4" width="56" height="72" rx="6" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="2" />
        {/* Folded corner */}
        <path d="M48 4 L64 20 L48 20 Z" fill="#CBD5E1" />
        <path d="M48 4 L64 20 H48 V4Z" fill="#E2E8F0" />
        {/* Text lines */}
        <rect x="18" y="30" width="28" height="3" rx="1.5" fill="#CBD5E1" />
        <rect x="18" y="38" width="36" height="3" rx="1.5" fill="#CBD5E1" />
        <rect x="18" y="46" width="22" height="3" rx="1.5" fill="#CBD5E1" />
        {/* X mark circle */}
        <circle cx="54" cy="72" r="18" fill="#FEE2E2" />
        <line x1="46" y1="64" x2="62" y2="80" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
        <line x1="62" y1="64" x2="46" y2="80" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
        {message}
      </p>
    </div>
  );
}
