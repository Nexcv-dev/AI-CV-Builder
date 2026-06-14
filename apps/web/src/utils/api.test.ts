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

  it('preserves intentional request cancellation separately from network failures', async () => {
    const { isCancelledError, normalizeApiError } = await import('./api');
    const abortError = new DOMException('The operation was aborted.', 'AbortError');
    const normalized = normalizeApiError(abortError);

    expect(isCancelledError(normalized)).toBe(true);
    expect(normalized).toMatchObject({
      status: 0,
      data: { cancelled: true },
    });
  });

  it('reads server errors into an ApiError with status and response data', async () => {
    const { readApiResponse } = await import('./api');
    const response = new Response(JSON.stringify({
      error: 'AI service is temporarily unavailable.',
      code: 'AI_SERVICE_UNAVAILABLE',
    }), { status: 503 });

    await expect(readApiResponse(response, 'Could not generate summary.')).rejects.toMatchObject({
      name: 'ApiError',
      status: 503,
      message: 'AI service is temporarily unavailable.',
      code: 'AI_SERVICE_UNAVAILABLE',
      data: { code: 'AI_SERVICE_UNAVAILABLE' },
    });
  });

  it('reads successful text responses without treating HTML as JSON', async () => {
    const { readApiTextResponse } = await import('./api');
    const html = '<main><h1>Template</h1></main>';
    const response = new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });

    await expect(readApiTextResponse(response)).resolves.toBe(html);
  });

  it('preserves structured errors from text endpoints', async () => {
    const { readApiTextResponse } = await import('./api');
    const response = new Response(JSON.stringify({
      error: 'Template HTML not found.',
      code: 'VALIDATION_FAILED',
    }), { status: 404 });

    await expect(readApiTextResponse(response, 'Could not load template.')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      message: 'Template HTML not found.',
      code: 'VALIDATION_FAILED',
    });
  });

  it('classifies authentication errors by code with a legacy status fallback', async () => {
    const {
      API_ERROR_CODES,
      ApiError,
      isAuthRequiredError,
    } = await import('./api');

    expect(isAuthRequiredError(new ApiError('Sign in.', 401, {
      code: API_ERROR_CODES.AUTH_REQUIRED,
    }))).toBe(true);
    expect(isAuthRequiredError(new ApiError('Sign in.', 401))).toBe(true);
    expect(isAuthRequiredError(new ApiError('Invalid input.', 401, {
      code: API_ERROR_CODES.VALIDATION_FAILED,
    }))).toBe(false);
  });

  it('requires both the forbidden code and upgrade flag for upgrade behavior', async () => {
    const {
      API_ERROR_CODES,
      ApiError,
      isUpgradeRequiredError,
    } = await import('./api');

    expect(isUpgradeRequiredError(new ApiError('Upgrade.', 403, {
      code: API_ERROR_CODES.FORBIDDEN,
      upgradeRequired: true,
    }))).toBe(true);
    expect(isUpgradeRequiredError(new ApiError('Forbidden.', 403, {
      code: API_ERROR_CODES.FORBIDDEN,
    }))).toBe(false);
  });

  it('classifies existing-account conflicts by code instead of message text', async () => {
    const {
      API_ERROR_CODES,
      ApiError,
      isAccountExistsError,
    } = await import('./api');

    expect(isAccountExistsError(new ApiError('Any localized message.', 409, {
      code: API_ERROR_CODES.ACCOUNT_EXISTS,
    }))).toBe(true);
    expect(isAccountExistsError(new ApiError('An account already exists.', 409))).toBe(false);
  });

  it('classifies email verification requirements by code', async () => {
    const {
      API_ERROR_CODES,
      ApiError,
      isEmailVerificationRequiredError,
    } = await import('./api');

    expect(isEmailVerificationRequiredError(new ApiError('Verify your email.', 403, {
      code: API_ERROR_CODES.EMAIL_VERIFICATION_REQUIRED,
    }))).toBe(true);
    expect(isEmailVerificationRequiredError(new ApiError('Forbidden.', 403, {
      code: API_ERROR_CODES.FORBIDDEN,
    }))).toBe(false);
  });

  it('classifies invalid OTP and password reset token errors by code only', async () => {
    const {
      API_ERROR_CODES,
      ApiError,
      isOtpInvalidError,
      isPasswordResetTokenInvalidError,
    } = await import('./api');

    expect(isOtpInvalidError(new ApiError('Localized OTP message.', 400, {
      code: API_ERROR_CODES.OTP_INVALID,
    }))).toBe(true);
    expect(isOtpInvalidError(new ApiError('OTP is invalid.', 400))).toBe(false);

    expect(isPasswordResetTokenInvalidError(new ApiError('Localized reset message.', 400, {
      code: API_ERROR_CODES.PASSWORD_RESET_TOKEN_INVALID,
    }))).toBe(true);
    expect(isPasswordResetTokenInvalidError(new ApiError('Token expired.', 400))).toBe(false);
  });

  it('uses the caller fallback for an empty server error response', async () => {
    const { readApiResponse } = await import('./api');
    const response = new Response('', { status: 500 });

    await expect(readApiResponse(response, 'Could not save your CV.')).rejects.toMatchObject({
      status: 500,
      message: 'Could not save your CV.',
    });
  });
});
