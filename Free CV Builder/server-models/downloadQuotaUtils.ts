import type { IUser } from './User';
import { EffectivePlan, getEffectivePlan } from './userPlan';

export interface DownloadQuotaState {
  limit: number | null;
  used: number;
  remaining: number | null;
  reached: boolean;
  plan: EffectivePlan;
}

export const FREE_DOWNLOAD_LIMIT = 1;

export function getDailyUnverifiedDownloadLimit() {
  const parsed = Number(process.env.DAILY_UNVERIFIED_DOWNLOAD_LIMIT);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : FREE_DOWNLOAD_LIMIT;
}

export function getUtcDayKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export function buildDownloadQuota(user: Pick<IUser, 'authProvider' | 'emailVerified' | 'role' | 'plan' | 'planExpiresAt'>, usedToday: number): DownloadQuotaState {
  const plan = getEffectivePlan(user);
  if (plan === 'payg' || plan === 'monthly' || plan === 'unlimited') {
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
