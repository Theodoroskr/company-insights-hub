import { describe, it, expect } from 'vitest';
import { deliverySummary, reportStatus, paymentStatus, type StatusItem } from './orderStatus';

const item = (overrides: Partial<StatusItem> = {}): StatusItem => ({
  fulfillment_status: 'completed', sla_deadline: null, screening_addon: false,
  products: { slug: 'global-structure' },
  generated_reports: [{ id: 'report-1', generated_at: '2026-10-17T10:00:00Z', download_expires_at: null }],
  screening_results: [], ...overrides,
});

describe('admin order status', () => {
  it('does not count a completed item without a stored report as delivered', () => {
    const missing = item({ generated_reports: [] });
    expect(reportStatus(missing)).toBe('Collecting report');
    expect(deliverySummary('completed', [missing]).percent).toBe(0);
  });
  it('counts each report independently in a multi-report order', () => {
    expect(deliverySummary('paid', [item(), item({ fulfillment_status: 'processing', generated_reports: [] })])).toMatchObject({ ready: 1, total: 2, percent: 50, label: 'Partially ready' });
  });
  it('waits for purchased screening before counting the item fully ready', () => {
    expect(deliverySummary('paid', [item({ screening_addon: true })]).ready).toBe(0);
    expect(deliverySummary('paid', [item({ screening_addon: true, screening_results: [{ overall_status: 'review', error: null }] })]).ready).toBe(1);
  });
  it('does not claim a card payment without a payment intent is verified', () => {
    expect(paymentStatus('paid', 'card', null)).toBe('Recorded paid · unverified');
  });
  it('does not infer a credit bundle from an itemless order', () => {
    expect(deliverySummary('paid', []).label).toBe('No report items');
  });
  it('excludes delivered items from overdue alerts', () => {
    expect(deliverySummary('paid', [item({ sla_deadline: '2026-10-16T10:00:00Z' })], Date.parse('2026-10-17T10:00:00Z')).overdue).toBe(false);
  });
  it('does not deliver an unpaid order even if a report exists', () => {
    expect(deliverySummary('pending', [item()])).toMatchObject({ ready: 0, percent: 0, label: 'Awaiting payment' });
  });
});