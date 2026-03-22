import React from 'react';

type StatusType = 'Active' | 'Dissolved' | 'Inactive' | string;

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  Active: {
    bg: '#DCFCE7',
    text: '#16A34A',
    label: 'Active',
  },
  Dissolved: {
    bg: '#FEE2E2',
    text: '#DC2626',
    label: 'Dissolved',
  },
  Inactive: {
    bg: '#F3F4F6',
    text: '#6B7280',
    label: 'Inactive',
  },
};

function normalise(status: string): string {
  const s = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  return s;
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const key = normalise(status);
  const config = STATUS_CONFIG[key] ?? {
    bg: '#F3F4F6',
    text: '#6B7280',
    label: status,
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}
      style={{ backgroundColor: config.bg, color: config.text }}
    >
      {config.label}
    </span>
  );
}
