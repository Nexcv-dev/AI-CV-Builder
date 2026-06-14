import type { UserRole } from '../features/admin/adminAccess';
import { API_ERROR_CODES, type ApiErrorCode } from '@nexcv/shared/apiErrors';

export { API_ERROR_CODES };

export interface ApiErrorData {
  code?: ApiErrorCode | string;
  error?: string;
  message?: string;
  networkError?: boolean;
  cancelled?: boolean;
  upgradeRequired?: boolean;
  reason?: string;
  quota?: any;
  [key: string]: any;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  plan: 'free' | 'payg' | 'monthly' | 'quarterly' | 'unlimited';
  planExpiresAt?: string;
  emailVerified: boolean;
  hasPassword?: boolean;
  profileImage?: string;
  phone?: string;
  address?: string;
  dob?: string;
  gender?: string;
  nationality?: string;
  authProvider: 'google' | 'github' | 'linkedin' | 'email';
}

export class ApiError extends Error {
  status: number;
  data: ApiErrorData;
  code?: ApiErrorCode | string;

  constructor(message: string, status: number, data: ApiErrorData = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.code = data.code;
  }
}

export const NETWORK_ERROR_MESSAGE = "Could not connect to the server. Check your internet connection and try again.";
export const CANCELLED_ERROR_MESSAGE = 'Request cancelled.';

function isFetchNetworkError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return error.name === 'TypeError'
    || /failed to fetch|networkerror|load failed|fetch/i.test(error.message);
}

export function isCancelledError(error: unknown, signal?: AbortSignal | null) {
  if (signal?.aborted) return true;
  if (error instanceof ApiError && error.data?.cancelled) return true;
  return Boolean(error && typeof error === 'object' && 'name' in error && error.name === 'AbortError');
}

export function hasApiErrorCode(error: unknown, ...codes: ApiErrorCode[]) {
  return error instanceof ApiError
    && typeof error.code === 'string'
    && codes.includes(error.code as ApiErrorCode);
}

export function isAuthRequiredError(error: unknown) {
  return hasApiErrorCode(error, API_ERROR_CODES.AUTH_REQUIRED)
    || (error instanceof ApiError && !error.code && error.status === 401);
}

export function isAccountExistsError(error: unknown) {
  return hasApiErrorCode(error, API_ERROR_CODES.ACCOUNT_EXISTS);
}

export function isEmailVerificationRequiredError(error: unknown) {
  return hasApiErrorCode(error, API_ERROR_CODES.EMAIL_VERIFICATION_REQUIRED);
}

export function isOtpInvalidError(error: unknown) {
  return hasApiErrorCode(error, API_ERROR_CODES.OTP_INVALID);
}

export function isPasswordResetTokenInvalidError(error: unknown) {
  return hasApiErrorCode(error, API_ERROR_CODES.PASSWORD_RESET_TOKEN_INVALID);
}

export function isUpgradeRequiredError(error: unknown) {
  if (!(error instanceof ApiError) || !error.data.upgradeRequired) return false;
  return hasApiErrorCode(error, API_ERROR_CODES.FORBIDDEN)
    || (!error.code && error.status === 403);
}

export function normalizeApiError(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (error instanceof ApiError) return error;
  if (isCancelledError(error)) return new ApiError(CANCELLED_ERROR_MESSAGE, 0, { cancelled: true });
  if (isFetchNetworkError(error)) return new ApiError(NETWORK_ERROR_MESSAGE, 0, { networkError: true });
  if (error instanceof Error) return new ApiError(error.message || fallback, 0, {});
  return new ApiError(fallback, 0, {});
}

export function getUserErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  return normalizeApiError(error, fallback).message || fallback;
}

export async function readApiResponse<T>(response: Response, fallback = 'Something went wrong. Please try again.'): Promise<T> {
  const responseText = await response.text();
  let data: any = {};

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { message: responseText };
    }
  }

  if (!response.ok) {
    const defaultMessage = response.status === 429
      ? 'Too many requests. Please wait a moment and try again.'
      : fallback;
    throw new ApiError(data.error || data.message || defaultMessage, response.status, data);
  }

  return data as T;
}

let csrfToken: string | null = null;
let csrfTokenPromise: Promise<string> | null = null;

const isUnsafeMethod = (method?: string) => {
  const normalized = (method || 'GET').toUpperCase();
  return normalized !== 'GET' && normalized !== 'HEAD' && normalized !== 'OPTIONS';
};

async function getCsrfToken(forceRefresh = false) {
  if (csrfToken && !forceRefresh) return csrfToken;
  if (!csrfTokenPromise || forceRefresh) {
    csrfTokenPromise = fetch('/api/csrf-token', {
      credentials: 'include',
      cache: 'no-store',
      headers: { 'X-App-Source': 'cv-builder-app' },
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok || typeof data.csrfToken !== 'string') {
          throw new Error(data.error || 'Could not prepare a secure request.');
        }
        csrfToken = data.csrfToken;
        return csrfToken;
      })
      .catch((error) => {
        throw normalizeApiError(error, 'Could not prepare a secure request.');
      })
      .finally(() => {
        csrfTokenPromise = null;
      });
  }
  return csrfTokenPromise;
}

async function isCsrfFailure(response: Response) {
  if (response.status !== 403) return false;
  const data = await response.clone().json().catch(() => ({}));
  return data.code === API_ERROR_CODES.CSRF_TOKEN_INVALID;
}

export async function csrfFetch(input: RequestInfo | URL, options: RequestInit = {}): Promise<Response> {
  const unsafe = isUnsafeMethod(options.method);
  const headers = new Headers(options.headers);

  if (unsafe) {
    headers.set('X-App-Source', 'cv-builder-app');
    headers.set('X-CSRF-Token', await getCsrfToken());
  }

  const requestOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include',
  };

  let response: Response;
  try {
    response = await fetch(input, requestOptions);
  } catch (error) {
    throw normalizeApiError(error);
  }

  if (unsafe && await isCsrfFailure(response)) {
    csrfToken = null;
    headers.set('X-CSRF-Token', await getCsrfToken(true));
    try {
      response = await fetch(input, { ...requestOptions, headers });
    } catch (error) {
      throw normalizeApiError(error);
    }
  }

  return response;
}

export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await csrfFetch(url, {
    ...options,
    headers,
  }).catch((error) => {
    throw normalizeApiError(error);
  });

  return readApiResponse<T>(response);
}

export async function getCurrentUser() {
  const data = await apiFetch<{ user: AuthUser }>('/api/auth/current-user', { cache: 'no-store' });
  return data.user;
}

export function notifyAuthUserChanged(user?: AuthUser) {
  window.dispatchEvent(new CustomEvent<AuthUser | undefined>('auth-user-changed', { detail: user }));
}

export const DASHBOARD_NOTIFICATION_STORAGE_KEY = 'nexcv-dashboard-notification';
export const DASHBOARD_NOTIFICATION_EVENT = 'dashboard-notification-changed';

export function hasDashboardNotification() {
  try {
    return localStorage.getItem(DASHBOARD_NOTIFICATION_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setDashboardNotification(active: boolean) {
  try {
    if (active) {
      localStorage.setItem(DASHBOARD_NOTIFICATION_STORAGE_KEY, '1');
    } else {
      localStorage.removeItem(DASHBOARD_NOTIFICATION_STORAGE_KEY);
    }
  } catch {
    // Ignore storage failures; the notification dot is a visual hint only.
  }

  window.dispatchEvent(new CustomEvent<boolean>(DASHBOARD_NOTIFICATION_EVENT, { detail: active }));
}
