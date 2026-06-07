import { getEffectivePlan } from './userPlan';

export const getHtmlPdfDailyLimit = () => {
  const limit = Number.parseInt(process.env.HTML_PDF_DAILY_FREE_LIMIT || '3', 10);
  return Number.isFinite(limit) ? Math.max(0, Math.min(limit, 100)) : 3;
};

export const getUtcDayKey = (date = new Date()) => date.toISOString().slice(0, 10);

export const getNextUtcDayResetAt = (date = new Date()) => {
  const reset = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));
  return reset.toISOString();
};

export const buildHtmlPdfQuota = (user: any, used: number, date = new Date()) => {
  const plan = getEffectivePlan(user, date);
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

  const limit = getHtmlPdfDailyLimit();
  return {
    limit,
    used,
    remaining: Math.max(limit - used, 0),
    reached: limit - used <= 0,
    plan,
    resetAt: getNextUtcDayResetAt(date),
  };
};
