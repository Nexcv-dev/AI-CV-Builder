import type { IUser } from './User';

export interface DownloadQuotaState {
  limit: number | null;
  used: number;
  remaining: number | null;
  reached: boolean;
}

export const DEFAULT_DAILY_UNVERIFIED_DOWNLOAD_LIMIT = 3;

export function getDailyUnverifiedDownloadLimit() {
  const parsed = Number(process.env.DAILY_UNVERIFIED_DOWNLOAD_LIMIT);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_DAILY_UNVERIFIED_DOWNLOAD_LIMIT;
}

export function getUtcDayKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export function buildDownloadQuota(user: Pick<IUser, 'authProvider' | 'emailVerified'>, usedToday: number): DownloadQuotaState {
  const isVerified = user.authProvider === 'google' || user.emailVerified !== false;
  if (isVerified) {
    return {
      limit: null,
      used: usedToday,
      remaining: null,
      reached: false,
    };
  }

  const limit = getDailyUnverifiedDownloadLimit();
  const remaining = Math.max(limit - usedToday, 0);

  return {
    limit,
    used: usedToday,
    remaining,
    reached: remaining <= 0,
  };
}
