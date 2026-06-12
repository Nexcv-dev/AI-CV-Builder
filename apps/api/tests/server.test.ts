import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import {
  EMAIL_VERIFICATION_ATTEMPT_LIMIT,
  EMAIL_VERIFICATION_ATTEMPT_WINDOW_MS,
  CV_IMPORT_LIMIT,
  CV_IMPORT_WINDOW_MS,
  EMAIL_VERIFICATION_RESEND_LIMIT,
  EMAIL_VERIFICATION_RESEND_WINDOW_MS,
  PAYHERE_PLAN_PRICES,
  buildPayHereCheckoutHash,
  buildPayHereMd5Signature,
  buildPasswordResetTransportOptions,
  generateCVHTML,
  getAuthenticatedRateLimitKey,
  getEmailVerificationAttemptRateLimitKey,
  payHereAmountToCents,
  resolvePayHerePaymentContext,
  renderCvTemplateString,
  sanitizeContextField,
  sanitizeCvDataForStorage,
  sanitizeTextForPrompt,
  verifyPayHereMd5Signature,
  requireAdminPermission,
} from '../server';
import { registerCvRoutes } from '../routes/cv';
import { registerPaymentRoutes } from '../routes/payment';
import { registerPublicRoutes } from '../routes/public';
import { isSuperAdminEmail, roleForEmail, syncUserRoleFromAllowlist } from '../server-models/userRole';
import { hasAdminPermission } from '@nexcv/shared/admin';
import { buildCvCreationQuota, getDailyCvCreationLimit, getUtcDayBounds } from '../server-models/cvQuota';
import { buildCvImportQuota, getCvImportQuotaPeriod } from '../server-models/cvImportQuota';
import { buildDownloadQuota, getDailyUnverifiedDownloadLimit, getNextUtcDayResetAt, getUtcDayKey } from '../server-models/downloadQuotaUtils';
import { createPlanExpiry, createRenewedPlanExpiry, getEffectivePlan, isPaidPlan } from '../server-models/userPlan';
import { logEvent } from '../server-utils/logger';
import { markExpiredPendingCheckouts } from '../services/checkoutSessionService';

describe('Server Utils', () => {
  describe('structured logging', () => {
    it('should redact sensitive metadata fields', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

      logEvent('warn', 'test.redaction', {
        orderId: 'order-123',
        md5sig: 'secret-signature',
        nested: { apiKey: 'secret-key', safe: 'visible' },
      });

      const line = String(spy.mock.calls[0][0]);
      expect(line).toContain('"event":"test.redaction"');
      expect(line).toContain('"orderId":"order-123"');
      expect(line).toContain('"safe":"visible"');
      expect(line).not.toContain('secret-signature');
      expect(line).not.toContain('secret-key');
      spy.mockRestore();
    });
  });

  describe('email verification rate limits', () => {
    it('should keep resend and verify OTP limits intentionally strict', () => {
      expect(EMAIL_VERIFICATION_RESEND_LIMIT).toBe(3);
      expect(EMAIL_VERIFICATION_RESEND_WINDOW_MS).toBe(15 * 60 * 1000);
      expect(EMAIL_VERIFICATION_ATTEMPT_LIMIT).toBe(5);
      expect(EMAIL_VERIFICATION_ATTEMPT_WINDOW_MS).toBe(10 * 60 * 1000);
    });

    it('should keep guest CV import rate limits intentionally strict', () => {
      expect(CV_IMPORT_LIMIT).toBe(5);
      expect(CV_IMPORT_WINDOW_MS).toBe(15 * 60 * 1000);
    });

    it('should rate-limit authenticated users by user id before falling back to IP', () => {
      expect(getAuthenticatedRateLimitKey({ user: { _id: { toString: () => 'user-123' } }, ip: '203.0.113.10' } as any)).toBe('user-123');
      expect(getAuthenticatedRateLimitKey({ user: { id: { toString: () => 'user-456' } }, ip: '203.0.113.10' } as any)).toBe('user-456');

      const ipOnlyKey = getAuthenticatedRateLimitKey({ user: null, ip: '203.0.113.10' } as any);
      expect(ipOnlyKey).toContain('203.0.113.10');
    });

    it('should rate-limit OTP verification attempts by account email across IPs', () => {
      const firstIpKey = getEmailVerificationAttemptRateLimitKey({
        user: null,
        body: { email: 'User@Example.com' },
        ip: '203.0.113.10',
      } as any);
      const secondIpKey = getEmailVerificationAttemptRateLimitKey({
        user: null,
        body: { email: ' user@example.com ' },
        ip: '198.51.100.20',
      } as any);

      expect(firstIpKey).toBe('email:user@example.com');
      expect(secondIpKey).toBe(firstIpKey);
      expect(getEmailVerificationAttemptRateLimitKey({
        user: { _id: { toString: () => 'user-123' } },
        body: { email: 'user@example.com' },
        ip: '203.0.113.10',
      } as any)).toBe('user:user-123');
    });
  });

  describe('PayHere IPN verification', () => {
    it('should reject client-side billing activation without updating the user', async () => {
      const app = express();
      const router = express.Router();
      const User = { findById: vi.fn() };

      app.use(express.json());
      registerPaymentRoutes(router, {
        User,
        billingQuoteLimiter: (_req: any, _res: any, next: any) => next(),
        currentUserId: vi.fn(() => '507f1f77bcf86cd799439011'),
        logEvent: vi.fn(),
        requireAdminPermission: vi.fn(() => (_req: any, res: any) => res.status(403).json({ error: 'Admin permission required.' })),
        requireAuth: (req: any, _res: any, next: any) => {
          req.user = { _id: '507f1f77bcf86cd799439011' };
          next();
        },
      });
      app.use(router);

      const server = await new Promise<Server>((resolve) => {
        const listeningServer = app.listen(0, '127.0.0.1', () => resolve(listeningServer));
      });
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Test server did not bind to a TCP port.');

      try {
        const response = await fetch(`http://127.0.0.1:${address.port}/api/billing/activate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: 'monthly' }),
        });
        const body = await response.json() as { error: string };

        expect(response.status).toBe(403);
        expect(body.error).toContain('Admin permission required');
        expect(User.findById).not.toHaveBeenCalled();
      } finally {
        await new Promise<void>((resolve, reject) => {
          server.close((error) => error ? reject(error) : resolve());
        });
      }
    });

    it('should build PayHere checkout hashes without exposing the merchant secret to the client', () => {
      const payload = {
        merchant_id: '1232679',
        order_id: 'NXCV-507f1f77bcf86cd799439011-payg-001',
        amount: PAYHERE_PLAN_PRICES.payg.amount,
        currency: 'LKR',
      };

      expect(buildPayHereCheckoutHash(payload, 'sandbox-secret')).toMatch(/^[A-F0-9]{32}$/);
    });

    it('should build and verify PayHere MD5 signatures', () => {
      const payload = {
        merchant_id: '1232679',
        order_id: 'NXCV-507f1f77bcf86cd799439011-payg-001',
        payhere_amount: PAYHERE_PLAN_PRICES.payg.amount,
        payhere_currency: 'LKR',
        status_code: '2',
      };
      const merchantSecret = 'sandbox-secret';
      const md5sig = buildPayHereMd5Signature(payload, merchantSecret);

      expect(md5sig).toMatch(/^[A-F0-9]{32}$/);
      expect(verifyPayHereMd5Signature({ ...payload, md5sig }, merchantSecret)).toBe(true);
      expect(verifyPayHereMd5Signature({ ...payload, md5sig: 'BAD' }, merchantSecret)).toBe(false);
    });

    it('should resolve user and plan from PayHere custom fields or order id', () => {
      expect(resolvePayHerePaymentContext({
        custom_1: '507f1f77bcf86cd799439011',
        custom_2: 'monthly',
        order_id: 'ignored',
      })).toEqual({
        userId: '507f1f77bcf86cd799439011',
        plan: 'monthly',
      });

      expect(resolvePayHerePaymentContext({
        order_id: 'NXCV-507f1f77bcf86cd799439011-payg-001',
      })).toEqual({
        userId: '507f1f77bcf86cd799439011',
        plan: 'payg',
      });

      expect(resolvePayHerePaymentContext({
        order_id: 'NXCV-507f1f77bcf86cd799439011-quarterly-001',
      })).toEqual({
        userId: '507f1f77bcf86cd799439011',
        plan: 'quarterly',
      });
    });

    it('should parse PayHere amounts to cents for price validation', () => {
      expect(payHereAmountToCents('499.00')).toBe(49900);
      expect(payHereAmountToCents('2199')).toBe(219900);
      expect(payHereAmountToCents('499.999')).toBeNull();
      expect(payHereAmountToCents('abc')).toBeNull();
    });
  });

  describe('super admin roles', () => {
    it('should assign super_admin only to allowlisted emails', () => {
      const original = process.env.SUPER_ADMIN_EMAILS;
      process.env.SUPER_ADMIN_EMAILS = 'owner@example.com, Admin@Example.com ';

      expect(isSuperAdminEmail('owner@example.com')).toBe(true);
      expect(isSuperAdminEmail('admin@example.com')).toBe(true);
      expect(roleForEmail('owner@example.com')).toBe('super_admin');
      expect(roleForEmail('user@example.com')).toBe('user');

      if (original === undefined) {
        delete process.env.SUPER_ADMIN_EMAILS;
      } else {
        process.env.SUPER_ADMIN_EMAILS = original;
      }
    });

    it('should not demote DB-managed admin roles when email is not allowlisted', async () => {
      const original = process.env.SUPER_ADMIN_EMAILS;
      process.env.SUPER_ADMIN_EMAILS = 'owner@example.com';
      const user = {
        email: 'manager@example.com',
        role: 'admin_manager',
        isModified: vi.fn(() => false),
        save: vi.fn(),
      } as any;

      await syncUserRoleFromAllowlist(user);

      expect(user.role).toBe('admin_manager');
      expect(user.save).not.toHaveBeenCalled();

      if (original === undefined) {
        delete process.env.SUPER_ADMIN_EMAILS;
      } else {
        process.env.SUPER_ADMIN_EMAILS = original;
      }
    });

    it('should promote allowlisted emails to super_admin', async () => {
      const original = process.env.SUPER_ADMIN_EMAILS;
      process.env.SUPER_ADMIN_EMAILS = 'owner@example.com';
      const user = {
        email: 'owner@example.com',
        role: 'support_agent',
        isModified: vi.fn(() => true),
        save: vi.fn(),
      } as any;

      await syncUserRoleFromAllowlist(user);

      expect(user.role).toBe('super_admin');
      expect(user.save).toHaveBeenCalled();

      if (original === undefined) {
        delete process.env.SUPER_ADMIN_EMAILS;
      } else {
        process.env.SUPER_ADMIN_EMAILS = original;
      }
    });
  });

  describe('admin permissions', () => {
    it('should allow only expected role capabilities', () => {
      expect(hasAdminPermission({ role: 'super_admin' }, 'users.role.update')).toBe(true);
      expect(hasAdminPermission({ role: 'admin_manager' }, 'users.read')).toBe(true);
      expect(hasAdminPermission({ role: 'admin_manager' }, 'users.plan.update')).toBe(true);
      expect(hasAdminPermission({ role: 'admin_manager' }, 'users.role.update')).toBe(false);
      expect(hasAdminPermission({ role: 'billing_manager' }, 'billing.write')).toBe(true);
      expect(hasAdminPermission({ role: 'support_agent' }, 'support.write')).toBe(true);
      expect(hasAdminPermission({ role: 'analyst' }, 'billing.read')).toBe(false);
      expect(hasAdminPermission({ role: 'user' }, 'dashboard.read')).toBe(false);
    });

    it('should enforce permission middleware with 401, 403, and allow outcomes', () => {
      const middleware = requireAdminPermission('billing.write');
      const next = vi.fn();
      const unauthenticatedReq = { isAuthenticated: () => false } as any;
      const forbiddenReq = { isAuthenticated: () => true, user: { role: 'support_agent' } } as any;
      const allowedReq = { isAuthenticated: () => true, user: { role: 'billing_manager' } } as any;
      const res = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() } as any);

      const unauthenticatedRes = res();
      middleware(unauthenticatedReq, unauthenticatedRes, next);
      expect(unauthenticatedRes.status).toHaveBeenCalledWith(401);

      const forbiddenRes = res();
      middleware(forbiddenReq, forbiddenRes, next);
      expect(forbiddenRes.status).toHaveBeenCalledWith(403);

      const allowedRes = res();
      middleware(allowedReq, allowedRes, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(allowedRes.status).not.toHaveBeenCalled();
    });
  });

  describe('CV creation quota', () => {
    it('should default to 1 free CV creation', () => {
      const original = process.env.DAILY_CV_CREATION_LIMIT;
      delete process.env.DAILY_CV_CREATION_LIMIT;

      expect(getDailyCvCreationLimit()).toBe(1);

      if (original === undefined) {
        delete process.env.DAILY_CV_CREATION_LIMIT;
      } else {
        process.env.DAILY_CV_CREATION_LIMIT = original;
      }
    });

    it('should mark regular users as limited after reaching free quota', () => {
      const original = process.env.DAILY_CV_CREATION_LIMIT;
      process.env.DAILY_CV_CREATION_LIMIT = '2';

      expect(buildCvCreationQuota({ role: 'user' } as any, 1)).toEqual({
        limit: 2,
        used: 1,
        remaining: 1,
        reached: false,
        plan: 'free',
      });
      expect(buildCvCreationQuota({ role: 'user' } as any, 2)).toEqual({
        limit: 2,
        used: 2,
        remaining: 0,
        reached: true,
        plan: 'free',
      });

      if (original === undefined) {
        delete process.env.DAILY_CV_CREATION_LIMIT;
      } else {
        process.env.DAILY_CV_CREATION_LIMIT = original;
      }
    });

    it('should not limit super admins', () => {
      expect(buildCvCreationQuota({ role: 'super_admin' } as any, 999)).toEqual({
        limit: null,
        used: 999,
        remaining: null,
        reached: false,
        plan: 'unlimited',
      });
    });

    it('should add one extra CV save for each Single CV Pass purchase and make Pro plans unlimited', () => {
      const future = new Date(Date.now() + 100000);
      expect(buildCvCreationQuota({ role: 'user', plan: 'payg', planExpiresAt: future } as any, 1)).toEqual({
        limit: 1,
        used: 1,
        remaining: 0,
        reached: true,
        plan: 'payg',
      });
      expect(buildCvCreationQuota({ role: 'user', plan: 'payg', planStartedAt: new Date(), planExpiresAt: future } as any, 1)).toEqual({
        limit: 2,
        used: 1,
        remaining: 1,
        reached: false,
        plan: 'payg',
      });
      expect(buildCvCreationQuota({ role: 'user', plan: 'payg', planExpiresAt: future, paygCvSaveCredits: 2 } as any, 2)).toEqual({
        limit: 3,
        used: 2,
        remaining: 1,
        reached: false,
        plan: 'payg',
      });
      expect(buildCvCreationQuota({ role: 'user', plan: 'monthly', planExpiresAt: future } as any, 99)).toEqual({
        limit: null,
        used: 99,
        remaining: null,
        reached: false,
        plan: 'monthly',
      });
      expect(buildCvCreationQuota({ role: 'user', plan: 'quarterly', planExpiresAt: future } as any, 99)).toEqual({
        limit: null,
        used: 99,
        remaining: null,
        reached: false,
        plan: 'quarterly',
      });
    });

    it('should calculate UTC day bounds', () => {
      const { start, end } = getUtcDayBounds(new Date('2026-05-13T18:30:00.000Z'));
      expect(start.toISOString()).toBe('2026-05-13T00:00:00.000Z');
      expect(end.toISOString()).toBe('2026-05-14T00:00:00.000Z');
    });
  });

  describe('download quota', () => {
    it('should default free users to 1 lifetime download', () => {
      const original = process.env.DAILY_UNVERIFIED_DOWNLOAD_LIMIT;
      delete process.env.DAILY_UNVERIFIED_DOWNLOAD_LIMIT;

      expect(getDailyUnverifiedDownloadLimit()).toBe(1);
      expect(buildDownloadQuota({ authProvider: 'email', emailVerified: true, role: 'user' } as any, 0)).toEqual({
        limit: 1,
        used: 0,
        remaining: 1,
        reached: false,
        plan: 'free',
      });
      expect(buildDownloadQuota({ authProvider: 'google', emailVerified: true, role: 'user' } as any, 1)).toEqual({
        limit: 1,
        used: 1,
        remaining: 0,
        reached: true,
        plan: 'free',
      });

      if (original === undefined) {
        delete process.env.DAILY_UNVERIFIED_DOWNLOAD_LIMIT;
      } else {
        process.env.DAILY_UNVERIFIED_DOWNLOAD_LIMIT = original;
      }
    });

    it('should not limit super admins', () => {
      expect(buildDownloadQuota({ authProvider: 'email', emailVerified: true, role: 'super_admin' } as any, 99)).toEqual({
        limit: null,
        used: 99,
        remaining: null,
        reached: false,
        plan: 'unlimited',
      });
    });

    it('should limit PAYG downloads to 15 per UTC day while active', () => {
      const future = new Date(Date.now() + 100000);
      expect(buildDownloadQuota({ authProvider: 'email', emailVerified: true, role: 'user', plan: 'payg', planExpiresAt: future } as any, 14)).toEqual({
        limit: 15,
        used: 14,
        remaining: 1,
        reached: false,
        plan: 'payg',
      });
      expect(buildDownloadQuota({ authProvider: 'email', emailVerified: true, role: 'user', plan: 'payg', planExpiresAt: future } as any, 15)).toEqual({
        limit: 15,
        used: 15,
        remaining: 0,
        reached: true,
        plan: 'payg',
      });
    });

    it('should limit Pro plan downloads to 25 per UTC day while active', () => {
      const future = new Date(Date.now() + 100000);
      expect(buildDownloadQuota({ authProvider: 'email', emailVerified: true, role: 'user', plan: 'monthly', planExpiresAt: future } as any, 24)).toEqual({
        limit: 25,
        used: 24,
        remaining: 1,
        reached: false,
        plan: 'monthly',
      });
      expect(buildDownloadQuota({ authProvider: 'email', emailVerified: true, role: 'user', plan: 'monthly', planExpiresAt: future } as any, 25)).toEqual({
        limit: 25,
        used: 25,
        remaining: 0,
        reached: true,
        plan: 'monthly',
      });
      expect(buildDownloadQuota({ authProvider: 'email', emailVerified: true, role: 'user', plan: 'quarterly', planExpiresAt: future } as any, 24)).toEqual({
        limit: 25,
        used: 24,
        remaining: 1,
        reached: false,
        plan: 'quarterly',
      });
    });

    it('should build a UTC day key', () => {
      expect(getUtcDayKey(new Date('2026-05-13T18:30:00.000Z'))).toBe('2026-05-13');
    });

    it('should calculate the next UTC download reset time', () => {
      expect(getNextUtcDayResetAt(new Date('2026-05-13T18:30:00.000Z'))).toBe('2026-05-14T00:00:00.000Z');
    });

    it('should reserve download quota before generating PDFs', async () => {
      const app = express();
      const router = express.Router();
      const user = { _id: '507f1f77bcf86cd799439011', role: 'user', plan: 'free', emailVerified: true, authProvider: 'email' };
      const generatePdfDocument = vi.fn().mockResolvedValue({
        buffer: Buffer.from('%PDF-1.4'),
        renderer: 'test',
        templateSource: 'built-in',
      });
      const consumeDownloadQuota = vi.fn()
        .mockResolvedValueOnce({ limit: 1, used: 1, remaining: 0, reached: true, plan: 'free', reserved: true })
        .mockResolvedValueOnce({ limit: 1, used: 1, remaining: 0, reached: true, plan: 'free', reserved: false });

      registerCvRoutes(router, {
        aiLimiter: (_req: any, _res: any, next: any) => next(),
        cvImportLimiter: (_req: any, _res: any, next: any) => next(),
        CV_TEMPLATES: [{ key: 'classic' }],
        cvImportJsonParser: express.json({ limit: '1mb' }),
        DEFAULT_TEMPLATE: 'classic',
        TemplateSetting: { findOne: vi.fn() },
        consumeDownloadQuota,
        currentUserId: vi.fn(() => user._id),
        fetchS3Text: vi.fn(),
        generateCVHTML: vi.fn(() => '<html></html>'),
        generatePdfDocument,
        generateS3CVHTML: vi.fn().mockResolvedValue(null),
        getActiveTemplateForKey: vi.fn().mockResolvedValue({ key: 'classic', access: 'free' }),
        getDownloadQuota: vi.fn().mockResolvedValue({ limit: 1, used: 0, remaining: 1, reached: false, plan: 'free' }),
        logError: vi.fn(),
        logEvent: vi.fn(),
        pdfJsonParser: express.json({ limit: '1mb' }),
        pdfLimiter: (_req: any, _res: any, next: any) => next(),
        renderCvTemplateString: vi.fn(),
        requireAuth: (req: any, _res: any, next: any) => {
          req.user = user;
          next();
        },
        rollbackDownloadQuota: vi.fn(),
        sanitizeCvData: vi.fn((value) => value),
        sendError: (res: any, status: number, message: string) => res.status(status).json({ error: message }),
        templateRequiresPaidPlan: vi.fn(() => false),
      });
      app.use(router);

      const server = await new Promise<Server>((resolve) => {
        const listeningServer = app.listen(0, '127.0.0.1', () => resolve(listeningServer));
      });
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Test server did not bind to a TCP port.');

      try {
        const first = await fetch(`http://127.0.0.1:${address.port}/api/generate-pdf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cvData: { personalInfo: { fullName: 'Jane' } }, template: 'classic' }),
        });
        const second = await fetch(`http://127.0.0.1:${address.port}/api/generate-pdf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cvData: { personalInfo: { fullName: 'Jane' } }, template: 'classic' }),
        });
        const secondBody = await second.json() as { error: string; upgradeRequired: boolean };

        expect(first.status).toBe(200);
        expect(second.status).toBe(403);
        expect(secondBody.upgradeRequired).toBe(true);
        expect(consumeDownloadQuota).toHaveBeenCalledTimes(2);
        expect(generatePdfDocument).toHaveBeenCalledTimes(1);
      } finally {
        await new Promise<void>((resolve, reject) => {
          server.close((error) => error ? reject(error) : resolve());
        });
      }
    });
  });

  describe('CV import quota', () => {
    it('should enforce the configured plan import limits', () => {
      const now = new Date('2026-06-03T10:00:00.000Z');
      const future = new Date('2026-07-03T10:00:00.000Z');

      expect(buildCvImportQuota({ role: 'user', plan: 'free' } as any, 4, now)).toEqual({
        limit: 5,
        used: 4,
        remaining: 1,
        reached: false,
        plan: 'free',
        period: 'free:2026-06',
        resetAt: '2026-07-01T00:00:00.000Z',
      });
      expect(buildCvImportQuota({ role: 'user', plan: 'free' } as any, 5, now).reached).toBe(true);
      expect(buildCvImportQuota({ role: 'user', plan: 'payg', planStartedAt: now, planExpiresAt: future } as any, 14, now)).toMatchObject({
        limit: 15,
        remaining: 1,
        plan: 'payg',
      });
      expect(buildCvImportQuota({ role: 'user', plan: 'monthly', planStartedAt: now, planExpiresAt: future } as any, 99, now)).toMatchObject({
        limit: 100,
        remaining: 1,
        plan: 'monthly',
      });
      expect(buildCvImportQuota({ role: 'user', plan: 'quarterly', planStartedAt: now, planExpiresAt: future } as any, 299, now)).toMatchObject({
        limit: 300,
        remaining: 1,
        plan: 'quarterly',
      });
      expect(buildCvImportQuota({ role: 'super_admin' } as any, 999, now)).toEqual({
        limit: null,
        used: 999,
        remaining: null,
        reached: false,
        plan: 'unlimited',
        period: 'unlimited',
      });
    });

    it('should use the active paid plan period as the quota key', () => {
      const startedAt = new Date('2026-06-03T10:00:00.000Z');
      const expiresAt = new Date('2026-06-10T10:00:00.000Z');
      expect(getCvImportQuotaPeriod({ role: 'user', plan: 'payg', planStartedAt: startedAt, planExpiresAt: expiresAt } as any, startedAt)).toEqual({
        plan: 'payg',
        period: 'payg:2026-06-03:2026-06-10',
        resetAt: '2026-06-10T10:00:00.000Z',
      });
    });

    it('should reject authenticated imports before OCR when the plan quota is exhausted', async () => {
      const app = express();
      const router = express.Router();
      const user = { _id: '507f1f77bcf86cd799439011', role: 'user', plan: 'free' };
      const extractCvText = vi.fn();

      registerCvRoutes(router, {
        aiLimiter: (_req: any, _res: any, next: any) => next(),
        cvImportLimiter: (_req: any, _res: any, next: any) => next(),
        cvImportJsonParser: express.json({ limit: '1mb' }),
        pdfLimiter: (_req: any, _res: any, next: any) => next(),
        pdfJsonParser: express.json({ limit: '1mb' }),
        requireAuth: (_req: any, _res: any, next: any) => next(),
        ALLOWED_MIME_TYPES: ['image/png'],
        MAX_BASE64_LENGTH: 1000,
        consumeCvImportQuota: vi.fn().mockResolvedValue({
          limit: 5,
          used: 5,
          remaining: 0,
          reached: true,
          plan: 'free',
          period: 'free:2026-06',
          reserved: false,
        }),
        extractCvText,
        parseCvTextToStructuredData: vi.fn(),
        sendError: (res: any, status: number, message: string) => res.status(status).json({ error: message }),
        withImportMeta: vi.fn((data, meta) => ({ ...data, importMeta: meta })),
        isPaidPlan: vi.fn(() => false),
      });
      app.use((req: any, _res, next) => {
        req.user = user;
        req.isAuthenticated = () => true;
        next();
      });
      app.use(router);

      const server = await new Promise<Server>((resolve) => {
        const listeningServer = app.listen(0, '127.0.0.1', () => resolve(listeningServer));
      });
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Test server did not bind to a TCP port.');

      try {
        const response = await fetch(`http://127.0.0.1:${address.port}/api/parse-cv`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64Data: 'abcd', mimeType: 'image/png' }),
        });
        const body = await response.json() as { error: string; upgradeRequired: boolean };

        expect(response.status).toBe(403);
        expect(body.error).toContain('CV import limit reached');
        expect(body.upgradeRequired).toBe(true);
        expect(extractCvText).not.toHaveBeenCalled();
      } finally {
        await new Promise<void>((resolve, reject) => {
          server.close((error) => error ? reject(error) : resolve());
        });
      }
    });
  });

  describe('public CV sharing', () => {
    it('should keep live-link analytics in the document list after reload', async () => {
      const app = express();
      const router = express.Router();
      const user = { _id: '507f1f77bcf86cd799439011' };
      const document = {
        _id: '507f1f77bcf86cd799439012',
        title: 'Jane CV',
        template: 'classic',
        status: 'completed',
        shareEnabled: true,
        shareSlug: 'public_slug_123456',
        shareViewCount: 12,
        shareDownloadCount: 4,
        createdAt: new Date('2026-06-01T00:00:00.000Z'),
        updatedAt: new Date('2026-06-02T00:00:00.000Z'),
      };
      const select = vi.fn().mockResolvedValue([document]);
      const sort = vi.fn(() => ({ select }));
      const CVDocument = {
        find: vi.fn(() => ({ sort })),
      };

      app.use((req: any, _res, next) => {
        req.user = user;
        req.isAuthenticated = () => true;
        next();
      });
      registerCvRoutes(router, {
        CVDocument,
        aiLimiter: (_req: any, _res: any, next: any) => next(),
        cvImportLimiter: (_req: any, _res: any, next: any) => next(),
        pdfLimiter: (_req: any, _res: any, next: any) => next(),
        cvImportJsonParser: express.json({ limit: '1mb' }),
        pdfJsonParser: express.json({ limit: '1mb' }),
        requireAuth: (_req: any, _res: any, next: any) => next(),
        currentUserId: () => user._id,
        getCvCreationQuota: vi.fn().mockResolvedValue({
          limit: 5,
          used: 1,
          remaining: 4,
          reached: false,
        }),
        getDownloadQuota: vi.fn().mockResolvedValue({
          limit: 1,
          used: 0,
          remaining: 1,
          reached: false,
        }),
        documentSummary: (doc: any) => ({
          id: String(doc._id),
          title: doc.title,
          template: doc.template,
          status: doc.status,
          shareEnabled: Boolean(doc.shareEnabled),
          shareSlug: doc.shareSlug,
          shareUrl: doc.shareEnabled ? `/cv/${doc.shareSlug}` : null,
          shareViewCount: doc.shareViewCount,
          shareDownloadCount: doc.shareDownloadCount,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        }),
        sendError: (res: any, status: number, message: string) => res.status(status).json({ error: message }),
      });
      app.use(router);

      const server = await new Promise<Server>((resolve) => {
        const listeningServer = app.listen(0, '127.0.0.1', () => resolve(listeningServer));
      });
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Test server did not bind to a TCP port.');

      try {
        const response = await fetch(`http://127.0.0.1:${address.port}/api/documents`);
        const body = await response.json() as { documents: any[] };

        expect(response.status).toBe(200);
        expect(body.documents[0]).toMatchObject({
          shareEnabled: true,
          shareSlug: 'public_slug_123456',
          shareViewCount: 12,
          shareDownloadCount: 4,
        });
        expect(select).toHaveBeenCalledWith(expect.stringContaining('shareEnabled'));
        expect(select).toHaveBeenCalledWith(expect.stringContaining('shareViewCount'));
        expect(select).toHaveBeenCalledWith(expect.stringContaining('shareDownloadCount'));
      } finally {
        await new Promise<void>((resolve, reject) => {
          server.close((error) => error ? reject(error) : resolve());
        });
      }
    });

    it('should enable, return, and disable an owned live CV link', async () => {
      const app = express();
      const router = express.Router();
      const user = { _id: '507f1f77bcf86cd799439011' };
      const document = {
        _id: '507f1f77bcf86cd799439012',
        userId: user._id,
        title: 'Jane CV',
        template: 'classic',
        status: 'completed',
        cvData: { personalInfo: { fullName: 'Jane' } },
        shareEnabled: false,
        shareSlug: null,
        shareRevokedAt: null as Date | null,
        createdAt: new Date('2026-06-01T00:00:00.000Z'),
        updatedAt: new Date('2026-06-01T00:00:00.000Z'),
        save: vi.fn().mockResolvedValue(undefined),
      };
      const CVDocument = {
        findOne: vi.fn().mockResolvedValue(document),
      };

      app.use(express.json());
      app.use((req: any, _res, next) => {
        req.user = user;
        req.isAuthenticated = () => true;
        next();
      });
      registerCvRoutes(router, {
        CVDocument,
        aiLimiter: (_req: any, _res: any, next: any) => next(),
        cvImportLimiter: (_req: any, _res: any, next: any) => next(),
        pdfLimiter: (_req: any, _res: any, next: any) => next(),
        cvImportJsonParser: express.json({ limit: '1mb' }),
        pdfJsonParser: express.json({ limit: '1mb' }),
        requireAuth: (_req: any, _res: any, next: any) => next(),
        currentUserId: () => user._id,
        isValidDocumentId: () => true,
        randomBytes: () => Buffer.from('123456789012345678'),
        isMongoDuplicateKeyError: () => false,
        documentSummary: (doc: any) => ({
          id: String(doc._id),
          title: doc.title,
          template: doc.template,
          shareEnabled: Boolean(doc.shareEnabled),
          shareSlug: doc.shareSlug,
          shareUrl: doc.shareEnabled && doc.shareSlug ? `/cv/${doc.shareSlug}` : null,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        }),
        publicCvShareUrl: (slug: string) => `https://app.example.com/cv/${slug}`,
        getApiOrigin: () => 'https://app.example.com',
        sendError: (res: any, status: number, message: string) => res.status(status).json({ error: message }),
      });
      app.use(router);

      const server = await new Promise<Server>((resolve) => {
        const listeningServer = app.listen(0, '127.0.0.1', () => resolve(listeningServer));
      });
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Test server did not bind to a TCP port.');

      try {
        const enable = await fetch(`http://127.0.0.1:${address.port}/api/documents/${document._id}/share`, { method: 'POST' });
        const enableBody = await enable.json() as { shareUrl: string; document: any };

        expect(enable.status).toBe(201);
        expect(enableBody.shareUrl).toMatch(/^https:\/\/app\.example\.com\/cv\//);
        expect(enableBody.document.shareEnabled).toBe(true);
        expect(document.shareEnabled).toBe(true);
        expect(document.shareSlug).toBeTruthy();

        const disable = await fetch(`http://127.0.0.1:${address.port}/api/documents/${document._id}/share`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: false }),
        });
        const disableBody = await disable.json() as { shareUrl: string | null; document: any };

        expect(disable.status).toBe(200);
        expect(disableBody.shareUrl).toBeNull();
        expect(disableBody.document.shareEnabled).toBe(false);
        expect(document.shareRevokedAt).toBeInstanceOf(Date);
      } finally {
        await new Promise<void>((resolve, reject) => {
          server.close((error) => error ? reject(error) : resolve());
        });
      }
    });

    it('should render only enabled shared CVs through the public route', async () => {
      const app = express();
      const router = express.Router();
      const publicDocument = {
        _id: '507f1f77bcf86cd799439012',
        title: 'Jane CV',
        template: 'classic',
        shareEnabled: true,
        shareSlug: 'public_slug_123456',
        userId: { role: 'user', plan: 'free' },
        cvData: {
          personalInfo: {
            fullName: 'Jane Doe',
            summary: 'Safe profile at https://github.com/Nexcv-dev/AI-CV-Builder',
          },
        },
      };
      const CVDocument = {
        findOne: vi.fn(() => ({
          populate: vi.fn().mockResolvedValue(publicDocument),
        })),
        updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
      };
      const generatePdfDocument = vi.fn().mockResolvedValue({
        buffer: Buffer.from('%PDF-1.4 shared'),
        renderer: 'test',
        templateSource: 'shared-cv',
      });

      registerPublicRoutes(router, {
        CVDocument,
        CV_TEMPLATES: [{ key: 'classic' }],
        DEFAULT_TEMPLATE: 'classic',
        TemplateSetting: { findOne: vi.fn() },
        publicFormLimiter: (_req: any, _res: any, next: any) => next(),
        generateS3CVHTML: vi.fn().mockResolvedValue(null),
        generateCVHTML: vi.fn((cvData: any) => `<html><head></head><body>${cvData.personalInfo.fullName}<p>${cvData.personalInfo.summary}</p><a href="https://example.com">Existing</a></body></html>`),
        generatePdfDocument,
        sanitizeCvData: vi.fn((data) => data),
        isPaidPlan: vi.fn(() => false),
        getApiOrigin: () => 'https://app.example.com',
        sendError: (res: any, status: number, message: string) => res.status(status).json({ error: message }),
      });
      app.use(router);

      const server = await new Promise<Server>((resolve) => {
        const listeningServer = app.listen(0, '127.0.0.1', () => resolve(listeningServer));
      });
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Test server did not bind to a TCP port.');

      try {
        const response = await fetch(`http://127.0.0.1:${address.port}/cv/public_slug_123456`);
        const html = await response.text();

        expect(response.status).toBe(200);
        expect(response.headers.get('cache-control')).toContain('s-maxage=300');
        expect(html).toContain('<title>Jane Doe - CV</title>');
        expect(html).toContain('Jane Doe');
        expect(html).toContain('<a href="https://github.com/Nexcv-dev/AI-CV-Builder" target="_blank" rel="noopener noreferrer">https://github.com/Nexcv-dev/AI-CV-Builder</a>');
        expect(html).toContain('<a href="https://example.com">Existing</a>');
        expect(html).toContain('<a href="/cv/public_slug_123456/download">Download PDF</a>');
        expect(html).toContain('<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover">');
        expect(html).toContain('<script src="/assets/public-cv-preview.js?v=20260611-2" defer></script>');
        expect(html).toContain('box-sizing: border-box !important;');
        expect(html).toContain('overflow-x: hidden !important;');
        expect(html).toContain('overscroll-behavior-y: none !important;');
        expect(html).toContain('touch-action: pan-y !important;');
        expect(html).toContain('position: sticky !important;');
        expect(html).toContain('top: 12px !important;');
        expect(html).toContain('min-height: 62px !important;');
        expect(html).toContain('overflow: visible !important;');
        expect(html).toContain('margin: 0 auto 16px !important;');
        expect(html).toContain('@media screen and (min-width: 841px)');
        expect(html).toContain('padding-top: 12px !important;');
        expect(html).toContain('overflow-y: auto !important;');
        expect(html).toContain('-webkit-overflow-scrolling: touch !important;');
        expect(html).toContain('transform: scale(0.90) !important;');
        expect(html).toContain('transform: scale(0.82) !important;');
        expect(html).toContain('touch-action: pan-x pan-y pinch-zoom !important;');
        expect(html).toContain('padding: 16px 12px calc(116px + env(safe-area-inset-bottom)) !important;');
        expect(html).toContain('bottom: max(12px, env(safe-area-inset-bottom)) !important;');
        expect(html).toContain('transform: scale(0.43) !important;');
        expect(html).toContain('min-height: 44px !important;');
        expect(html).toContain('font-size: 13px !important;');
        expect(html).toContain('.nexcv-public-toolbar a.is-loading::before');
        expect(CVDocument.findOne).toHaveBeenCalledWith({ shareEnabled: true, shareSlug: 'public_slug_123456' });

        const previewScript = await fetch(`http://127.0.0.1:${address.port}/assets/public-cv-preview.js`);
        const previewScriptBody = await previewScript.text();
        expect(previewScript.status).toBe(200);
        expect(previewScript.headers.get('content-type')).toContain('application/javascript');
        expect(previewScript.headers.get('cache-control')).toContain('no-store');
        expect(previewScriptBody).toContain("matchMedia('(max-width: 840px)')");
        expect(previewScriptBody).toContain('setupOverscrollGuard();');
        expect(previewScriptBody).toContain("document.body.addEventListener('touchmove'");
        expect(previewScriptBody).toContain('document.body.scrollTop');
        expect(previewScriptBody).toContain("preview.style.setProperty('margin-bottom'");
        expect(previewScriptBody.indexOf('setupDownloadButton();')).toBeLessThan(previewScriptBody.indexOf('preview = findPreview();'));
        expect(previewScriptBody).toContain("button.textContent = 'Preparing PDF...'");
        expect(previewScriptBody).toContain("await fetch(button.href");

        const missing = await fetch(`http://127.0.0.1:${address.port}/cv/bad`);
        expect(missing.status).toBe(404);

        const download = await fetch(`http://127.0.0.1:${address.port}/cv/public_slug_123456/download`);
        const downloadBody = Buffer.from(await download.arrayBuffer()).toString('utf8');

        expect(download.status).toBe(200);
        expect(download.headers.get('content-type')).toContain('application/pdf');
        expect(download.headers.get('content-disposition')).toContain('Jane_CV_Resume.pdf');
        expect(downloadBody).toContain('%PDF-1.4 shared');
        expect(generatePdfDocument).toHaveBeenCalledWith(expect.objectContaining({
          template: 'classic',
          watermark: true,
          templateSource: 'shared-cv',
        }));
        expect(CVDocument.updateOne).toHaveBeenCalledWith(
          { _id: publicDocument._id },
          expect.objectContaining({ $inc: { shareDownloadCount: 1 } })
        );
      } finally {
        await new Promise<void>((resolve, reject) => {
          server.close((error) => error ? reject(error) : resolve());
        });
      }
    });
  });

  describe('billing plans', () => {
    it('should treat expired paid plans as free', () => {
      const past = new Date(Date.now() - 1000);
      (['payg', 'monthly', 'quarterly'] as const).forEach((plan) => {
        expect(getEffectivePlan({ role: 'user', plan, planExpiresAt: past } as any)).toBe('free');
        expect(isPaidPlan({ role: 'user', plan, planExpiresAt: past } as any)).toBe(false);
      });
    });

    it('should switch paid plans to free on the exact expiry date', () => {
      const expiresAt = new Date('2026-06-02T00:00:00.000Z');
      (['payg', 'monthly', 'quarterly'] as const).forEach((plan) => {
        const user = { role: 'user', plan, planExpiresAt: expiresAt } as any;
        expect(getEffectivePlan(user, new Date('2026-06-01T23:59:59.999Z'))).toBe(plan);
        expect(getEffectivePlan(user, expiresAt)).toBe('free');
      });
    });

    it('should apply free quotas after any paid package expires', () => {
      const past = new Date(Date.now() - 1000);
      (['payg', 'monthly', 'quarterly'] as const).forEach((plan) => {
        expect(buildCvCreationQuota({ role: 'user', plan, planExpiresAt: past, paygCvSaveCredits: 2 } as any, 0)).toEqual({
          limit: 1,
          used: 0,
          remaining: 1,
          reached: false,
          plan: 'free',
        });
        expect(buildDownloadQuota({ authProvider: 'email', emailVerified: true, role: 'user', plan, planExpiresAt: past } as any, 0)).toEqual({
          limit: 1,
          used: 0,
          remaining: 1,
          reached: false,
          plan: 'free',
        });
      });
    });

    it('should create plan expiry dates from the selected duration', () => {
      const start = new Date('2026-05-16T00:00:00.000Z');
      expect(createPlanExpiry('payg', start).toISOString()).toBe('2026-05-23T00:00:00.000Z');
      expect(createPlanExpiry('monthly', start).toISOString()).toBe('2026-06-15T00:00:00.000Z');
      expect(createPlanExpiry('quarterly', start).toISOString()).toBe('2026-08-14T00:00:00.000Z');
    });

    it('should extend renewals from the active expiry instead of shortening paid time', () => {
      const now = new Date('2026-05-16T00:00:00.000Z');
      const activeExpiry = new Date('2026-05-26T00:00:00.000Z');
      const expiredExpiry = new Date('2026-05-10T00:00:00.000Z');

      expect(createRenewedPlanExpiry('monthly', { planExpiresAt: activeExpiry } as any, now).toISOString()).toBe('2026-06-25T00:00:00.000Z');
      expect(createRenewedPlanExpiry('monthly', { planExpiresAt: expiredExpiry } as any, now).toISOString()).toBe('2026-06-15T00:00:00.000Z');
      expect(createRenewedPlanExpiry('payg', null, now).toISOString()).toBe('2026-05-23T00:00:00.000Z');
    });
  });

  describe('checkout session cleanup', () => {
    it('should release reserved coupon slots when pending checkouts expire', async () => {
      const expiredCheckouts = [{ _id: 'checkout-1', couponCode: 'SAVE10' }];
      const select = vi.fn().mockResolvedValue(expiredCheckouts);
      const CheckoutSession = {
        find: vi.fn(() => ({ select })),
        updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
        updateMany: vi.fn().mockResolvedValue({ modifiedCount: 0 }),
      };
      const Coupon = {
        updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
      };

      await markExpiredPendingCheckouts(CheckoutSession, Coupon);

      expect(CheckoutSession.find).toHaveBeenCalledWith(expect.objectContaining({
        status: 'pending',
        couponReserved: true,
        couponCode: { $exists: true, $ne: '' },
      }));
      expect(select).toHaveBeenCalledWith('_id couponCode');
      expect(CheckoutSession.updateOne).toHaveBeenCalledWith(
        { _id: 'checkout-1', status: 'pending', couponReserved: true },
        { $set: expect.objectContaining({ status: 'expired', billingReviewStatus: 'resolved', couponReserved: false }) }
      );
      expect(Coupon.updateOne).toHaveBeenCalledWith(
        { code: 'SAVE10', redeemedCount: { $gt: 0 } },
        { $inc: { redeemedCount: -1 } }
      );
      expect(CheckoutSession.updateMany).toHaveBeenCalledWith(
        { status: 'pending', expiresAt: { $lt: expect.any(Date) } },
        { $set: expect.objectContaining({ status: 'expired', billingReviewStatus: 'resolved' }) }
      );
    });

    it('should not release a coupon slot if another cleanup already claimed the checkout', async () => {
      const CheckoutSession = {
        find: vi.fn(() => ({ select: vi.fn().mockResolvedValue([{ _id: 'checkout-1', couponCode: 'SAVE10' }]) })),
        updateOne: vi.fn().mockResolvedValue({ modifiedCount: 0 }),
        updateMany: vi.fn().mockResolvedValue({ modifiedCount: 0 }),
      };
      const Coupon = {
        updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
      };

      await markExpiredPendingCheckouts(CheckoutSession, Coupon);

      expect(Coupon.updateOne).not.toHaveBeenCalled();
      expect(CheckoutSession.updateMany).toHaveBeenCalled();
    });
  });

  describe('buildPasswordResetTransportOptions', () => {
    it('should default password reset SMTP to Gmail STARTTLS over IPv4', () => {
      const originalEnv = {
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_PORT: process.env.SMTP_PORT,
        SMTP_SECURE: process.env.SMTP_SECURE,
        SMTP_FAMILY: process.env.SMTP_FAMILY,
        EMAIL_USER: process.env.EMAIL_USER,
        EMAIL_PASS: process.env.EMAIL_PASS,
      };

      delete process.env.SMTP_HOST;
      delete process.env.SMTP_PORT;
      delete process.env.SMTP_SECURE;
      delete process.env.SMTP_FAMILY;
      process.env.EMAIL_USER = 'sender@example.com';
      process.env.EMAIL_PASS = 'app-password';

      expect(buildPasswordResetTransportOptions()).toEqual(expect.objectContaining({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        family: 4,
        auth: {
          user: 'sender@example.com',
          pass: 'app-password',
        },
      }));

      Object.entries(originalEnv).forEach(([key, value]) => {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      });
    });

    it('should ignore blank SMTP env values and keep IPv4 enabled', () => {
      const originalEnv = {
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_PORT: process.env.SMTP_PORT,
        SMTP_SECURE: process.env.SMTP_SECURE,
        SMTP_FAMILY: process.env.SMTP_FAMILY,
      };

      process.env.SMTP_HOST = ' ';
      process.env.SMTP_PORT = '';
      process.env.SMTP_SECURE = '';
      process.env.SMTP_FAMILY = '';

      expect(buildPasswordResetTransportOptions()).toEqual(expect.objectContaining({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        family: 4,
        tls: {
          servername: 'smtp.gmail.com',
        },
      }));

      Object.entries(originalEnv).forEach(([key, value]) => {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      });
    });
  });

  describe('sanitizeTextForPrompt', () => {
    it('should strip control characters', () => {
      const input = 'Hello\x00World\x1F';
      const result = sanitizeTextForPrompt(input);
      expect(result).toBe('HelloWorld');
    });

    it('should trim whitespace', () => {
      const input = '  Hello World  ';
      const result = sanitizeTextForPrompt(input);
      expect(result).toBe('Hello World');
    });

    it('should truncate long text', () => {
      const input = 'a'.repeat(10001);
      const result = sanitizeTextForPrompt(input);
      expect(result.length).toBe(10000);
    });
  });

  describe('sanitizeContextField', () => {
    it('should return "Unknown" for non-string values', () => {
      expect(sanitizeContextField(null)).toBe('Unknown');
      expect(sanitizeContextField(undefined)).toBe('Unknown');
      expect(sanitizeContextField(123)).toBe('Unknown');
    });

    it('should sanitize and trim string values', () => {
      const input = '  Company\x00Name  ';
      expect(sanitizeContextField(input)).toBe('CompanyName');
    });

    it('should truncate long fields to 200 chars', () => {
      const input = 'b'.repeat(250);
      expect(sanitizeContextField(input).length).toBe(200);
    });
  });

  describe('sanitizeCvDataForStorage', () => {
    it('should keep only the supported CV shape before saving', () => {
      const sanitized = sanitizeCvDataForStorage({
        personalInfo: {
          fullName: '  Jane Doe  ',
          email: ' jane@example.com ',
          unusedNested: { huge: 'payload' },
        },
        experience: [
          { id: ' exp-1 ', company: ' Acme ', position: ' Engineer ', startDate: '', endDate: '', description: ' Built things ', junk: 'drop me' },
          { id: 'empty-row', company: ' ', position: '', description: '', junk: 'drop me too' },
        ],
        skills: [
          { id: 'skill-1', name: 'TypeScript', level: 99, category: 'Frontend', extra: 'drop me' },
          { id: 'blank-skill', name: ' ', level: 5 },
        ],
        themeColor: 'not-a-color',
        sidebarColor: '#123abc',
        templateThemeColors: {
          modern: '#abcdef',
          '<script>': '#000000',
          broken: 'red',
        },
        sectionOrder: ['experience', 'unknown', 'skills', 'experience'],
        hiddenSections: ['references', 'unknown'],
        extraRoot: { should: 'not be saved' },
      });

      expect(sanitized).toMatchObject({
        personalInfo: {
          fullName: 'Jane Doe',
          email: 'jane@example.com',
          phone: '',
        },
        experience: [
          {
            id: 'exp-1',
            company: 'Acme',
            position: 'Engineer',
            description: 'Built things',
          },
        ],
        skills: [
          {
            id: 'skill-1',
            name: 'TypeScript',
            level: 5,
            category: 'Frontend',
          },
        ],
        themeColor: '#000000',
        sidebarColor: '#123abc',
        templateThemeColors: {
          modern: '#abcdef',
        },
        sectionOrder: ['experience', 'skills'],
        hiddenSections: ['references'],
      });
      expect(sanitized).not.toHaveProperty('extraRoot');
      expect(sanitized.experience[0]).not.toHaveProperty('junk');
      expect(sanitized.personalInfo).not.toHaveProperty('unusedNested');
    });
  });
});

describe('generateCVHTML', () => {
  const mockCVData = {
    personalInfo: {
      fullName: 'John Doe',
      email: 'john@example.com',
      summary: 'Professional developer'
    },
    experience: [
      {
        company: 'Tech Corp',
        position: 'Senior Dev',
        startDate: '2020',
        endDate: 'Present',
        description: 'Building things'
      }
    ],
    themeColor: '#2563eb',
    sidebarColor: '#111827'
  };

  it('should generate HTML for "classic" template', () => {
    const html = generateCVHTML(mockCVData, 'classic');
    expect(html).toContain('John Doe');
    expect(html).toContain('john@example.com');
    expect(html).toContain('Tech Corp');
    expect(html).toContain('Senior Dev');
  });

  it('should generate HTML for "modern" template', () => {
    const html = generateCVHTML(mockCVData, 'modern');
    expect(html).toContain('John Doe');
    expect(html).toContain('Profile'); // Modern uses "Profile" header
  });

  it('should generate HTML for "professional" template', () => {
    const html = generateCVHTML(mockCVData, 'professional');
    expect(html).toContain('John Doe');
    expect(html).toContain('Professional Summary'); // Professional uses this header
  });

  it('should escape HTML characters for security', () => {
    const maliciousData = {
      ...mockCVData,
      personalInfo: {
        ...mockCVData.personalInfo,
        fullName: 'John <script>alert("xss")</script> Doe'
      }
    };
    const html = generateCVHTML(maliciousData, 'classic');
    expect(html).toContain('John &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; Doe');
    expect(html).not.toContain('<script>');
  });

  it('should reject malicious fontFamily values in PDF HTML', () => {
    const maliciousData = {
      ...mockCVData,
      fontFamily: `Inter');}body{background:url(https://evil.example/x)}/*`
    };

    const html = generateCVHTML(maliciousData, 'classic');

    expect(html).toContain('family=Inter:wght@400;500;600;700;800');
    expect(html).toContain("font-family: 'Inter', sans-serif");
    expect(html).not.toContain('evil.example');
    expect(html).not.toContain("Inter');}body");
  });
});

describe('renderCvTemplateString', () => {
  it('renders escaped placeholders and repeated sections for S3 templates', () => {
    const html = renderCvTemplateString(`
      <h1>{{personalInfo.fullName}}</h1>
      <p>{{personalInfo.email}}</p>
      <ul>{{#experience}}<li>{{position}} at {{company}}</li>{{/experience}}</ul>
      {{^awards}}<span>No awards</span>{{/awards}}
    `, {
      personalInfo: {
        fullName: 'Jane <Admin>',
        email: 'jane@example.com',
      },
      experience: [
        { position: 'Engineer', company: 'ACME' },
        { position: 'Lead', company: 'NexCV' },
      ],
      awards: [],
    });

    expect(html).toContain('Jane &lt;Admin&gt;');
    expect(html).toContain('<li>Engineer at ACME</li>');
    expect(html).toContain('<li>Lead at NexCV</li>');
    expect(html).toContain('<span>No awards</span>');
  });

  it('sanitizes triple-brace rich text placeholders', () => {
    const html = renderCvTemplateString('<section>{{{personalInfo.summary}}}</section>', {
      personalInfo: {
        summary: 'Safe <strong>text</strong><script>alert(1)</script>',
      },
    });

    expect(html).toContain('<strong>text</strong>');
    expect(html).not.toContain('<script>');
  });
});
