import type { AuthPlan, DownloadQuota } from './homeTypes';

function formatDownloadResetTime(resetAt?: string) {
  if (!resetAt) return 'tomorrow';
  const date = new Date(resetAt);
  if (Number.isNaN(date.getTime())) return 'tomorrow';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function downloadLimitMessage(quota?: DownloadQuota | null) {
  if (quota?.plan === 'payg') {
    return `Daily download limit reached. You have already used your ${quota.limit ?? 15} Single CV Pass PDF downloads for today. Downloads reset at ${formatDownloadResetTime(quota.resetAt)} while your plan is active.`;
  }
  if (quota?.plan === 'monthly') {
    return `Daily download limit reached. You have already used your ${quota.limit ?? 25} Monthly Pro PDF downloads for today. Downloads reset at ${formatDownloadResetTime(quota.resetAt)}.`;
  }
  if (quota?.plan === 'quarterly') {
    return `Daily download limit reached. You have already used your ${quota.limit ?? 25} Pro Quarterly PDF downloads for today. Downloads reset at ${formatDownloadResetTime(quota.resetAt)}.`;
  }
  return 'You have already used your 1 Free plan PDF download. Upgrade to download more CVs.';
}

export function getPlanLabel(plan?: AuthPlan) {
  if (plan === 'payg') return 'Single CV Pass';
  if (plan === 'monthly') return 'Monthly Pro';
  if (plan === 'quarterly') return 'Pro Quarterly';
  if (plan === 'unlimited') return 'Unlimited';
  return 'Free';
}
