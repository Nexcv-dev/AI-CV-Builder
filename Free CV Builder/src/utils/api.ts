export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: 'user' | 'super_admin';
  plan: 'free' | 'payg' | 'monthly' | 'unlimited';
  planExpiresAt?: string;
  emailVerified: boolean;
  profileImage?: string;
  phone?: string;
  address?: string;
  dob?: string;
  gender?: string;
  nationality?: string;
  authProvider: 'google' | 'email';
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

export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (options.method && options.method !== 'GET') {
    headers.set('X-App-Source', 'cv-builder-app');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
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
  const data = await apiFetch<{ user: AuthUser }>('/api/auth/current-user');
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
