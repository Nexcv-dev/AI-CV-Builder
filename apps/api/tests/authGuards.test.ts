import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { API_ERROR_CODES } from '../server-utils/apiErrors';
import {
  requireAdminPermission,
  requireAuth,
  requirePaidPlan,
  requireSuperAdmin,
  requireVerifiedEmail,
} from '../middlewares/auth';

const mockRes = () => {
  const res: any = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
};

const mockReq = (user?: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
  user,
  isAuthenticated: () => Boolean(user),
  ...extra,
}) as unknown as Request;

const verifiedFreeUser = { _id: 'u1', role: 'user', plan: 'free', emailVerified: true };
const unverifiedUser = { _id: 'u2', role: 'user', plan: 'free', emailVerified: false };
const paidUser = { _id: 'u3', role: 'user', plan: 'monthly', planExpiresAt: new Date(Date.now() + 86_400_000), emailVerified: true };

describe('auth guards', () => {
  it('requireAuth returns 401 AUTH_REQUIRED when signed out', () => {
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;
    requireAuth(mockReq(), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not authenticated', code: API_ERROR_CODES.AUTH_REQUIRED });
    expect(next).not.toHaveBeenCalled();
  });

  it('requireAuth calls next when signed in', () => {
    const next = vi.fn();
    requireAuth(mockReq(verifiedFreeUser), mockRes(), next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('requireVerifiedEmail returns 403 EMAIL_VERIFICATION_REQUIRED for unverified users', () => {
    const res = mockRes();
    expect(requireVerifiedEmail(mockReq(unverifiedUser), res)).toBe(false);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Verify your email to save CVs.',
      code: API_ERROR_CODES.EMAIL_VERIFICATION_REQUIRED,
    });
  });

  it('requireVerifiedEmail passes verified users, and everyone when verification is turned off', () => {
    expect(requireVerifiedEmail(mockReq(verifiedFreeUser), mockRes())).toBe(true);
    expect(requireVerifiedEmail(mockReq(unverifiedUser, { appSettings: { emailVerificationRequired: false } }), mockRes())).toBe(true);
  });

  it('requirePaidPlan returns 403 FORBIDDEN with upgradeRequired for free users', () => {
    const res = mockRes();
    expect(requirePaidPlan(mockReq(verifiedFreeUser), res)).toBe(false);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'AI features are available on paid plans.',
      code: API_ERROR_CODES.FORBIDDEN,
      upgradeRequired: true,
    });
  });

  it('requirePaidPlan passes paid users', () => {
    expect(requirePaidPlan(mockReq(paidUser), mockRes())).toBe(true);
  });

  it('requireSuperAdmin returns AUTH_REQUIRED when signed out and FORBIDDEN for non-admins', () => {
    const signedOut = mockRes();
    requireSuperAdmin(mockReq(), signedOut, vi.fn());
    expect(signedOut.status).toHaveBeenCalledWith(401);
    expect(signedOut.json).toHaveBeenCalledWith({ error: 'Not authenticated', code: API_ERROR_CODES.AUTH_REQUIRED });

    const nonAdmin = mockRes();
    const next = vi.fn();
    requireSuperAdmin(mockReq(verifiedFreeUser), nonAdmin, next);
    expect(nonAdmin.status).toHaveBeenCalledWith(403);
    expect(nonAdmin.json).toHaveBeenCalledWith({ error: 'Admin access required.', code: API_ERROR_CODES.FORBIDDEN });
    expect(next).not.toHaveBeenCalled();
  });

  it('requireAdminPermission returns AUTH_REQUIRED when signed out and FORBIDDEN without the permission', () => {
    const guard = requireAdminPermission('billing.read');

    const signedOut = mockRes();
    guard(mockReq(), signedOut, vi.fn());
    expect(signedOut.status).toHaveBeenCalledWith(401);
    expect(signedOut.json).toHaveBeenCalledWith({ error: 'Not authenticated', code: API_ERROR_CODES.AUTH_REQUIRED });

    const noPermission = mockRes();
    const next = vi.fn();
    guard(mockReq(verifiedFreeUser), noPermission, next);
    expect(noPermission.status).toHaveBeenCalledWith(403);
    expect(noPermission.json).toHaveBeenCalledWith({ error: 'Admin permission required.', code: API_ERROR_CODES.FORBIDDEN });
    expect(next).not.toHaveBeenCalled();
  });
});
