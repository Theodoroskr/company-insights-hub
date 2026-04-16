import React, { useEffect, useMemo, useState } from 'react';
import CountryFlag from '../ui/CountryFlag';
import type { Country } from '../../types/database';

interface LiveActivityTickerProps {
  countries: Country[];
}

const ACTIONS = [
  { verb: 'KYB report delivered', tone: 'success' },
  { verb: 'Structure report ordered', tone: 'info' },
  { verb: 'Tender pack assembled', tone: 'info' },
  { verb: 'Counterparty verified', tone: 'success' },
  { verb: 'Country risk pulled', tone: 'info' },
  { verb: 'Director profile expanded', tone: 'info' },
  { verb: 'Sanctions check cleared', tone: 'success' },
  { verb: 'Bid documentation downloaded', tone: 'info' },
] as const;

const NOW_OFFSETS = ['just now', '12s ago', '34s ago', '1m ago', '2m ago', '3m ago', '5m ago'];

interface Activity {
  id: number;
  country: Country;
  action: typeof ACTIONS[number];
  when: string;
}

/**
 * LiveActivityTicker — animated marquee of anonymized cross-border activity.
 * Pure UI (deterministic from countries list). No PII.
 */
export default function LiveActivityTicker({ countries }: LiveActivityTickerProps) {
  const eligible = useMemo(
    () => countries.filter((c) => c.iso2 && c.coverage_tier !== 'on_request'),
    [countries]
  );

  const [seed, setSeed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSeed((s) => s + 1), 4500);
    return () => clearInterval(t);
  }, []);

  const items: Activity[] = useMemo(() => {
    if (eligible.length === 0) return [];
    return Array.from({ length: 12 }, (_, i) => {
      const c = eligible[(i * 7 + seed * 3) % eligible.length];
      const a = ACTIONS[(i * 3 + seed) % ACTIONS.length];
      const w = NOW_OFFSETS[i % NOW_OFFSETS.length];
      return { id: i + seed * 100, country: c, action: a, when: w };
    });
  }, [eligible, seed]);

  if (items.length === 0) return null;

  // Duplicate for seamless marquee
  const looped = [...items, ...items];

  return (
    <div className="relative w-full overflow-hidden py-3" style={{ backgroundColor: 'var(--bg-subtle)', borderTop: '1px solid var(--bg-border)', borderBottom: '1px solid var(--bg-border)' }}>
      {/* Edge fades */}
      <div className="absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none" style={{ background: 'linear-gradient(90deg, var(--bg-subtle) 0%, transparent 100%)' }} />
      <div className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none" style={{ background: 'linear-gradient(270deg, var(--bg-subtle) 0%, transparent 100%)' }} />

      <div className="flex items-center gap-3 marquee-track" style={{ width: 'max-content' }}>
        {/* LIVE pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex-shrink-0" style={{ backgroundColor: 'var(--risk-high-bg)', color: 'var(--risk-high)' }}>
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: 'var(--risk-high)' }} />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: 'var(--risk-high)' }} />
          </span>
          Live
        </div>

        {looped.map((item, i) => (
          <div
            key={`${item.id}-${i}`}
            className="flex items-center gap-2 px-3 py-1 rounded-full whitespace-nowrap flex-shrink-0"
            style={{ backgroundColor: '#fff', border: '1px solid var(--bg-border)' }}
          >
            <CountryFlag iso2={item.country.iso2} emoji={item.country.flag_emoji} size="sm" />
            <span className="text-xs font-medium" style={{ color: 'var(--text-body)' }}>
              {item.action.verb}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>·</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.country.name}</span>
            <span className="text-xs" style={{ color: 'var(--text-placeholder)' }}>· {item.when}</span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track {
          animation: marquee 60s linear infinite;
        }
        .marquee-track:hover { animation-play-state: paused; }
      `}</style>
    </div>
  );
}
