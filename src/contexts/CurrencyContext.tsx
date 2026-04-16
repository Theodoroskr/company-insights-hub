import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { supabase } from '@/integrations/supabase/client';

export type Currency = 'EUR' | 'GBP' | 'USD' | 'CHF' | 'AED';

export const SUPPORTED_CURRENCIES: Currency[] = ['EUR', 'GBP', 'USD', 'CHF', 'AED'];

export const CURRENCY_META: Record<Currency, { symbol: string; label: string; flag: string }> = {
  EUR: { symbol: '€', label: 'Euro', flag: '🇪🇺' },
  GBP: { symbol: '£', label: 'British Pound', flag: '🇬🇧' },
  USD: { symbol: '$', label: 'US Dollar', flag: '🇺🇸' },
  CHF: { symbol: 'CHF', label: 'Swiss Franc', flag: '🇨🇭' },
  AED: { symbol: 'AED', label: 'UAE Dirham', flag: '🇦🇪' },
};

const FALLBACK: Record<Currency, number> = {
  EUR: 1,
  GBP: 0.85,
  USD: 1.08,
  CHF: 0.96,
  AED: 3.97,
};

const STORAGE_KEY = 'ch_currency_v1';

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  rates: Record<Currency, number>; // 1 EUR = X currency
  rate: number;                     // shortcut for current
  /** Convert an amount expressed in EUR into the active currency */
  convert: (eurAmount: number) => number;
  /** Format an EUR amount in the active currency, e.g. "€42.00", "£35.70" */
  format: (eurAmount: number, opts?: { decimals?: number }) => string;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: 'EUR',
  setCurrency: () => {},
  rates: FALLBACK,
  rate: 1,
  convert: (v) => v,
  format: (v) => `€${v.toFixed(2)}`,
  isLoading: true,
});

function readPersisted(): Currency {
  try {
    const v = localStorage.getItem(STORAGE_KEY) as Currency | null;
    if (v && SUPPORTED_CURRENCIES.includes(v)) return v;
  } catch { /* ignore */ }
  return 'EUR';
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(readPersisted);
  const [rates, setRates] = useState<Record<Currency, number>>(FALLBACK);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase.functions
      .invoke('fx-rates', { body: {} })
      .then(({ data }) => {
        if (cancelled) return;
        const incoming = (data?.rates ?? {}) as Partial<Record<Currency, number>>;
        const merged: Record<Currency, number> = { ...FALLBACK };
        for (const c of SUPPORTED_CURRENCIES) {
          if (typeof incoming[c] === 'number' && (incoming[c] as number) > 0) {
            merged[c] = incoming[c] as number;
          }
        }
        setRates(merged);
        setIsLoading(false);
      })
      .catch(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    try { localStorage.setItem(STORAGE_KEY, c); } catch { /* ignore */ }
  }, []);

  const value = useMemo<CurrencyContextValue>(() => {
    const rate = rates[currency] ?? 1;
    const symbol = CURRENCY_META[currency].symbol;
    const isPrefixSymbol = ['EUR', 'GBP', 'USD'].includes(currency);
    const convert = (eur: number) => eur * rate;
    const format = (eur: number, opts?: { decimals?: number }) => {
      const decimals = opts?.decimals ?? 2;
      const amt = (eur * rate).toFixed(decimals);
      return isPrefixSymbol ? `${symbol}${amt}` : `${amt} ${symbol}`;
    };
    return { currency, setCurrency, rates, rate, convert, format, isLoading };
  }, [currency, rates, setCurrency, isLoading]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  return useContext(CurrencyContext);
}
