import React from 'react';
import { useTenant } from '@/lib/tenant';
import { getVatRate } from '@/lib/tenantConfig';

interface PriceDisplayProps {
  basePrice: number;
  serviceFee?: number;
  /** Override VAT rate; if omitted, derived from active tenant */
  vatRate?: number;
  currency?: string;
  showBreakdown?: boolean;
  className?: string;
}

function formatCurrency(amount: number, currency: string): string {
  const symbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  return `${symbol}${amount.toFixed(2)}`;
}

export default function PriceDisplay({
  basePrice,
  serviceFee = 0,
  vatRate,
  currency = 'EUR',
  showBreakdown = false,
  className = '',
}: PriceDisplayProps) {
  const subtotal = basePrice + serviceFee;
  const vatAmount = subtotal * vatRate;
  const total = subtotal + vatAmount;

  if (!showBreakdown) {
    return (
      <span
        className={`font-bold tabular-nums ${className}`}
        style={{ color: 'var(--text-heading)' }}
      >
        {formatCurrency(basePrice, currency)}
      </span>
    );
  }

  return (
    <div className={`space-y-1 text-sm ${className}`}>
      <div className="flex justify-between">
        <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
        <span className="tabular-nums" style={{ color: 'var(--text-body)' }}>
          {formatCurrency(subtotal, currency)}
        </span>
      </div>
      {serviceFee > 0 && (
        <div className="flex justify-between">
          <span style={{ color: 'var(--text-muted)' }}>Service fee</span>
          <span className="tabular-nums" style={{ color: 'var(--text-body)' }}>
            {formatCurrency(serviceFee, currency)}
          </span>
        </div>
      )}
      <div className="flex justify-between">
        <span style={{ color: 'var(--text-muted)' }}>
          VAT ({(vatRate * 100).toFixed(0)}%)
        </span>
        <span className="tabular-nums" style={{ color: 'var(--text-body)' }}>
          {formatCurrency(vatAmount, currency)}
        </span>
      </div>
      <div
        className="flex justify-between font-semibold pt-1 border-t"
        style={{ borderColor: 'var(--bg-border)' }}
      >
        <span style={{ color: 'var(--text-heading)' }}>Total</span>
        <span
          className="tabular-nums text-base"
          style={{ color: 'var(--brand-accent)' }}
        >
          {formatCurrency(total, currency)}
        </span>
      </div>
    </div>
  );
}
