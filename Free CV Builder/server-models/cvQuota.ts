import type { IUser } from './User';
import { isSuperAdmin } from './userRole';

export interface CvCreationQuota {
  limit: number | null;
  used: number;
  remaining: number | null;
  reached: boolean;
}

export const DEFAULT_DAILY_CV_CREATION_LIMIT = 3;

export function getDailyCvCreationLimit() {
  const parsed = Number(process.env.DAILY_CV_CREATION_LIMIT);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_DAILY_CV_CREATION_LIMIT;
}

export function getUtcDayBounds(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export function buildCvCreationQuota(user: Pick<IUser, 'role'>, usedToday: number): CvCreationQuota {
  if (isSuperAdmin(user)) {
    return {
      limit: null,
      used: usedToday,
      remaining: null,
      reached: false,
    };
  }

  const limit = getDailyCvCreationLimit();
  const remaining = Math.max(limit - usedToday, 0);

  return {
    limit,
    used: usedToday,
    remaining,
    reached: remaining <= 0,
  };
}
