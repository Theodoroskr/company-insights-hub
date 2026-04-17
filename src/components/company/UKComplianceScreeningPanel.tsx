import React, { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, ShieldAlert, ShieldX, ChevronDown, ChevronUp, Loader2, ExternalLink, Building2, User, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  orderItemId: string;
  isEnhanced: boolean;
  onUpgrade?: () => void;
}

type Status = 'pending' | 'clear' | 'review' | 'hit' | 'error';

interface ScreeningResult {
  id: string;
  overall_status: Status;
  total_hits: number;
  sanctions_hits: number;
  pep_hits: number;
  adverse_media_hits: number;
  entities_screened: number;
  screened_at: string;
  error: string | null;
  raw_response?: { entities?: ScreenedEntity[] } | null;
}

interface ScreenedEntity {
  name: string;
  role: 'company' | 'officer' | 'shareholder' | 'psc' | string;
}

interface Hit {
  id: string;
  entity_name: string;
  entity_role: string | null;
  hit_type: string;
  match_strength: string | null;
  source_lists: string[] | null;
  share_url: string | null;
}

const STATUS_META: Record<Status, { color: string; bg: string; label: string; Icon: typeof ShieldCheck }> = {
  clear: { color: 'var(--risk-low)', bg: 'var(--risk-low-bg)', label: 'Clear', Icon: ShieldCheck },
  review: { color: 'var(--risk-medium)', bg: 'var(--risk-medium-bg)', label: 'Review Required', Icon: ShieldAlert },
  hit: { color: 'var(--risk-high)', bg: 'var(--risk-high-bg)', label: 'Sanctions Match', Icon: ShieldX },
  pending: { color: 'var(--text-muted)', bg: 'var(--bg-subtle)', label: 'Screening…', Icon: Loader2 },
  error: { color: 'var(--risk-high)', bg: 'var(--risk-high-bg)', label: 'Screening Failed', Icon: ShieldX },
};

const HIT_TYPE_LABEL: Record<string, string> = {
  sanction: 'Sanctions',
  pep: 'PEP',
  'adverse-media': 'Adverse Media',
  warning: 'Warning',
  'fitness-probity': 'Fitness & Probity',
};

export default function UKComplianceScreeningPanel({ orderItemId, isEnhanced, onUpgrade }: Props) {
  const [result, setResult] = useState<ScreeningResult | null>(null);
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    if (!isEnhanced || !orderItemId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data: r } = await supabase
        .from('screening_results')
        .select('*')
        .eq('order_item_id', orderItemId)
        .order('screened_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (r) {
        setResult(r as ScreeningResult);
        const { data: h } = await supabase
          .from('screening_entity_hits')
          .select('*')
          .eq('screening_result_id', r.id);
        if (!cancelled && h) setHits(h as Hit[]);
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [orderItemId, isEnhanced]);

  // Locked teaser when user only has the standard report
  if (!isEnhanced) {
    return (
      <div
        className="rounded-lg border p-5 relative overflow-hidden"
        style={{ borderColor: 'var(--bg-border)', backgroundColor: '#fff' }}
      >
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--brand-primary-bg)' }}
          >
            <ShieldCheck className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-base" style={{ color: 'var(--text-subheading)' }}>
              Compliance Screening
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Sanctions · PEP · Adverse Media — Powered by WorldAML
            </p>
          </div>
        </div>
        <div
          className="rounded-md border p-4 grid grid-cols-3 gap-3 mb-4"
          style={{ borderColor: 'var(--bg-border)', backgroundColor: 'var(--bg-subtle)' }}
        >
          {(['Sanctions', 'PEP', 'Adverse Media'] as const).map((label) => (
            <div key={label} className="text-center">
              <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                {label}
              </div>
              <div className="text-base font-semibold blur-sm select-none" style={{ color: 'var(--text-heading)' }}>
                ● ● ●
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm mb-3" style={{ color: 'var(--text-body)' }}>
          Upgrade to <strong>Enhanced UK KYB Report</strong> to screen the company, all officers and PSCs against
          global sanctions lists, PEPs and adverse media.
        </p>
        <button
          onClick={onUpgrade}
          className="w-full py-2 px-4 rounded-md font-medium text-sm text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--brand-primary)' }}
        >
          Upgrade to Enhanced UK KYB — £59
        </button>
      </div>
    );
  }

  const handleRunScreening = async () => {
    setTriggering(true);
    try {
      await supabase.functions.invoke('complyadvantage-screen', { body: { order_item_id: orderItemId } });
      // reload
      const { data: r } = await supabase
        .from('screening_results')
        .select('*')
        .eq('order_item_id', orderItemId)
        .order('screened_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (r) {
        setResult(r as ScreeningResult);
        const { data: h } = await supabase
          .from('screening_entity_hits')
          .select('*')
          .eq('screening_result_id', r.id);
        if (h) setHits(h as Hit[]);
      }
    } finally {
      setTriggering(false);
    }
  };

  if (loading) {
    return (
      <div
        className="rounded-lg border p-5 flex items-center gap-3"
        style={{ borderColor: 'var(--bg-border)', backgroundColor: '#fff' }}
      >
        <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--text-muted)' }} />
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Loading compliance screening…
        </span>
      </div>
    );
  }

  if (!result) {
    return (
      <div
        className="rounded-lg border p-5"
        style={{ borderColor: 'var(--bg-border)', backgroundColor: '#fff' }}
      >
        <div className="flex items-start gap-3 mb-3">
          <ShieldAlert className="w-5 h-5 mt-0.5" style={{ color: 'var(--text-muted)' }} />
          <div className="flex-1">
            <h2 className="font-semibold text-base" style={{ color: 'var(--text-subheading)' }}>
              Compliance Screening
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Screening has not been run yet for this report.
            </p>
          </div>
        </div>
        <button
          onClick={handleRunScreening}
          disabled={triggering}
          className="py-2 px-4 rounded-md font-medium text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-60 inline-flex items-center gap-2"
          style={{ backgroundColor: 'var(--brand-primary)' }}
        >
          {triggering && <Loader2 className="w-4 h-4 animate-spin" />}
          {triggering ? 'Running screening…' : 'Run Compliance Screening'}
        </button>
      </div>
    );
  }

  const meta = STATUS_META[result.overall_status];
  const Icon = meta.Icon;

  const tiles: Array<{ label: string; count: number; tone: Status }> = [
    { label: 'Sanctions', count: result.sanctions_hits, tone: result.sanctions_hits > 0 ? 'hit' : 'clear' },
    { label: 'PEP', count: result.pep_hits, tone: result.pep_hits > 0 ? 'review' : 'clear' },
    { label: 'Adverse Media', count: result.adverse_media_hits, tone: result.adverse_media_hits > 0 ? 'review' : 'clear' },
  ];

  return (
    <div
      className="rounded-lg border p-5"
      style={{ borderColor: 'var(--bg-border)', backgroundColor: '#fff' }}
    >
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: meta.bg }}
          >
            <Icon className="w-5 h-5" style={{ color: meta.color }} />
          </div>
          <div>
            <h2 className="font-semibold text-base" style={{ color: 'var(--text-subheading)' }}>
              Compliance Screening
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Sanctions · PEP · Adverse Media · Powered by WorldAML
            </p>
          </div>
        </div>
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
          style={{ backgroundColor: meta.bg, color: meta.color }}
        >
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: meta.color }} />
          {meta.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        {tiles.map((t) => {
          const tm = STATUS_META[t.tone];
          return (
            <div
              key={t.label}
              className="rounded-md border p-3"
              style={{ borderColor: 'var(--bg-border)', backgroundColor: tm.bg }}
            >
              <div className="text-[11px] font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                {t.label}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-semibold" style={{ color: tm.color }}>{t.count}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {t.count === 0 ? 'no matches' : t.count === 1 ? 'match' : 'matches'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {hits.length > 0 && (
        <>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-center justify-between py-2 px-3 rounded-md text-sm transition-colors hover:bg-[var(--bg-subtle)]"
            style={{ color: 'var(--text-body)' }}
          >
            <span>{expanded ? 'Hide' : 'Show'} {hits.length} match{hits.length === 1 ? '' : 'es'}</span>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {expanded && (
            <div className="mt-2 border-t pt-3" style={{ borderColor: 'var(--bg-border)' }}>
              <div className="space-y-2">
                {hits.map((h) => {
                  const tone: Status = h.hit_type === 'sanction' ? 'hit' : 'review';
                  const tm = STATUS_META[tone];
                  return (
                    <div
                      key={h.id}
                      className="rounded-md border p-3 flex items-start justify-between gap-3"
                      style={{ borderColor: 'var(--bg-border)' }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm" style={{ color: 'var(--text-heading)' }}>
                            {h.entity_name}
                          </span>
                          {h.entity_role && (
                            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                              {h.entity_role}
                            </span>
                          )}
                          <span
                            className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold"
                            style={{ backgroundColor: tm.bg, color: tm.color }}
                          >
                            {HIT_TYPE_LABEL[h.hit_type] ?? h.hit_type}
                          </span>
                          {h.match_strength && (
                            <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                              {h.match_strength} match
                            </span>
                          )}
                        </div>
                        {h.source_lists && h.source_lists.length > 0 && (
                          <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-muted)' }}>
                            Sources: {h.source_lists.slice(0, 4).join(', ')}{h.source_lists.length > 4 ? '…' : ''}
                          </p>
                        )}
                      </div>
                      {h.share_url && (
                        <a
                          href={h.share_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs inline-flex items-center gap-1 hover:underline flex-shrink-0"
                          style={{ color: 'var(--brand-primary)' }}
                        >
                          View <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      <p className="text-[11px] mt-3" style={{ color: 'var(--text-muted)' }}>
        Screened {new Date(result.screened_at).toLocaleString('en-GB')} · WorldAML
      </p>
    </div>
  );
}
