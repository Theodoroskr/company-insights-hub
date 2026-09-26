// ============================================================
// DirectorRelationshipGraph
// Static radial diagram: company at the center, officers and
// PSCs evenly spaced on one or two rings. Deterministic layout —
// no physics — so labels never collide. When locked, names are
// masked to incentivize purchase.
// ============================================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
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

const TYPE_COLORS: Record<GraphNode['type'], string> = {
  company:   'var(--graph-company)',
  director:  'var(--graph-director)',
  secretary: 'var(--graph-secretary)',
  psc:       'var(--graph-psc)',
};

const TYPE_LABELS: Record<Exclude<GraphNode['type'], 'company'>, string> = {
  director:  'Director',
  secretary: 'Secretary',
  psc:       'PSC',
};

const RING_HEIGHT = 380;

function maskLabel(name: string): string {
  const words = name.trim().split(/\s+/);
  return words.map((w, i) => (i === 0 ? w : `${w[0] ?? ''}•••`)).join(' ');
}

function truncate(label: string, max: number): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

export default function DirectorRelationshipGraph({ company, isUnlocked, onUnlockClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 640 });
  const [hoverId, setHoverId] = useState<string | null>(null);

  // Build node list
  const data = useMemo(() => {
    const nodes: GraphNode[] = [{ id: 'company', name: company.name, type: 'company' }];

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
      nodes.push({ id: `n-${nodes.length}`, name, type, role });
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

    return nodes;
  }, [company]);

  // Responsive sizing
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Deterministic radial layout
  const layout = useMemo(() => {
    const w = Math.max(size.w, 280);
    const cx = w / 2;
    const cy = RING_HEIGHT / 2;
    const companyNode = data[0];
    const officers = data.slice(1);
    const n = officers.length;
    const maxR = Math.max(78, Math.min(w / 2 - 110, RING_HEIGHT / 2 - 70));
    const multiRing = n > 12;
    const outerCount = multiRing ? Math.ceil(n * 0.55) : n;

    const positioned = officers.map((node, i) => {
      const isInner = multiRing && i >= outerCount;
      const ringN = isInner ? n - outerCount : outerCount;
      const idx = isInner ? i - outerCount : i;
      const ringR = isInner ? maxR * 0.55 : maxR;
      const angle = -Math.PI / 2 + (2 * Math.PI * (idx + (isInner ? 0.5 : 0))) / ringN;
      const x = cx + ringR * Math.cos(angle);
      const y = cy + ringR * Math.sin(angle);
      const cosv = Math.cos(angle);
      const sinv = Math.sin(angle);
      const anchor: 'start' | 'end' | 'middle' = cosv > 0.3 ? 'start' : cosv < -0.3 ? 'end' : 'middle';
      const labelX = anchor === 'start' ? x + 13 : anchor === 'end' ? x - 13 : x;
      const above = anchor === 'middle' && sinv < 0;
      return { node, x, y, anchor, labelX, above, small: isInner };
    });

    return { w, cx, cy, companyNode, positioned, n };
  }, [data, size.w]);

  const isEmpty = layout.n === 0;
  const fontSizeName = (small: boolean) => (small ? 10 : 11.5);

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
            {layout.n} relationships mapped
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

      <div ref={containerRef} className="relative" style={{ height: RING_HEIGHT }}>
        {isEmpty ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
            No officer or PSC data available yet.
          </div>
        ) : (
          <>
            <svg
              width="100%"
              height={RING_HEIGHT}
              viewBox={`0 0 ${layout.w} ${RING_HEIGHT}`}
              role="img"
              aria-label={`Director relationship graph for ${company.name}`}
            >
              {/* Spokes */}
              {layout.positioned.map(({ node, x, y }) => (
                <line
                  key={`l-${node.id}`}
                  x1={layout.cx}
                  y1={layout.cy}
                  x2={x}
                  y2={y}
                  stroke="color-mix(in srgb, var(--brand-accent) 25%, transparent)"
                  strokeWidth={1.25}
                />
              ))}

              {/* Company node */}
              <g>
                <circle cx={layout.cx} cy={layout.cy} r={34} fill={TYPE_COLORS.company} />
                <circle
                  cx={layout.cx}
                  cy={layout.cy}
                  r={40}
                  fill="none"
                  stroke="color-mix(in srgb, var(--brand-accent) 20%, transparent)"
                  strokeWidth={1}
                />
                {(() => {
                  const label = truncate(company.name ?? '', 42);
                  const chunks = label.match(/.{1,11}(\s|$)/g)?.map((s) => s.trim()).slice(0, 4) ?? [label];
                  const startY = layout.cy - (chunks.length - 1) * 4.5;
                  return chunks.map((chunk, i) => (
                    <text
                      key={i}
                      x={layout.cx}
                      y={startY + i * 9}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={9}
                      fontWeight={700}
                      fill="#FFFFFF"
                      fontFamily="Inter, system-ui, sans-serif"
                    >
                      {chunk}
                    </text>
                  ));
                })()}
              </g>

              {/* Officer nodes + labels */}
              {layout.positioned.map(({ node, x, y, anchor, labelX, above, small }) => {
                const label = isUnlocked ? truncate(node.name, 30) : truncate(maskLabel(node.name), 30);
                const role = node.role ?? TYPE_LABELS[node.type];
                const hovered = hoverId === node.id;
                const r = small ? 6.5 : 9;
                const nameY = anchor === 'middle' ? (above ? y - r - 17 : y + r + 11) : y - 2;
                const roleY = anchor === 'middle' ? (above ? y - r - 6 : y + r + 22) : y + 10;
                return (
                  <g
                    key={node.id}
                    onMouseEnter={() => setHoverId(node.id)}
                    onMouseLeave={() => setHoverId(null)}
                  >
                    <circle cx={x} cy={y} r={r + (hovered ? 3 : 0)} fill={TYPE_COLORS[node.type]} />
                    {hovered && (
                      <circle cx={x} cy={y} r={r + 6} fill="none" stroke="var(--brand-accent)" strokeWidth={1.5} />
                    )}
                    <text
                      x={labelX}
                      y={nameY}
                      textAnchor={anchor}
                      fontSize={fontSizeName(small)}
                      fontWeight={600}
                      fill={hovered ? 'var(--brand-accent)' : 'var(--text-heading)'}
                      fontFamily="Inter, system-ui, sans-serif"
                    >
                      {label}
                    </text>
                    <text
                      x={labelX}
                      y={roleY}
                      textAnchor={anchor}
                      fontSize={9.5}
                      fill="var(--text-muted)"
                      fontFamily="Inter, system-ui, sans-serif"
                    >
                      {truncate(role, 24)}
                    </text>
                    <title>{`${node.name} — ${role}`}</title>
                  </g>
                );
              })}
            </svg>
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
