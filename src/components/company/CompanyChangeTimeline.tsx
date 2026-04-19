// ============================================================
// CompanyChangeTimeline
// Vertical timeline of change_events for the company. Falls back
// to a synthetic timeline (incorporation, status, last refresh)
// when no real events exist. Gated when the profile is locked.
// ============================================================

import React, { useEffect, useState } from 'react';
import { Lock, Building2, AlertCircle, RefreshCw, Users, FileText, Activity } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import type { Company } from '../../types/database';

interface Props {
  company: Company;
  isUnlocked: boolean;
  onUnlockClick?: () => void;
}

interface TimelineEntry {
  date: string;             // ISO
  title: string;
  detail?: string;
  severity: 'info' | 'low' | 'medium' | 'high';
  icon: React.ReactNode;
  synthetic?: boolean;
}

const SEVERITY_COLOR: Record<TimelineEntry['severity'], string> = {
  info:   '#64748B',
  low:    '#16A34A',
  medium: '#CA8A04',
  high:   '#DC2626',
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function maskText(s: string): string {
  return s.replace(/[a-z0-9]/gi, '•');
}

export default function CompanyChangeTimeline({ company, isUnlocked, onUnlockClick }: Props) {
  const [realEvents, setRealEvents] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from('change_events')
        .select('field_changed, old_value, new_value, severity, detected_at')
        .eq('company_id', company.id)
        .order('detected_at', { ascending: false })
        .limit(20);

      if (cancelled) return;

      const mapped: TimelineEntry[] = (data ?? []).map((e) => {
        const sev = (e.severity ?? 'info') as TimelineEntry['severity'];
        return {
          date: (e.detected_at as string) ?? new Date().toISOString(),
          title: `Change detected: ${e.field_changed ?? 'data update'}`,
          detail: e.old_value || e.new_value
            ? `${e.old_value ?? '—'} → ${e.new_value ?? '—'}`
            : undefined,
          severity: sev,
          icon: <AlertCircle className="w-3.5 h-3.5" />,
        };
      });
      setRealEvents(mapped);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [company.id]);

  // Build synthetic baseline entries from registry data
  const synthetic: TimelineEntry[] = [];
  const raw = (company.raw_source_json ?? null) as
    | { incorporated_on?: string; date_of_creation?: string }
    | null;
  const incorporatedIso = raw?.incorporated_on ?? raw?.date_of_creation ?? null;
  if (incorporatedIso) {
    synthetic.push({
      date: incorporatedIso,
      title: 'Company incorporated',
      detail: `Registered as ${company.legal_form ?? 'a legal entity'}.`,
      severity: 'info',
      icon: <Building2 className="w-3.5 h-3.5" />,
      synthetic: true,
    });
  }
  if (company.status) {
    synthetic.push({
      date: company.cached_at ?? new Date().toISOString(),
      title: `Registry status: ${company.status}`,
      severity: /active|good standing/i.test(company.status) ? 'low' : 'high',
      icon: <Activity className="w-3.5 h-3.5" />,
      synthetic: true,
    });
  }
  const directorCount = Array.isArray(company.directors_json) ? company.directors_json.length : 0;
  if (directorCount > 0) {
    synthetic.push({
      date: company.cached_at ?? new Date().toISOString(),
      title: `${directorCount} officer${directorCount > 1 ? 's' : ''} on file`,
      detail: 'Directors, secretaries and persons of significant control.',
      severity: 'info',
      icon: <Users className="w-3.5 h-3.5" />,
      synthetic: true,
    });
  }
  synthetic.push({
    date: company.cached_at ?? new Date().toISOString(),
    title: 'Latest registry sync',
    detail: 'Profile data refreshed from official source.',
    severity: 'info',
    icon: <RefreshCw className="w-3.5 h-3.5" />,
    synthetic: true,
  });

  const all = [...realEvents, ...synthetic].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: '#fff', border: '1px solid var(--bg-border)' }}
    >
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--bg-border)' }}>
        <div>
          <h3 className="font-semibold text-base flex items-center gap-2" style={{ color: 'var(--text-subheading)' }}>
            <FileText className="w-4 h-4" style={{ color: 'var(--brand-accent)' }} />
            Change &amp; Activity Timeline
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {realEvents.length > 0
              ? `${realEvents.length} monitored change${realEvents.length > 1 ? 's' : ''} · synthetic baseline below`
              : 'Synthetic timeline · subscribe to monitoring for live change detection'}
          </p>
        </div>
        {!isUnlocked && (
          <button
            onClick={onUnlockClick}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
            style={{
              background: 'rgba(15,23,42,0.05)',
              color: 'var(--text-muted)',
              border: '1px solid var(--bg-border)',
            }}
          >
            <Lock className="w-3 h-3" /> Unlock details
          </button>
        )}
      </div>

      <div className="p-5">
        {loading ? (
          <div className="h-24 rounded-md skeleton-shimmer" />
        ) : all.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No timeline data available.</p>
        ) : (
          <ol className="relative">
            <span
              className="absolute top-1 bottom-1 left-[15px] w-px"
              style={{ background: 'var(--bg-border)' }}
              aria-hidden
            />
            {all.map((e, i) => {
              const color = SEVERITY_COLOR[e.severity];
              const showDetail = !e.synthetic && !isUnlocked ? maskText(e.detail ?? '') : e.detail;
              return (
                <li key={i} className="relative pl-10 pb-5 last:pb-0">
                  <span
                    className="absolute left-0 top-0.5 inline-flex items-center justify-center w-[31px] h-[31px] rounded-full"
                    style={{
                      background: '#fff',
                      color,
                      border: `2px solid ${color}`,
                      boxShadow: '0 0 0 4px #fff',
                    }}
                  >
                    {e.icon}
                  </span>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
                      {e.title}
                    </span>
                    <span className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      {fmtDate(e.date)}
                    </span>
                    {e.synthetic && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                        style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
                      >
                        baseline
                      </span>
                    )}
                  </div>
                  {showDetail && (
                    <p
                      className="text-xs mt-1"
                      style={{
                        color: 'var(--text-body)',
                        filter: !e.synthetic && !isUnlocked ? 'blur(3px)' : undefined,
                        userSelect: !e.synthetic && !isUnlocked ? 'none' : undefined,
                      }}
                    >
                      {showDetail}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        {realEvents.length === 0 && (
          <div
            className="mt-4 px-3 py-2.5 rounded-lg text-xs flex items-center justify-between gap-3"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--bg-border)', color: 'var(--text-muted)' }}
          >
            <span>Want real-time alerts when registry data changes?</span>
            <button
              onClick={onUnlockClick}
              className="font-semibold hover:underline"
              style={{ color: 'var(--brand-accent)' }}
            >
              Subscribe to monitoring →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
