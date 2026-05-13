export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: 'user' | 'super_admin';
  profileImage?: string;
  phone?: string;
  address?: string;
  dob?: string;
  gender?: string;
  nationality?: string;
  authProvider: 'google' | 'email';
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
      throw new Error(data.error || 'Too many requests. Please wait a moment and try again.');
    }
    throw new Error(data.error || 'Something went wrong. Please try again.');
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
