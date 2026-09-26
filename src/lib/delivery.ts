// Shared delivery-time wording. SLA hours in multiples of 24 above 48h are
// treated as business days (e.g. 120h → "5 business days").

export function formatDelivery(hours: number | null | undefined, isInstant = false): string {
  if (isInstant || hours === 0) return 'Instant';
  if (!hours) return '—';
  if (hours < 24) return `${hours} hours`;
  if (hours <= 48) return `${hours} hours`;
  const days = Math.ceil(hours / 24);
  return `${days} business days`;
}

/** Adds business days (Mon–Fri) to a date. */
export function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) added++;
  }
  return d;
}

/** Expected delivery date for SLAs expressed in business days; null for short SLAs. */
export function expectedDeliveryDate(hours: number | null | undefined, from = new Date()): Date | null {
  if (!hours || hours <= 48) return null;
  return addBusinessDays(from, Math.ceil(hours / 24));
}

/** Days a purchased report unlocks the company page (fallback when no expiry is stored). */
export const REPORT_ACCESS_DAYS = 30;

/** Access end for a purchased item: latest report expiry, else created_at + REPORT_ACCESS_DAYS. */
export function reportAccessUntil(
  createdAt: string | null | undefined,
  reports: Array<{ download_expires_at?: string | null }> | null | undefined,
): Date | null {
  const exp = (reports ?? []).map((r) => r.download_expires_at).filter(Boolean) as string[];
  if (exp.length) return new Date(exp.sort().at(-1)!);
  if (!createdAt) return null;
  return new Date(new Date(createdAt).getTime() + REPORT_ACCESS_DAYS * 86400000);
}
