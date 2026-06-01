import type { IUser } from './User';
import { isSuperAdmin } from './userRole';

export type BillingPlan = 'free' | 'payg' | 'monthly' | 'quarterly';
export type EffectivePlan = BillingPlan | 'unlimited';

export const PLAN_DURATIONS_MS: Record<Exclude<BillingPlan, 'free'>, number> = {
  payg: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
  quarterly: 90 * 24 * 60 * 60 * 1000,
};

export const PAID_BILLING_PLANS: Array<Exclude<BillingPlan, 'free'>> = ['payg', 'monthly', 'quarterly'];

export function getEffectivePlan(user: Pick<IUser, 'role' | 'plan' | 'planExpiresAt'> | null | undefined, now = new Date()): EffectivePlan {
  if (isSuperAdmin(user)) return 'unlimited';

  const plan = user?.plan || 'free';
  if (plan === 'free') return 'free';

  const expiresAt = user?.planExpiresAt;
  if (!expiresAt || expiresAt.getTime() <= now.getTime()) return 'free';

  return plan;
}

export function isPaidPlan(user: Pick<IUser, 'role' | 'plan' | 'planExpiresAt'> | null | undefined, now = new Date()) {
  const plan = getEffectivePlan(user, now);
  return plan === 'payg' || plan === 'monthly' || plan === 'quarterly' || plan === 'unlimited';
}

export function createPlanExpiry(plan: Exclude<BillingPlan, 'free'>, now = new Date()) {
  return new Date(now.getTime() + PLAN_DURATIONS_MS[plan]);
}
