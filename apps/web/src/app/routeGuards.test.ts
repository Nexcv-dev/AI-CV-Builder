import { describe, expect, it } from 'vitest';
import { API_ERROR_CODES, ApiError, type AuthUser } from '../utils/api';
import { getRouteAuthStatus } from './routeGuards';

const user: AuthUser = {
  id: 'user-1',
  email: 'user@example.com',
  displayName: 'Test User',
  role: 'user',
  plan: 'free',
  emailVerified: true,
  authProvider: 'email',
};

describe('getRouteAuthStatus', () => {
  it('keeps a cached authenticated user signed in when a background refresh fails', () => {
    const error = new ApiError('Could not connect', 0, { networkError: true });

    expect(getRouteAuthStatus(user, false, error)).toBe('authed');
  });

  it('treats only an authentication-required response as a guest session', () => {
    const error = new ApiError('Not authenticated', 401, { code: API_ERROR_CODES.AUTH_REQUIRED });

    expect(getRouteAuthStatus(null, false, error)).toBe('guest');
  });

  it('does not open login for a transient session-check failure', () => {
    const error = new ApiError('Could not load current user', 500);

    expect(getRouteAuthStatus(null, false, error)).toBe('error');
  });
});
