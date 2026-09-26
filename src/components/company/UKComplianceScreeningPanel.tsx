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
      // Paid but never screened (e.g. background trigger failed) → run it now
      if (!r && !cancelled) {
        setTriggering(true);
        try {
          await supabase.functions.invoke('complyadvantage-screen', { body: { order_item_id: orderItemId } });
          const { data: r2 } = await supabase
            .from('screening_results').select('*')
            .eq('order_item_id', orderItemId)
            .order('screened_at', { ascending: false }).limit(1).maybeSingle();
          if (r2 && !cancelled) {
            setResult(r2 as ScreeningResult);
            const { data: h2 } = await supabase.from('screening_entity_hits').select('*').eq('screening_result_id', r2.id);
            if (h2 && !cancelled) setHits(h2 as Hit[]);
          }
        } finally {
          if (!cancelled) setTriggering(false);
        }
      }
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
          Upgrade to <strong>UK Company Report + AML &amp; Compliance</strong> to screen the company, all officers and PSCs against
          global sanctions lists, PEPs and adverse media.
        </p>
        <button
          onClick={onUpgrade}
          className="w-full py-2 px-4 rounded-md font-medium text-sm text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--brand-primary)' }}
        >
          Upgrade to AML &amp; Compliance — €59
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

  // Adverse media is intentionally excluded — high-noise, low-signal for compliance files.
  const sanctionHits = hits.filter((h) => h.hit_type === 'sanction');
  const pepHits = hits.filter((h) => h.hit_type === 'pep');
  const enforcementHits = hits.filter((h) => h.hit_type === 'warning' || h.hit_type === 'fitness-probity');

  const verdict: Status =
    sanctionHits.length > 0 ? 'hit' : pepHits.length + enforcementHits.length > 0 ? 'review' : 'clear';
  const meta = STATUS_META[verdict];
  const Icon = meta.Icon;

  const entities = result.raw_response?.entities ?? [];
  const people = entities.filter((e) => e.role !== 'company');
  const pepByName = new Map<string, Hit[]>();
  for (const h of pepHits) {
    const k = h.entity_name.toLowerCase();
    pepByName.set(k, [...(pepByName.get(k) ?? []), h]);
  }

  return (
    <div
      className="rounded-lg border p-5"
      style={{ borderColor: 'var(--bg-border)', backgroundColor: '#fff' }}
    >
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: meta.bg }}
          >
            <Icon className="w-5 h-5" style={{ color: meta.color }} />
          </div>
          <div>
            <h2 className="font-semibold text-base" style={{ color: 'var(--text-subheading)' }}>
              Compliance &amp; AML Screening
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Sanctions · Politically Exposed Persons · Regulatory Enforcements
            </p>
          </div>
        </div>
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
          style={{ backgroundColor: meta.bg, color: meta.color }}
        >
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: meta.color }} />
          {verdict === 'clear' ? 'Verified Clear' : meta.label}
        </span>
      </div>

      <p className="text-[11px] mb-4" style={{ color: 'var(--text-muted)' }}>
        Screened on {formatStamp(result.screened_at)}
      </p>

      <ScreenedEntities
        entities={entities}
        fallbackCount={result.entities_screened}
        hits={[...sanctionHits, ...pepHits, ...enforcementHits]}
      />

      {/* 1. Sanctions */}
      <Section title="Sanctions Screening" subtitle="OFAC · UK OFSI · EU Consolidated · UN · SECO">
        {sanctionHits.length === 0 ? (
          <ClearSeal text="No sanctions matches found on any screened entity." />
        ) : (
          <div className="space-y-2">
            {sanctionHits.map((h) => (
              <HitRow key={h.id} hit={h} tone="hit" />
            ))}
          </div>
        )}
      </Section>

      {/* 2. PEP */}
      <Section title="Politically Exposed Persons (PEP)" subtitle="Directors, officers and persons with significant control">
        {people.length === 0 ? (
          <ClearSeal text="No individuals were available to screen." />
        ) : (
          <div className="space-y-1.5">
            {people.map((p, idx) => {
              const matches = pepByName.get(p.name.toLowerCase()) ?? [];
              const isPep = matches.length > 0;
              return (
                <div
                  key={`${p.name}-${idx}`}
                  className="flex items-start justify-between gap-3 rounded-md border px-3 py-2"
                  style={{
                    borderColor: isPep ? 'var(--risk-medium)' : 'var(--bg-border)',
                    backgroundColor: isPep ? 'var(--risk-medium-bg)' : '#fff',
                  }}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium" style={{ color: 'var(--text-heading)' }}>
                      {p.name}
                    </div>
                    <div className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      {ROLE_META[p.role]?.label ?? p.role}
                    </div>
                    {isPep && matches[0].source_lists?.length ? (
                      <p className="text-xs mt-1" style={{ color: 'var(--text-body)' }}>
                        {formatSources(matches[0].source_lists)}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-semibold flex-shrink-0"
                    style={{
                      backgroundColor: isPep ? 'var(--risk-medium)' : 'var(--risk-low-bg)',
                      color: isPep ? '#fff' : 'var(--risk-low)',
                    }}
                  >
                    {isPep ? 'PEP identified' : 'No PEP records'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* 3. Regulatory enforcements */}
      <Section
        title="Regulatory Enforcements &amp; Warnings"
        subtitle="Regulator fines, disciplinary actions and disqualifications"
      >
        {enforcementHits.length === 0 ? (
          <ClearSeal text="No regulatory enforcement actions or official warnings found." />
        ) : (
          <div className="space-y-2">
            {enforcementHits.map((h) => (
              <HitRow key={h.id} hit={h} tone="review" />
            ))}
          </div>
        )}
      </Section>

      <p className="text-[11px] mt-4 pt-3 border-t" style={{ color: 'var(--text-muted)', borderColor: 'var(--bg-border)' }}>
        Results are stored with your order. Screening is charged once — revisiting this tab does not re-run or re-charge it.
      </p>
    </div>
  );
}

function formatStamp(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })} at ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC`;
}

const SOURCE_LABELS: Record<string, string> = {
  'company-am': 'Corporate media monitoring',
  'fca-final-notices': 'UK FCA Final Notices',
  'ofac-civil-penalties': 'US OFAC Civil Penalties',
  'sec-litigation-releases': 'US SEC Litigation Releases',
  'uk-hmt-sanctions': 'UK HM Treasury Sanctions',
  'eu-consolidated': 'EU Consolidated Sanctions',
  'un-consolidated': 'UN Security Council Sanctions',
};

function prettySource(s: string) {
  return SOURCE_LABELS[s] ?? s.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatSources(list: string[]) {
  const named = list.slice(0, 3).map(prettySource);
  return `Sources: ${named.join(', ')}${list.length > 3 ? ` +${list.length - 3} more` : ''}`;
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-2">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
          {title.replace('&amp;', '&')}
        </h3>
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function ClearSeal({ text }: { text: string }) {
  return (
    <div
      className="flex items-center gap-2 rounded-md border px-3 py-2.5"
      style={{ borderColor: 'var(--risk-low)', backgroundColor: 'var(--risk-low-bg)' }}
    >
      <ShieldCheck className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--risk-low)' }} />
      <span className="text-sm" style={{ color: 'var(--text-body)' }}>{text}</span>
    </div>
  );
}

function HitRow({ hit, tone }: { hit: Hit; tone: Status }) {
  const tm = STATUS_META[tone];
  return (
    <div className="rounded-md border p-3" style={{ borderColor: tm.color, backgroundColor: tm.bg }}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-medium text-sm" style={{ color: 'var(--text-heading)' }}>{hit.entity_name}</span>
        {hit.entity_role && (
          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ backgroundColor: '#fff', color: 'var(--text-muted)' }}>
            {ROLE_META[hit.entity_role]?.label ?? hit.entity_role}
          </span>
        )}
        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold" style={{ backgroundColor: tm.color, color: '#fff' }}>
          {HIT_TYPE_LABEL[hit.hit_type] ?? hit.hit_type}
        </span>
        {hit.match_strength && (
          <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {hit.match_strength} match
          </span>
        )}
      </div>
      {hit.source_lists && hit.source_lists.length > 0 && (
        <p className="text-xs mt-1" style={{ color: 'var(--text-body)' }}>{formatSources(hit.source_lists)}</p>
      )}
    </div>
  );
}

const ROLE_META: Record<string, { label: string; Icon: typeof Building2 }> = {
  company: { label: 'Company', Icon: Building2 },
  officer: { label: 'Officers', Icon: User },
  shareholder: { label: 'Shareholders', Icon: Users },
  psc: { label: 'Persons with Significant Control', Icon: Users },
};

const ROLE_ORDER = ['company', 'officer', 'psc', 'shareholder'];

function ScreenedEntities({
  entities,
  fallbackCount,
  hits,
}: {
  entities: ScreenedEntity[];
  fallbackCount: number;
  hits: Hit[];
}) {
  const [open, setOpen] = useState(false);

  const grouped = useMemo(() => {
    const groups: Record<string, ScreenedEntity[]> = {};
    for (const e of entities) {
      const key = e.role || 'other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    }
    return groups;
  }, [entities]);

  const hitNames = useMemo(() => {
    const s = new Set<string>();
    for (const h of hits) s.add(h.entity_name.toLowerCase());
    return s;
  }, [hits]);

  if (!entities.length) {
    return (
      <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
        {fallbackCount} entit{fallbackCount === 1 ? 'y' : 'ies'} screened.
      </p>
    );
  }

  const orderedKeys = ROLE_ORDER.filter((k) => grouped[k]?.length);
  for (const k of Object.keys(grouped)) if (!orderedKeys.includes(k)) orderedKeys.push(k);

  return (
    <div
      className="mb-3 rounded-md border"
      style={{ borderColor: 'var(--bg-border)', backgroundColor: 'var(--bg-subtle)' }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm"
        style={{ color: 'var(--text-body)' }}
      >
        <span>
          <strong style={{ color: 'var(--text-heading)' }}>{entities.length}</strong>{' '}
          entit{entities.length === 1 ? 'y' : 'ies'} screened
          <span style={{ color: 'var(--text-muted)' }}>
            {' '}
            ·{' '}
            {orderedKeys
              .map((k) => `${grouped[k].length} ${ROLE_META[k]?.label.toLowerCase() ?? k}`)
              .join(' · ')}
          </span>
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 border-t space-y-3" style={{ borderColor: 'var(--bg-border)' }}>
          {orderedKeys.map((key) => {
            const meta = ROLE_META[key] ?? { label: key, Icon: User };
            const RoleIcon = meta.Icon;
            return (
              <div key={key}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <RoleIcon className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                  <span
                    className="text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {meta.label} ({grouped[key].length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {grouped[key].map((e, idx) => {
                    const isHit = hitNames.has(e.name.toLowerCase());
                    return (
                      <span
                        key={`${e.name}-${idx}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border"
                        style={{
                          backgroundColor: isHit ? 'var(--risk-high-bg)' : '#fff',
                          borderColor: isHit ? 'var(--risk-high)' : 'var(--bg-border)',
                          color: isHit ? 'var(--risk-high)' : 'var(--text-body)',
                        }}
                        title={isHit ? 'Match found — see details below' : 'No matches'}
                      >
                        {isHit ? (
                          <ShieldX className="w-3 h-3" />
                        ) : (
                          <ShieldCheck className="w-3 h-3" style={{ color: 'var(--risk-low)' }} />
                        )}
                        {e.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
