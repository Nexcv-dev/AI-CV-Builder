import { describe, expect, it } from 'vitest';
import { API_ERROR_CODES, defaultApiErrorCode } from './apiErrors';

describe('API error codes', () => {
    it('maps common HTTP statuses to stable fallback codes', () => {
        expect(defaultApiErrorCode(400)).toBe(API_ERROR_CODES.VALIDATION_FAILED);
        expect(defaultApiErrorCode(401)).toBe(API_ERROR_CODES.AUTH_REQUIRED);
        expect(defaultApiErrorCode(403)).toBe(API_ERROR_CODES.FORBIDDEN);
        expect(defaultApiErrorCode(429)).toBe(API_ERROR_CODES.RATE_LIMITED);
        expect(defaultApiErrorCode(503)).toBe(API_ERROR_CODES.SERVICE_UNAVAILABLE);
        expect(defaultApiErrorCode(500)).toBe(API_ERROR_CODES.INTERNAL_ERROR);
    });
});
