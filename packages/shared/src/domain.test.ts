import { describe, expect, it } from 'vitest';
import { HTML_PDF_PAGE_SIZES, JOB_STATUSES, PAID_BILLING_PLANS, isPaidBillingPlan } from './domain';

describe('domain contracts', () => {
  it('keeps paid plan keys explicit', () => {
    expect(PAID_BILLING_PLANS).toEqual(['payg', 'monthly', 'quarterly']);
    expect(isPaidBillingPlan('monthly')).toBe(true);
    expect(isPaidBillingPlan('free')).toBe(false);
  });

  it('keeps shared job statuses stable', () => {
    expect(JOB_STATUSES).toEqual(['queued', 'processing', 'ready', 'failed', 'expired']);
  });

  it('keeps HTML PDF page sizes stable', () => {
    expect(HTML_PDF_PAGE_SIZES).toEqual(['A4', 'Letter']);
  });
});
