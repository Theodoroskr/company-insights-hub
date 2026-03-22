import React from 'react';

interface LoadingSkeletonProps {
  lines?: number;
  className?: string;
}

export default function LoadingSkeleton({
  lines = 3,
  className = '',
}: LoadingSkeletonProps) {
  return (
    <div className={`space-y-3 ${className}`} aria-busy="true" aria-label="Loading">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded skeleton-shimmer"
          style={{
            width: i === lines - 1 ? '60%' : '100%',
            background: 'linear-gradient(90deg, #f0f4f8 25%, #e2e8f0 50%, #f0f4f8 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
          }}
        />
      ))}
    </div>
  );
}

// Card skeleton variant
export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-lg border p-6 space-y-4 ${className}`}
      style={{ borderColor: 'var(--bg-border)' }}
      aria-busy="true"
    >
      <div
        className="h-6 rounded w-3/4 skeleton-shimmer"
        style={{
          background: 'linear-gradient(90deg, #f0f4f8 25%, #e2e8f0 50%, #f0f4f8 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
        }}
      />
      <LoadingSkeleton lines={3} />
    </div>
  );
}
