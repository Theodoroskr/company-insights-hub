// ============================================================
// DirectorRelationshipGraph
// Force-directed mini-graph: company at the center, directors as
// surrounding nodes. When unlocked, names render in full and
// hover/click expose detail; when locked, the layout is shown
// but labels are blurred to incentivize purchase.
// ============================================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Lock } from 'lucide-react';
import type { Company, DirectorEntry } from '../../types/database';

interface Props {
  company: Company;
  isUnlocked: boolean;
  onUnlockClick?: () => void;
}

interface GraphNode {
  id: string;
  name: string;
  type: 'company' | 'director' | 'secretary' | 'psc';
  role?: string;
}
interface GraphLink {
  source: string;
  target: string;
}

const TYPE_COLORS: Record<GraphNode['type'], string> = {
  company:   '#1B3A6B',
  director:  '#2563EB',
  secretary: '#0EA5E9',
  psc:       '#8B5CF6',
};

function maskLabel(name: string): string {
  const words = name.trim().split(/\s+/);
  return words.map((w, i) => (i === 0 ? w : `${w[0] ?? ''}•••`)).join(' ');
}

export default function DirectorRelationshipGraph({ company, isUnlocked, onUnlockClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<{ zoomToFit: (ms?: number, padding?: number) => void } | null>(null);
  const [size, setSize] = useState({ w: 600, h: 380 });
  const [hoverId, setHoverId] = useState<string | null>(null);

  // Build graph data
  const data = useMemo(() => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];

    nodes.push({ id: 'company', name: company.name, type: 'company' });

    const directors: DirectorEntry[] = Array.isArray(company.directors_json)
      ? company.directors_json
      : [];

    const raw = (company.raw_source_json ?? null) as
      | { officers?: Array<{ name?: string; role?: string }>; psc?: Array<{ name?: string; kind?: string }> }
      | null;

    const seen = new Set<string>();
    const push = (name: string, type: GraphNode['type'], role?: string) => {
      const key = `${type}:${name.toUpperCase().trim()}`;
      if (seen.has(key)) return;
      seen.add(key);
      const id = `n-${nodes.length}`;
      nodes.push({ id, name, type, role });
      links.push({ source: 'company', target: id });
    };

    for (const d of directors) {
      if (!d?.name) continue;
      const isSec = d.role?.toLowerCase().includes('secretary');
      push(d.name, isSec ? 'secretary' : 'director', d.role ?? undefined);
    }
    for (const o of raw?.officers ?? []) {
      if (!o?.name) continue;
      const isSec = (o.role ?? '').toLowerCase().includes('secretary');
      push(o.name, isSec ? 'secretary' : 'director', o.role);
    }
    for (const p of raw?.psc ?? []) {
      if (!p?.name) continue;
      push(p.name, 'psc', 'PSC');
    }

    return { nodes, links };
  }, [company]);

  // Responsive sizing
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: 380 });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fgRef.current?.zoomToFit?.(400, 40), 80);
    return () => clearTimeout(t);
  }, [data, size.w]);

  const isEmpty = data.nodes.length <= 1;

  return (
    <div
      className="rounded-xl overflow-hidden relative"
      style={{ background: '#fff', border: '1px solid var(--bg-border)' }}
    >
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--bg-border)' }}>
        <div>
          <h3 className="font-semibold text-base" style={{ color: 'var(--text-subheading)' }}>
            Director Relationship Graph
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Drag any node · scroll to zoom · {data.nodes.length - 1} relationships mapped
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wider"
             style={{ color: 'var(--text-muted)' }}>
          {[
            { c: TYPE_COLORS.company,   l: 'Company'   },
            { c: TYPE_COLORS.director,  l: 'Director'  },
            { c: TYPE_COLORS.secretary, l: 'Secretary' },
            { c: TYPE_COLORS.psc,       l: 'PSC'       },
          ].map(({ c, l }) => (
            <span key={l} className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: c }} />
              {l}
            </span>
          ))}
        </div>
      </div>

      <div ref={containerRef} className="relative" style={{ height: 380 }}>
        {isEmpty ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
            No officer or PSC data available yet.
          </div>
        ) : (
          <>
            <ForceGraph2D
              ref={fgRef as unknown as React.MutableRefObject<undefined>}
              graphData={data}
              width={size.w}
              height={size.h}
              backgroundColor="#ffffff"
              nodeRelSize={6}
              cooldownTicks={120}
              linkColor={() => 'rgba(100,116,139,0.35)'}
              linkWidth={1.2}
              onNodeHover={(n) => setHoverId((n as GraphNode | null)?.id ?? null)}
              nodeCanvasObject={(node, ctx, globalScale) => {
                const n = node as GraphNode & { x: number; y: number };
                const color = TYPE_COLORS[n.type];
                const isCompany = n.type === 'company';
                const r = isCompany ? 10 : 6;

                // Glow ring for company / hover
                if (isCompany || hoverId === n.id) {
                  ctx.beginPath();
                  ctx.arc(n.x, n.y, r + 4, 0, 2 * Math.PI);
                  ctx.fillStyle = `${color}33`;
                  ctx.fill();
                }

                ctx.beginPath();
                ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);
                ctx.fillStyle = color;
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                // Label
                const fontSize = Math.max(10, 12 / globalScale);
                ctx.font = `${isCompany ? '700' : '500'} ${fontSize}px Inter, system-ui, sans-serif`;
                ctx.fillStyle = '#0F172A';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                const label = isCompany || isUnlocked ? n.name : maskLabel(n.name);
                const truncated = label.length > 32 ? `${label.slice(0, 30)}…` : label;
                ctx.fillText(truncated, n.x, n.y + r + 3);
              }}
            />
            {!isUnlocked && (
              <div
                className="absolute bottom-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md cursor-pointer transition-all hover:scale-[1.02]"
                style={{
                  background: 'rgba(15,23,42,0.85)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.15)',
                  boxShadow: '0 8px 24px -4px rgba(0,0,0,0.25)',
                }}
                onClick={onUnlockClick}
                role="button"
              >
                <Lock className="w-3.5 h-3.5" />
                Unlock full names &amp; relationships
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
