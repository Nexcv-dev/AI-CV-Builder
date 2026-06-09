export type BillingPlan = 'free' | 'payg' | 'monthly' | 'quarterly';
export type PaidBillingPlan = Exclude<BillingPlan, 'free'>;
export type EffectivePlan = BillingPlan | 'unlimited';

export const PAID_BILLING_PLANS = ['payg', 'monthly', 'quarterly'] as const satisfies readonly PaidBillingPlan[];

export const PLAN_DURATIONS_MS: Record<PaidBillingPlan, number> = {
  payg: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
  quarterly: 90 * 24 * 60 * 60 * 1000,
};

export const JOB_STATUSES = ['queued', 'processing', 'ready', 'failed', 'expired'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];
export type PdfJobStatus = JobStatus;
export type HtmlPdfJobStatus = JobStatus;
export type CvImportJobStatus = JobStatus;

export const HTML_PDF_PAGE_SIZES = ['A4', 'Letter'] as const;
export type HtmlPdfPageSize = (typeof HTML_PDF_PAGE_SIZES)[number];

export const isPaidBillingPlan = (plan: unknown): plan is PaidBillingPlan =>
  typeof plan === 'string' && PAID_BILLING_PLANS.includes(plan as PaidBillingPlan);
