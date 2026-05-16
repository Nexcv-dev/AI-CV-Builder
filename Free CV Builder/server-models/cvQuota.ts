import type { IUser } from './User';
import { EffectivePlan, getEffectivePlan } from './userPlan';

export interface CvCreationQuota {
  limit: number | null;
  used: number;
  remaining: number | null;
  reached: boolean;
  plan: EffectivePlan;
}

export const DEFAULT_FREE_CV_CREATION_LIMIT = 1;

export function getDailyCvCreationLimit() {
  const parsed = Number(process.env.DAILY_CV_CREATION_LIMIT);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_FREE_CV_CREATION_LIMIT;
}

export function getUtcDayBounds(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export function buildCvCreationQuota(user: Pick<IUser, 'role' | 'plan' | 'planExpiresAt'>, usedToday: number): CvCreationQuota {
  const plan = getEffectivePlan(user);
  if (plan === 'monthly' || plan === 'unlimited') {
    return {
      limit: null,
      used: usedToday,
      remaining: null,
      reached: false,
      plan,
    };
  }

  const limit = getDailyCvCreationLimit();
  const remaining = Math.max(limit - usedToday, 0);

  return {
    limit,
    used: usedToday,
    remaining,
    reached: remaining <= 0,
    plan,
  };
}
