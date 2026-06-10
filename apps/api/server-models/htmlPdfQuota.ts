import { getEffectivePlan } from './userPlan';

export type HtmlPdfPlan = 'guest' | 'free' | 'payg' | 'monthly' | 'quarterly' | 'unlimited';

const envLimit = (name: string, fallback: number) => {
  const limit = Number.parseInt(process.env[name] || String(fallback), 10);
  return Number.isFinite(limit) ? Math.max(0, Math.min(limit, 100)) : fallback;
};

export const getHtmlPdfGuestDailyLimit = () => envLimit('HTML_PDF_DAILY_GUEST_LIMIT', 1);
export const getHtmlPdfDailyLimit = () => envLimit('HTML_PDF_DAILY_FREE_LIMIT', 3);
export const getHtmlPdfPaygDailyLimit = () => envLimit('HTML_PDF_DAILY_PAYG_LIMIT', 10);
export const getHtmlPdfMonthlyDailyLimit = () => envLimit('HTML_PDF_DAILY_MONTHLY_LIMIT', 25);
export const getHtmlPdfQuarterlyDailyLimit = () => envLimit('HTML_PDF_DAILY_QUARTERLY_LIMIT', 50);

export const getHtmlPdfPlanDailyLimit = (plan: HtmlPdfPlan) => {
  if (plan === 'guest') return getHtmlPdfGuestDailyLimit();
  if (plan === 'payg') return getHtmlPdfPaygDailyLimit();
  if (plan === 'monthly') return getHtmlPdfMonthlyDailyLimit();
  if (plan === 'quarterly') return getHtmlPdfQuarterlyDailyLimit();
  return getHtmlPdfDailyLimit();
};

export const getUtcDayKey = (date = new Date()) => date.toISOString().slice(0, 10);

export const getNextUtcDayResetAt = (date = new Date()) => {
  const reset = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));
  return reset.toISOString();
};

export const buildHtmlPdfQuota = (user: any, used: number, date = new Date()) => {
  const plan = user ? getEffectivePlan(user, date) : 'guest';
  if (user?.role === 'super_admin') {
    return {
      limit: null,
      used,
      remaining: null,
      reached: false,
      plan: 'unlimited',
      resetAt: null,
    };
  }

  const limit = getHtmlPdfPlanDailyLimit(plan);
  return {
    limit,
    used,
    remaining: Math.max(limit - used, 0),
    reached: limit - used <= 0,
    plan,
    resetAt: getNextUtcDayResetAt(date),
  };
};
