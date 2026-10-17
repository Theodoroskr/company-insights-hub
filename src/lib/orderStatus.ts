export interface StatusItem {
  fulfillment_status: string | null;
  sla_deadline: string | null;
  screening_addon: boolean;
  products: { slug: string } | null;
  generated_reports: { id: string; generated_at: string | null; download_expires_at: string | null }[];
  screening_results: { overall_status: string; error: string | null }[];
}

export const standaloneScreening = (item: StatusItem) =>
  ['company-aml-screening', 'aml-screening-with-directors'].includes(item.products?.slug ?? '');

export const needsScreening = (item: StatusItem) => item.screening_addon || standaloneScreening(item) || item.products?.slug === 'enhanced-uk-kyb-report';
export const screeningReady = (item: StatusItem) => item.screening_results.some(result => ['clear', 'review', 'hit'].includes(result.overall_status) && !result.error);
export const reportReady = (item: StatusItem) =>
  standaloneScreening(item) ? screeningReady(item) :
    ['completed', 'delivered', 'fulfilled'].includes(item.fulfillment_status ?? '') && item.generated_reports.length > 0;

export const itemDelivered = (item: StatusItem) => reportReady(item) && (!needsScreening(item) || screeningReady(item));

export function reportStatus(item: StatusItem): string {
  if (standaloneScreening(item)) return screeningReady(item) ? 'Screening ready' : 'Screening pending';
  if (reportReady(item)) return 'Report available';
  if (['completed', 'completed_api', 'delivered', 'fulfilled'].includes(item.fulfillment_status ?? '')) return 'Collecting report';
  const labels: Record<string, string> = { pending: 'Queued', submitted: 'Submitted to supplier', processing: 'In progress', failed: 'Failed', cancelled: 'Cancelled' };
  return labels[item.fulfillment_status ?? ''] ?? item.fulfillment_status ?? 'Unknown';
}

export function paymentStatus(status: string | null, method: string, intent: string | null): string {
  if (status === 'pending') return 'Awaiting payment';
  if (status === 'failed') return 'Failed';
  if (status === 'cancelled') return 'Cancelled';
  if (status === 'refunded') return 'Refunded';
  if (['paid', 'completed', 'partial', 'processing'].includes(status ?? '')) {
    if (method === 'invoice') return 'On account';
    if (method === 'wallet') return 'Paid with credit';
    return intent ? 'Payment recorded' : 'Recorded paid · unverified';
  }
  return 'Unknown';
}

export function deliverySummary(status: string | null, items: StatusItem[], now = Date.now()) {
  const settled = ['paid', 'completed', 'partial', 'processing'].includes(status ?? '');
  const ready = items.filter(itemDelivered).length;
  const failed = items.some(item => item.fulfillment_status === 'failed' || item.screening_results.some(result => result.overall_status === 'error' || !!result.error));
  const overdue = settled && items.some(item => !itemDelivered(item) && item.sla_deadline && new Date(item.sla_deadline).getTime() < now);
  const label = !settled ? (status === 'pending' ? 'Awaiting payment' : 'Not active') :
    !items.length ? 'No report items' : ready === items.length ? 'Ready' : failed ? 'Needs attention' : ready > 0 ? 'Partially ready' : 'In progress';
  return { ready: settled ? ready : 0, total: items.length, percent: settled && items.length ? Math.round(ready / items.length * 100) : 0, label, overdue, attention: failed || overdue };
}