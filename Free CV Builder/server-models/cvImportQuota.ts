import type { IUser } from './User';
import { EffectivePlan, getEffectivePlan } from './userPlan';

export interface CvImportQuota {
  limit: number | null;
  used: number;
  remaining: number | null;
  reached: boolean;
  plan: EffectivePlan;
  period: string;
  resetAt?: string;
}

export const FREE_MONTHLY_CV_IMPORT_LIMIT = 5;
export const PAYG_CV_IMPORT_LIMIT = 15;
export const MONTHLY_CV_IMPORT_LIMIT = 100;
export const QUARTERLY_CV_IMPORT_LIMIT = 300;

const envLimit = (name: string, fallback: number) => {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
};

export const getFreeMonthlyCvImportLimit = () => envLimit('FREE_MONTHLY_CV_IMPORT_LIMIT', FREE_MONTHLY_CV_IMPORT_LIMIT);
export const getPaygCvImportLimit = () => envLimit('PAYG_CV_IMPORT_LIMIT', PAYG_CV_IMPORT_LIMIT);
export const getMonthlyCvImportLimit = () => envLimit('MONTHLY_CV_IMPORT_LIMIT', MONTHLY_CV_IMPORT_LIMIT);
export const getQuarterlyCvImportLimit = () => envLimit('QUARTERLY_CV_IMPORT_LIMIT', QUARTERLY_CV_IMPORT_LIMIT);

export function getUtcMonthKey(now = new Date()) {
  return now.toISOString().slice(0, 7);
}

export function getNextUtcMonthResetAt(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}

const dateKey = (value: Date | undefined) => value ? value.toISOString().slice(0, 10) : 'unknown';

export function getCvImportQuotaPeriod(user: Pick<IUser, 'role' | 'plan' | 'planStartedAt' | 'planExpiresAt'>, now = new Date()) {
  const plan = getEffectivePlan(user, now);
  if (plan === 'free') return { plan, period: `free:${getUtcMonthKey(now)}`, resetAt: getNextUtcMonthResetAt(now) };
  if (plan === 'payg') return { plan, period: `payg:${dateKey(user.planStartedAt)}:${dateKey(user.planExpiresAt)}`, resetAt: user.planExpiresAt?.toISOString() };
  if (plan === 'monthly') return { plan, period: `monthly:${dateKey(user.planStartedAt)}:${dateKey(user.planExpiresAt)}`, resetAt: user.planExpiresAt?.toISOString() };
  if (plan === 'quarterly') return { plan, period: `quarterly:${dateKey(user.planStartedAt)}:${dateKey(user.planExpiresAt)}`, resetAt: user.planExpiresAt?.toISOString() };
  return { plan, period: 'unlimited', resetAt: undefined };
}

export function buildCvImportQuota(
  user: Pick<IUser, 'role' | 'plan' | 'planStartedAt' | 'planExpiresAt'>,
  used: number,
  now = new Date()
): CvImportQuota {
  const { plan, period, resetAt } = getCvImportQuotaPeriod(user, now);
  if (plan === 'unlimited') {
    return { limit: null, used, remaining: null, reached: false, plan, period };
  }

  const limit = plan === 'payg'
    ? getPaygCvImportLimit()
    : plan === 'monthly'
      ? getMonthlyCvImportLimit()
      : plan === 'quarterly'
        ? getQuarterlyCvImportLimit()
        : getFreeMonthlyCvImportLimit();
  const remaining = Math.max(limit - used, 0);
  return {
    limit,
    used,
    remaining,
    reached: remaining <= 0,
    plan,
    period,
    ...(resetAt ? { resetAt } : {}),
  };
}
