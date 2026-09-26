import React from 'react';

interface DisclaimerMeta {
  brandName?: string | null;
  generatedAt?: string | null;
  orderRef?: string | null;
}

const FALLBACK_BRAND = 'Infocredit World';

/** Body of the disclaimer, without the Generated/Order meta line. */
export function buildReportDisclaimerBody(brandName?: string | null): string {
  const brand = brandName?.trim() || FALLBACK_BRAND;
  const year = new Date().getFullYear();
  return [
    `This report was produced by ${brand}, an independent digital service operated by Infocredit Group Ltd, a company registered in the Republic of Cyprus under registration number HE4404.`,
    'The information contained in this report has been compiled from publicly available registry data and other third-party sources believed to be reliable; however, Infocredit Group Ltd makes no representation or warranty, express or implied, as to the accuracy, completeness, timeliness or fitness for any particular purpose of such information.',
    'This report does not constitute legal, financial or professional advice and must not be relied upon as such.',
    `© ${year} Infocredit Group Ltd. All rights reserved. Unauthorised reproduction, distribution or resale of this report is prohibited.`,
  ].join(' ');
}

export function formatDisclaimerMeta({ generatedAt, orderRef }: Omit<DisclaimerMeta, 'brandName'>): string | null {
  const parts: string[] = [];
  if (generatedAt) parts.push(`Generated: ${new Date(generatedAt).toLocaleDateString('en-GB')}`);
  if (orderRef) parts.push(`Order: ${orderRef}`);
  return parts.length ? parts.join(' · ') : null;
}

/** Full plaintext disclaimer (body + meta line) — mirrors the edge-function wording. */
export function buildReportDisclaimer(meta: DisclaimerMeta): string {
  const body = buildReportDisclaimerBody(meta.brandName);
  const metaLine = formatDisclaimerMeta(meta);
  return metaLine ? `${body}\n\n${metaLine}` : body;
}

/**
 * Disclaimer block appended to the bottom of every delivered report view.
 * Included in print output (only navigation controls are print-hidden).
 */
export function ReportDisclaimerFooter({ brandName, generatedAt, orderRef }: DisclaimerMeta) {
  const metaLine = formatDisclaimerMeta({ generatedAt, orderRef });
  return (
    <footer className="mt-10 pt-6 border-t" style={{ borderColor: 'var(--bg-border)' }}>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        {buildReportDisclaimerBody(brandName)}
      </p>
      {metaLine && (
        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
          {metaLine}
        </p>
      )}
    </footer>
  );
}
