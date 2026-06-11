import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('api helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('adds a CSRF token to unsafe requests and retries once after a stale-token failure', async () => {
    const csrfTokensSent: Array<string | null> = [];
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      csrfTokensSent.push(init?.headers instanceof Headers ? init.headers.get('X-CSRF-Token') : null);
      if (input === '/api/csrf-token' && csrfTokensSent.length === 1) {
        return Promise.resolve(new Response(JSON.stringify({ csrfToken: 'old-token' }), { status: 200 }));
      }
      if (input === '/api/cv' && csrfTokensSent.length === 2) {
        return Promise.resolve(new Response(JSON.stringify({ code: 'CSRF_TOKEN_INVALID' }), { status: 403 }));
      }
      if (input === '/api/csrf-token' && csrfTokensSent.length === 3) {
        return Promise.resolve(new Response(JSON.stringify({ csrfToken: 'fresh-token' }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    const { csrfFetch } = await import('./api');
    const response = await csrfFetch('/api/cv', {
      method: 'POST',
      body: JSON.stringify({ title: 'CV' }),
    });

    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/csrf-token', expect.objectContaining({
      credentials: 'include',
      cache: 'no-store',
    }));
    expect(csrfTokensSent).toEqual([null, 'old-token', null, 'fresh-token']);
  });

  it('normalizes network failures from apiFetch into a consistent ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const { apiFetch, NETWORK_ERROR_MESSAGE } = await import('./api');

    await expect(apiFetch('/api/auth/current-user')).rejects.toMatchObject({
      name: 'ApiError',
      status: 0,
      message: NETWORK_ERROR_MESSAGE,
      data: { networkError: true },
    });
  });
});
