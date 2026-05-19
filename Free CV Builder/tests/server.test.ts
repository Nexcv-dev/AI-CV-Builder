import { describe, it, expect } from 'vitest';
import {
  EMAIL_VERIFICATION_ATTEMPT_LIMIT,
  EMAIL_VERIFICATION_ATTEMPT_WINDOW_MS,
  EMAIL_VERIFICATION_RESEND_LIMIT,
  EMAIL_VERIFICATION_RESEND_WINDOW_MS,
  PAYHERE_PLAN_PRICES,
  buildPayHereCheckoutHash,
  buildPayHereMd5Signature,
  buildPasswordResetTransportOptions,
  generateCVHTML,
  getAuthenticatedRateLimitKey,
  payHereAmountToCents,
  resolvePayHerePaymentContext,
  renderCvTemplateString,
  sanitizeContextField,
  sanitizeTextForPrompt,
  verifyPayHereMd5Signature,
} from '../server';
import { isSuperAdminEmail, roleForEmail } from '../server-models/userRole';
import { buildCvCreationQuota, getDailyCvCreationLimit, getUtcDayBounds } from '../server-models/cvQuota';
import { buildDownloadQuota, getDailyUnverifiedDownloadLimit, getUtcDayKey } from '../server-models/downloadQuotaUtils';
import { createPlanExpiry, getEffectivePlan, isPaidPlan } from '../server-models/userPlan';

describe('Server Utils', () => {
  describe('email verification rate limits', () => {
    it('should keep resend and verify OTP limits intentionally strict', () => {
      expect(EMAIL_VERIFICATION_RESEND_LIMIT).toBe(3);
      expect(EMAIL_VERIFICATION_RESEND_WINDOW_MS).toBe(60 * 60 * 1000);
      expect(EMAIL_VERIFICATION_ATTEMPT_LIMIT).toBe(5);
      expect(EMAIL_VERIFICATION_ATTEMPT_WINDOW_MS).toBe(10 * 60 * 1000);
    });

    it('should rate-limit authenticated users by user id before falling back to IP', () => {
      expect(getAuthenticatedRateLimitKey({ user: { _id: { toString: () => 'user-123' } }, ip: '203.0.113.10' } as any)).toBe('user-123');
      expect(getAuthenticatedRateLimitKey({ user: { id: { toString: () => 'user-456' } }, ip: '203.0.113.10' } as any)).toBe('user-456');

      const ipOnlyKey = getAuthenticatedRateLimitKey({ user: null, ip: '203.0.113.10' } as any);
      expect(ipOnlyKey).toContain('203.0.113.10');
    });
  });

  describe('PayHere IPN verification', () => {
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

    it('should add one extra CV save for each Pay As You Go purchase and make Monthly unlimited', () => {
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

    it('should not limit paid plan downloads while active', () => {
      const future = new Date(Date.now() + 100000);
      expect(buildDownloadQuota({ authProvider: 'email', emailVerified: true, role: 'user', plan: 'payg', planExpiresAt: future } as any, 42)).toEqual({
        limit: null,
        used: 42,
        remaining: null,
        reached: false,
        plan: 'payg',
      });
    });

    it('should build a UTC day key', () => {
      expect(getUtcDayKey(new Date('2026-05-13T18:30:00.000Z'))).toBe('2026-05-13');
    });
  });

  describe('billing plans', () => {
    it('should treat expired paid plans as free', () => {
      const past = new Date(Date.now() - 1000);
      expect(getEffectivePlan({ role: 'user', plan: 'payg', planExpiresAt: past } as any)).toBe('free');
      expect(isPaidPlan({ role: 'user', plan: 'payg', planExpiresAt: past } as any)).toBe(false);
    });

    it('should create plan expiry dates from the selected duration', () => {
      const start = new Date('2026-05-16T00:00:00.000Z');
      expect(createPlanExpiry('payg', start).toISOString()).toBe('2026-05-23T00:00:00.000Z');
      expect(createPlanExpiry('monthly', start).toISOString()).toBe('2026-06-15T00:00:00.000Z');
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
