import { describe, it, expect } from 'vitest';
import { sanitizeTextForPrompt, sanitizeContextField, generateCVHTML, buildPasswordResetTransportOptions } from '../server';
import { isSuperAdminEmail, roleForEmail } from '../server-models/userRole';
import { buildCvCreationQuota, getDailyCvCreationLimit, getUtcDayBounds } from '../server-models/cvQuota';
import { buildDownloadQuota, getDailyUnverifiedDownloadLimit, getUtcDayKey } from '../server-models/downloadQuotaUtils';

describe('Server Utils', () => {
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
    it('should default to 3 daily CV creations', () => {
      const original = process.env.DAILY_CV_CREATION_LIMIT;
      delete process.env.DAILY_CV_CREATION_LIMIT;

      expect(getDailyCvCreationLimit()).toBe(3);

      if (original === undefined) {
        delete process.env.DAILY_CV_CREATION_LIMIT;
      } else {
        process.env.DAILY_CV_CREATION_LIMIT = original;
      }
    });

    it('should mark regular users as limited after reaching daily quota', () => {
      const original = process.env.DAILY_CV_CREATION_LIMIT;
      process.env.DAILY_CV_CREATION_LIMIT = '2';

      expect(buildCvCreationQuota({ role: 'user' } as any, 1)).toEqual({
        limit: 2,
        used: 1,
        remaining: 1,
        reached: false,
      });
      expect(buildCvCreationQuota({ role: 'user' } as any, 2)).toEqual({
        limit: 2,
        used: 2,
        remaining: 0,
        reached: true,
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
      });
    });

    it('should calculate UTC day bounds', () => {
      const { start, end } = getUtcDayBounds(new Date('2026-05-13T18:30:00.000Z'));
      expect(start.toISOString()).toBe('2026-05-13T00:00:00.000Z');
      expect(end.toISOString()).toBe('2026-05-14T00:00:00.000Z');
    });
  });

  describe('download quota', () => {
    it('should default unverified users to 3 daily downloads', () => {
      const original = process.env.DAILY_UNVERIFIED_DOWNLOAD_LIMIT;
      delete process.env.DAILY_UNVERIFIED_DOWNLOAD_LIMIT;

      expect(getDailyUnverifiedDownloadLimit()).toBe(3);
      expect(buildDownloadQuota({ authProvider: 'email', emailVerified: false } as any, 2)).toEqual({
        limit: 3,
        used: 2,
        remaining: 1,
        reached: false,
      });
      expect(buildDownloadQuota({ authProvider: 'email', emailVerified: false } as any, 3)).toEqual({
        limit: 3,
        used: 3,
        remaining: 0,
        reached: true,
      });

      if (original === undefined) {
        delete process.env.DAILY_UNVERIFIED_DOWNLOAD_LIMIT;
      } else {
        process.env.DAILY_UNVERIFIED_DOWNLOAD_LIMIT = original;
      }
    });

    it('should not limit verified or Google users', () => {
      expect(buildDownloadQuota({ authProvider: 'email', emailVerified: true } as any, 99)).toEqual({
        limit: null,
        used: 99,
        remaining: null,
        reached: false,
      });
      expect(buildDownloadQuota({ authProvider: 'google', emailVerified: false } as any, 99)).toEqual({
        limit: null,
        used: 99,
        remaining: null,
        reached: false,
      });
    });

    it('should build a UTC day key', () => {
      expect(getUtcDayKey(new Date('2026-05-13T18:30:00.000Z'))).toBe('2026-05-13');
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
