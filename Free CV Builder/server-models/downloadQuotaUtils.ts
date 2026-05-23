import type { IUser } from './User';
import { EffectivePlan, getEffectivePlan } from './userPlan';

export interface DownloadQuotaState {
  limit: number | null;
  used: number;
  remaining: number | null;
  reached: boolean;
  plan: EffectivePlan;
  resetAt?: string;
}

export const FREE_DOWNLOAD_LIMIT = 1;
export const PAYG_DAILY_DOWNLOAD_LIMIT = 15;
export const MONTHLY_DAILY_DOWNLOAD_LIMIT = 25;

export function getDailyUnverifiedDownloadLimit() {
  const parsed = Number(process.env.DAILY_UNVERIFIED_DOWNLOAD_LIMIT);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : FREE_DOWNLOAD_LIMIT;
}

export function getPaygDailyDownloadLimit() {
  const parsed = Number(process.env.PAYG_DAILY_DOWNLOAD_LIMIT);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : PAYG_DAILY_DOWNLOAD_LIMIT;
}

export function getMonthlyDailyDownloadLimit() {
  const parsed = Number(process.env.MONTHLY_DAILY_DOWNLOAD_LIMIT);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : MONTHLY_DAILY_DOWNLOAD_LIMIT;
}

export function getUtcDayKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export function getNextUtcDayResetAt(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString();
}

export function buildDownloadQuota(user: Pick<IUser, 'authProvider' | 'emailVerified' | 'role' | 'plan' | 'planExpiresAt'>, usedToday: number): DownloadQuotaState {
  const plan = getEffectivePlan(user);
  if (plan === 'payg' || plan === 'monthly') {
    const limit = plan === 'payg' ? getPaygDailyDownloadLimit() : getMonthlyDailyDownloadLimit();
    const remaining = Math.max(limit - usedToday, 0);
    return {
      limit,
      used: usedToday,
      remaining,
      reached: remaining <= 0,
      plan,
    };
  }

  if (plan === 'unlimited') {
    return {
      limit: null,
      used: usedToday,
      remaining: null,
      reached: false,
      plan,
    };
  }

  const limit = getDailyUnverifiedDownloadLimit();
  const remaining = Math.max(limit - usedToday, 0);

  return {
    limit,
    used: usedToday,
    remaining,
    reached: remaining <= 0,
    plan: 'free',
  };
}
