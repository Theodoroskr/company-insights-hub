import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import {
  useCurrency,
  SUPPORTED_CURRENCIES,
  CURRENCY_META,
  type Currency,
} from '@/contexts/CurrencyContext';

export default function CurrencySwitcher({ compact = false }: { compact?: boolean }) {
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const meta = CURRENCY_META[currency];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors hover:bg-[var(--bg-subtle)]"
        style={{ color: 'var(--text-body)' }}
        aria-label="Change currency"
      >
        <span className="text-base leading-none">{meta.flag}</span>
        {!compact && <span className="tabular-nums">{currency}</span>}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border z-50 min-w-[180px] overflow-hidden"
          style={{ borderColor: 'var(--bg-border)' }}
        >
          <p
            className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider font-semibold"
            style={{ color: 'var(--text-muted)' }}
          >
            Currency
          </p>
          {SUPPORTED_CURRENCIES.map((c: Currency) => {
            const m = CURRENCY_META[c];
            const active = c === currency;
            return (
              <button
                key={c}
                type="button"
                onClick={() => { setCurrency(c); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors hover:bg-[var(--bg-subtle)]"
                style={{ color: 'var(--text-body)' }}
              >
                <span className="text-base">{m.flag}</span>
                <span className="font-medium">{c}</span>
                <span className="text-xs flex-1" style={{ color: 'var(--text-muted)' }}>
                  {m.label}
                </span>
                {active && <Check className="w-3.5 h-3.5" style={{ color: 'var(--brand-accent)' }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
