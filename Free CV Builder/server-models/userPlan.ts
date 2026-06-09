import {
  PAID_BILLING_PLANS,
  PLAN_DURATIONS_MS,
  isPaidBillingPlan,
  type BillingPlan,
  type EffectivePlan,
  type PaidBillingPlan,
} from '@nexcv/shared/domain';
import type { IUser } from './User';
import { isSuperAdmin } from './userRole';

export type { BillingPlan, EffectivePlan, PaidBillingPlan };
export { PAID_BILLING_PLANS, PLAN_DURATIONS_MS };

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
  return plan === 'unlimited' || isPaidBillingPlan(plan);
}

export function createPlanExpiry(plan: PaidBillingPlan, now = new Date()) {
  return new Date(now.getTime() + PLAN_DURATIONS_MS[plan]);
}

export function createRenewedPlanExpiry(
  plan: PaidBillingPlan,
  user: Pick<IUser, 'planExpiresAt'> | null | undefined,
  now = new Date(),
) {
  const existingExpiry = user?.planExpiresAt;
  const baseDate = existingExpiry && existingExpiry.getTime() > now.getTime() ? existingExpiry : now;
  return createPlanExpiry(plan, baseDate);
}
