import type { UserRole } from '../features/admin/adminAccess';

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
  data: any;

  constructor(message: string, status: number, data: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export const NETWORK_ERROR_MESSAGE = "Could not connect to the server. Check your internet connection and try again.";

function isFetchNetworkError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return error.name === 'TypeError'
    || /failed to fetch|networkerror|load failed|fetch/i.test(error.message);
}

export function normalizeApiError(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (error instanceof ApiError) return error;
  if (isFetchNetworkError(error)) return new ApiError(NETWORK_ERROR_MESSAGE, 0, { networkError: true });
  if (error instanceof Error) return new ApiError(error.message || fallback, 0, {});
  return new ApiError(fallback, 0, {});
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
  return data.code === 'CSRF_TOKEN_INVALID';
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

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 429) {
      throw new ApiError(data.error || 'Too many requests. Please wait a moment and try again.', response.status, data);
    }
    throw new ApiError(data.error || 'Something went wrong. Please try again.', response.status, data);
  }
  return data as T;
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
