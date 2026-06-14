import type { AuthPlan, DownloadQuota } from './homeTypes';
import { ApiError, NETWORK_ERROR_MESSAGE } from '../../utils/api';

export const PDF_SERVER_ERROR_MESSAGE = 'The PDF server could not complete your request. Please try again.';

export function getPdfDownloadErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.data.networkError) return NETWORK_ERROR_MESSAGE;
    return error.message || PDF_SERVER_ERROR_MESSAGE;
  }

  const candidate = error as {
    name?: string;
    message?: string;
    responseBody?: string;
    data?: { networkError?: boolean };
  } | null;

  if (candidate?.data?.networkError
    || candidate?.name === 'TypeError'
    || /failed to fetch|networkerror|load failed/i.test(candidate?.message || '')) {
    return NETWORK_ERROR_MESSAGE;
  }

  if (candidate?.responseBody) {
    try {
      const parsed = JSON.parse(candidate.responseBody);
      if (typeof parsed.details === 'string' && parsed.details.trim()) return parsed.details;
      if (typeof parsed.error === 'string' && parsed.error.trim()) return parsed.error;
    } catch {
      return PDF_SERVER_ERROR_MESSAGE;
    }
  }

  if (candidate?.message
    && !/^Failed to (?:generate|queue|check) PDF\b/i.test(candidate.message)) {
    return candidate.message;
  }

  return PDF_SERVER_ERROR_MESSAGE;
}

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

export function triggerBrowserDownload(url: string, filename: string, shouldRevoke = false) {
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS) {
    link.setAttribute('target', '_blank');
  }

  document.body.appendChild(link);
  link.click();
  link.remove();
  if (shouldRevoke) setTimeout(() => window.URL.revokeObjectURL(url), 10000);
}
