import React from 'react';
import { Building2, FileBarChart, History, MapPin } from 'lucide-react';

interface UKCompanyFactsPanelProps {
  bundle: Record<string, unknown> | null;
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-5" style={{ borderColor: 'var(--bg-border)', backgroundColor: '#fff' }}>
      {children}
    </div>
  );
}

function SectionTitle({ icon, children, count }: { icon: React.ReactNode; children: React.ReactNode; count?: number }) {
  return (
    <h2 className="font-semibold text-base mb-3 flex items-center gap-2" style={{ color: 'var(--text-subheading)' }}>
      {icon}
      {children}
      {typeof count === 'number' && count > 0 && (
        <span
          className="text-xs px-2 py-0.5 rounded-full ml-1 font-normal"
          style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
        >
          {count} record{count === 1 ? '' : 's'}
        </span>
      )}
    </h2>
  );
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function pickProfile(bundle: Record<string, unknown> | null): Record<string, unknown> {
  if (!bundle) return {};
  return ((bundle.company ?? bundle.profile ?? bundle.company_profile ?? bundle) as Record<string, unknown>) ?? {};
}

function asArray<T = unknown>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function formatAddress(addr: Record<string, unknown> | undefined): string {
  if (!addr) return '—';
  const parts = [
    addr.premises,
    addr.address_line_1,
    addr.address_line_2,
    addr.locality,
    addr.region,
    addr.postal_code,
    addr.country,
  ].filter((p) => typeof p === 'string' && p.length > 0) as string[];
  return parts.length > 0 ? parts.join(', ') : '—';
}

export default function UKCompanyFactsPanel({ bundle }: UKCompanyFactsPanelProps) {
  const profile = pickProfile(bundle);

  // Accounts
  const accounts = (profile.accounts as Record<string, unknown> | undefined) ?? {};
  const nextAccounts = accounts.next_accounts as Record<string, unknown> | undefined;
  const lastAccounts = accounts.last_accounts as Record<string, unknown> | undefined;
  const nextDue = (accounts.next_due as string | undefined) ?? (nextAccounts?.due_on as string | undefined);
  const nextMadeUpTo = (accounts.next_made_up_to as string | undefined) ?? (nextAccounts?.period_end_on as string | undefined);
  const lastMadeUpTo = (accounts.last_made_up_to as string | undefined) ?? (lastAccounts?.made_up_to as string | undefined);
  const accountsOverdue = !!accounts.overdue;
  const accountsType = (lastAccounts?.type as string | undefined)?.replace(/-/g, ' ');

  // Confirmation statement
  const confirmation = (profile.confirmation_statement as Record<string, unknown> | undefined) ?? {};
  const csNextDue = confirmation.next_due as string | undefined;
  const csLast = confirmation.last_made_up_to as string | undefined;
  const csOverdue = !!confirmation.overdue;

  // SIC codes
  const sicCodes = asArray<string>(profile.sic_codes);
  const sicDescriptions = (profile.sic_codes_descriptions as Record<string, string> | undefined) ?? undefined;

  // Previous names
  const previousNames = asArray<Record<string, unknown>>(profile.previous_company_names);

  // Registered office history
  const officeHistory = asArray<Record<string, unknown>>(
    profile.registered_office_history ?? (bundle as Record<string, unknown>)?.registered_office_history
  );

  const hasAccounts = !!(nextDue || lastMadeUpTo || csNextDue || csLast);
  const hasSic = sicCodes.length > 0;
  const hasPrevNames = previousNames.length > 0;
  const hasHistory = officeHistory.length > 0;

  if (!hasAccounts && !hasSic && !hasPrevNames && !hasHistory) {
    return null;
  }

  return (
    <>
      {/* Accounts & Filings due dates */}
      {hasAccounts && (
        <SectionCard>
          <SectionTitle icon={<FileBarChart className="w-4 h-4" />}>
            Accounts &amp; Statutory Filings
          </SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                Next Accounts Due
              </p>
              <p className="font-medium flex items-center gap-2" style={{ color: 'var(--text-body)' }}>
                {formatDate(nextDue)}
                {accountsOverdue && (
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                    style={{ backgroundColor: 'var(--risk-high-bg)', color: 'var(--risk-high)' }}
                  >
                    OVERDUE
                  </span>
                )}
              </p>
              {nextMadeUpTo && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Period end: {formatDate(nextMadeUpTo)}
                </p>
              )}
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                Last Accounts Filed
              </p>
              <p className="font-medium" style={{ color: 'var(--text-body)' }}>
                {formatDate(lastMadeUpTo)}
              </p>
              {accountsType && (
                <p className="text-xs mt-0.5 capitalize" style={{ color: 'var(--text-muted)' }}>
                  Type: {accountsType}
                </p>
              )}
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                Confirmation Statement Due
              </p>
              <p className="font-medium flex items-center gap-2" style={{ color: 'var(--text-body)' }}>
                {formatDate(csNextDue)}
                {csOverdue && (
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                    style={{ backgroundColor: 'var(--risk-high-bg)', color: 'var(--risk-high)' }}
                  >
                    OVERDUE
                  </span>
                )}
              </p>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                Last Confirmation Statement
              </p>
              <p className="font-medium" style={{ color: 'var(--text-body)' }}>
                {formatDate(csLast)}
              </p>
            </div>
          </div>
        </SectionCard>
      )}

      {/* SIC codes */}
      {hasSic && (
        <SectionCard>
          <SectionTitle icon={<Building2 className="w-4 h-4" />} count={sicCodes.length}>
            Nature of Business (SIC)
          </SectionTitle>
          <div className="space-y-2">
            {sicCodes.map((code) => {
              const desc = sicDescriptions?.[code];
              return (
                <div
                  key={code}
                  className="flex items-start gap-3 py-2 border-b last:border-0"
                  style={{ borderColor: 'var(--bg-border)' }}
                >
                  <span
                    className="text-xs font-mono font-semibold px-2 py-0.5 rounded shrink-0"
                    style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-heading)' }}
                  >
                    {code}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--text-body)' }}>
                    {desc ?? <span className="italic" style={{ color: 'var(--text-muted)' }}>SIC code {code}</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* Previous company names */}
      {hasPrevNames && (
        <SectionCard>
          <SectionTitle icon={<History className="w-4 h-4" />} count={previousNames.length}>
            Previous Company Names
          </SectionTitle>
          <div className="space-y-2">
            {previousNames.map((n, i) => {
              const name = (n.name as string) ?? '—';
              const from = n.effective_from as string | undefined;
              const to = n.ceased_on as string | undefined;
              return (
                <div
                  key={i}
                  className="flex flex-wrap items-baseline justify-between gap-2 py-2 border-b last:border-0"
                  style={{ borderColor: 'var(--bg-border)' }}
                >
                  <span className="text-sm font-medium uppercase" style={{ color: 'var(--text-body)' }}>
                    {name}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {formatDate(from)} → {formatDate(to)}
                  </span>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* Registered office history */}
      {hasHistory && (
        <SectionCard>
          <SectionTitle icon={<MapPin className="w-4 h-4" />} count={officeHistory.length}>
            Registered Office History
          </SectionTitle>
          <div className="space-y-3">
            {officeHistory.map((entry, i) => {
              const addr = entry.address as Record<string, unknown> | undefined;
              const from = (entry.moved_in as string | undefined) ?? (entry.start_date as string | undefined);
              const to = (entry.moved_out as string | undefined) ?? (entry.end_date as string | undefined);
              return (
                <div
                  key={i}
                  className="py-2 border-b last:border-0"
                  style={{ borderColor: 'var(--bg-border)' }}
                >
                  <p className="text-sm" style={{ color: 'var(--text-body)' }}>
                    {formatAddress(addr)}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {formatDate(from)} → {to ? formatDate(to) : 'present'}
                  </p>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}
    </>
  );
}
