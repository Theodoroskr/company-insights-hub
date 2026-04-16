import { useEffect, useState } from 'react';
import { FileText, Shield, Users, ExternalLink } from 'lucide-react';
import GatedContent from '@/components/ui/GatedContent';
import { companiesHouseUK } from '@/lib/companiesHouseUK/client';

interface UKCompanySectionsProps {
  companyNumber: string;
  /** Treat the user as a paying customer for this company */
  isUnlocked?: boolean;
  onOrderReport?: () => void;
}

interface FilingItem {
  type?: string;
  category?: string;
  description?: string;
  date?: string;
  links?: { document_metadata?: string };
}

interface ChargeItem {
  charge_code?: string;
  classification?: { description?: string };
  status?: string;
  delivered_on?: string;
  persons_entitled?: Array<{ name: string }>;
}

interface PscItem {
  name?: string;
  kind?: string;
  natures_of_control?: string[];
  notified_on?: string;
  ceased_on?: string;
}

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-lg border p-5 ${className}`}
      style={{ borderColor: 'var(--bg-border)', backgroundColor: '#fff' }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ icon, children, count }: { icon: React.ReactNode; children: React.ReactNode; count?: number }) {
  return (
    <h2 className="font-semibold text-base mb-3 flex items-center gap-2" style={{ color: 'var(--text-subheading)' }}>
      {icon}
      {children}
      {typeof count === 'number' && (
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

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function UKCompanySections({
  companyNumber,
  isUnlocked = false,
  onOrderReport,
}: UKCompanySectionsProps) {
  const [filings, setFilings] = useState<FilingItem[]>([]);
  const [filingsTotal, setFilingsTotal] = useState(0);
  const [charges, setCharges] = useState<ChargeItem[]>([]);
  const [chargesTotal, setChargesTotal] = useState(0);
  const [psc, setPsc] = useState<PscItem[]>([]);
  const [pscTotal, setPscTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyNumber) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      const [f, c, p] = await Promise.allSettled([
        companiesHouseUK.filingHistory(companyNumber, 10),
        companiesHouseUK.charges(companyNumber),
        companiesHouseUK.psc(companyNumber),
      ]);
      if (cancelled) return;

      if (f.status === 'fulfilled') {
        setFilings((f.value.items ?? []) as FilingItem[]);
        setFilingsTotal(f.value.total_count ?? 0);
      }
      if (c.status === 'fulfilled') {
        setCharges((c.value.items ?? []) as ChargeItem[]);
        setChargesTotal(c.value.total_count ?? 0);
      }
      if (p.status === 'fulfilled') {
        setPsc((p.value.items ?? []) as PscItem[]);
        setPscTotal(p.value.total_results ?? 0);
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [companyNumber]);

  return (
    <>
      {/* Filings & Documents (UK) */}
      <SectionCard>
        <SectionTitle icon={<FileText className="w-4 h-4" />} count={filingsTotal}>
          UK Filing History
        </SectionTitle>

        {loading ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading filings…</p>
        ) : filings.length === 0 ? (
          <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>No filings on record.</p>
        ) : (
          <GatedContent
            isUnlocked={isUnlocked}
            message="Order the UK Company Report to download original filing PDFs"
            ctaLabel="Order Report"
            onCta={onOrderReport}
          >
            <table className="w-full text-sm">
              <tbody>
                {filings.slice(0, 10).map((f, i) => {
                  const docMeta = f.links?.document_metadata;
                  // CH document_metadata URLs look like https://document-api.company-information.service.gov.uk/document/{id}
                  // The public viewer is at https://find-and-update.company-information.service.gov.uk/document/{id}
                  const docId = docMeta?.split('/document/')[1];
                  const viewerUrl = docId
                    ? `https://find-and-update.company-information.service.gov.uk/document/${docId}`
                    : null;
                  const label = (f.description ?? f.type ?? '')
                    .replace(/-/g, ' ')
                    .replace(/^./, (s) => s.toUpperCase());
                  return (
                    <tr key={i} className="border-b last:border-0" style={{ borderColor: 'var(--bg-border)' }}>
                      <td className="py-2 pr-4" style={{ color: 'var(--text-body)' }}>
                        {isUnlocked && viewerUrl ? (
                          <a
                            href={viewerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline inline-flex items-center gap-1"
                            style={{ color: 'var(--brand-accent)' }}
                            title="Open original PDF on Companies House"
                          >
                            {label}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          label
                        )}
                      </td>
                      <td className="py-2 pr-4 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                        {formatDate(f.date)}
                      </td>
                      <td className="py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {f.category ?? ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </GatedContent>
        )}

        <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
          Source: Companies House UK ·{' '}
          <a
            href={`https://find-and-update.company-information.service.gov.uk/company/${companyNumber}/filing-history`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline inline-flex items-center gap-0.5"
            style={{ color: 'var(--brand-accent)' }}
          >
            View on official register <ExternalLink className="w-3 h-3" />
          </a>
        </p>
      </SectionCard>

      {/* Charges & Mortgages */}
      <SectionCard>
        <SectionTitle icon={<Shield className="w-4 h-4" />} count={chargesTotal}>
          Charges &amp; Mortgages
        </SectionTitle>

        {loading ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading charges…</p>
        ) : charges.length === 0 ? (
          <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>
            No secured debts registered against this company.
          </p>
        ) : (
          <GatedContent
            isUnlocked={isUnlocked}
            message="Order the UK Company Report for full charge details and creditor information"
            ctaLabel="Order Report"
            onCta={onOrderReport}
          >
            <div className="space-y-2">
              {charges.slice(0, 5).map((c, i) => (
                <div
                  key={i}
                  className="text-sm py-2 border-b last:border-0"
                  style={{ borderColor: 'var(--bg-border)' }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ color: 'var(--text-body)' }}>
                      {c.classification?.description ?? c.charge_code ?? 'Charge'}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: c.status === 'satisfied' ? 'var(--bg-subtle)' : 'rgba(239,68,68,0.1)',
                        color: c.status === 'satisfied' ? 'var(--text-muted)' : 'rgb(185,28,28)',
                      }}
                    >
                      {c.status ?? 'outstanding'}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Filed {formatDate(c.delivered_on)}
                    {c.persons_entitled && c.persons_entitled.length > 0 && ` · In favour of: ${c.persons_entitled[0].name}`}
                  </p>
                </div>
              ))}
            </div>
          </GatedContent>
        )}
      </SectionCard>

      {/* Persons with Significant Control */}
      <SectionCard>
        <SectionTitle icon={<Users className="w-4 h-4" />} count={pscTotal}>
          Persons with Significant Control (PSC)
        </SectionTitle>

        <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
          Beneficial owners with 25%+ ownership, voting rights, or significant influence.
        </p>

        {loading ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading PSC data…</p>
        ) : psc.length === 0 ? (
          <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>No PSC declarations on file.</p>
        ) : (
          <GatedContent
            isUnlocked={isUnlocked}
            message="Order the UK Company Report for full PSC details including addresses and nationalities"
            ctaLabel="Order Report"
            onCta={onOrderReport}
          >
            <div className="space-y-2">
              {psc.slice(0, 5).map((p, i) => {
                const isCeased = !!p.ceased_on;
                return (
                  <div
                    key={i}
                    className="text-sm py-2 border-b last:border-0"
                    style={{ borderColor: 'var(--bg-border)', opacity: isCeased ? 0.6 : 1 }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium" style={{ color: 'var(--text-body)' }}>
                        {p.name ?? '—'}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
                      >
                        {(p.kind ?? '').replace(/-/g, ' ')}
                      </span>
                    </div>
                    {p.natures_of_control && p.natures_of_control.length > 0 && (
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        {p.natures_of_control.slice(0, 2).map((n) => n.replace(/-/g, ' ')).join(' · ')}
                      </p>
                    )}
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {isCeased ? `Ceased ${formatDate(p.ceased_on)}` : `Notified ${formatDate(p.notified_on)}`}
                    </p>
                  </div>
                );
              })}
            </div>
          </GatedContent>
        )}
      </SectionCard>
    </>
  );
}
