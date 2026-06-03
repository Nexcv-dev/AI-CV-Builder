import { describe, it, expect, vi } from 'vitest';
import { integrityCheck, sendError, generateCVHTML } from '../server';
import { isAdminIpAllowed, requireAdminPageAllowedIp, resolveAdminClientIp } from '../server-utils/adminIpAllowlist';
import User from '../server-models/User';
import { GOOGLE_EMAIL_CONFLICT_MESSAGE, resolveGoogleOAuthUser } from '../server-models/passportSetup';
import { registerAuthRoutes } from '../routes/auth';

const restoreEnvValue = (name: string, value: string | undefined) => {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
};

describe('Advanced Server Security', () => {
  describe('email signup OTP start', () => {
    const getAuthPostHandler = (routePath: string, overrides: Record<string, any> = {}) => {
      const routes: Array<{ method: string; path: string; handlers: any[] }> = [];
      const router = {
        post: vi.fn((path: string, ...handlers: any[]) => {
          routes.push({ method: 'post', path, handlers });
          return router;
        }),
        get: vi.fn((path: string, ...handlers: any[]) => {
          routes.push({ method: 'get', path, handlers });
          return router;
        }),
        patch: vi.fn((path: string, ...handlers: any[]) => {
          routes.push({ method: 'patch', path, handlers });
          return router;
        }),
        delete: vi.fn((path: string, ...handlers: any[]) => {
          routes.push({ method: 'delete', path, handlers });
          return router;
        }),
      } as any;

      const deps = {
        User,
        authLimiter: vi.fn(),
        emailVerificationLimiter: vi.fn(),
        emailVerificationAttemptLimiter: vi.fn(),
        passwordResetLimiter: vi.fn(),
        passwordResetDailyLimiter: vi.fn(),
        requireAuth: vi.fn(),
        mongoose: { connection: { readyState: 1 } },
        isEmailServiceConfigured: vi.fn(() => true),
        normalizeEmail: vi.fn((email: unknown) => String(email || '').trim().toLowerCase()),
        sanitizeDisplayName: vi.fn((value: unknown) => String(value || '').trim()),
        sanitizeProfileField: vi.fn((value: unknown) => String(value || '').trim()),
        isValidEmail: vi.fn((email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
        sendError: vi.fn((res: any, status: number, message: string) => res.status(status).json({ error: message })),
        passport: { authenticate: vi.fn(() => vi.fn()) },
        randomBytes: vi.fn(() => ({ toString: () => 'state-token' })),
        hashToken: vi.fn((value: string) => `hash:${value}`),
        roleForEmail: vi.fn(() => 'user'),
        ...overrides,
      };

      registerAuthRoutes(router, deps);
      const route = routes.find((item) => item.method === 'post' && item.path === routePath);
      return { handler: route?.handlers.at(-1), deps };
    };

    const getEmailStartHandler = (overrides: Record<string, any> = {}) => getAuthPostHandler('/api/auth/email/start', overrides);

    it.each([true, false])('should reject signup when the email already exists, verified=%s', async (emailVerified) => {
      const existingUser = {
        email: 'taken@gmail.com',
        emailVerified,
        passwordHash: 'existing-hash',
        save: vi.fn(),
      };
      const findOne = vi.spyOn(User, 'findOne').mockResolvedValue(existingUser as any);
      const generateEmailVerificationOtp = vi.fn();
      const sendEmailVerificationWithRetry = vi.fn();
      const { handler } = getEmailStartHandler({
        generateEmailVerificationOtp,
        sendEmailVerificationWithRetry,
      });
      const req = {
        body: {
          email: 'Taken@Gmail.com',
          displayName: 'Taken User',
          acceptedTerms: true,
          intent: 'signup',
          password: 'StrongPass123!',
        },
      } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await handler(req, res);

      expect(findOne).toHaveBeenCalledWith({ email: 'taken@gmail.com' });
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: 'An account already exists for this email. Please log in instead.',
        code: 'account_exists',
      });
      expect(existingUser.save).not.toHaveBeenCalled();
      expect(generateEmailVerificationOtp).not.toHaveBeenCalled();
      expect(sendEmailVerificationWithRetry).not.toHaveBeenCalled();

      findOne.mockRestore();
    });

    it('should reject signup OTP start for super admin allowlist emails', async () => {
      const findOne = vi.spyOn(User, 'findOne').mockResolvedValue(null);
      const create = vi.spyOn(User, 'create').mockResolvedValue({} as any);
      const generateEmailVerificationOtp = vi.fn();
      const sendEmailVerificationWithRetry = vi.fn();
      const roleForEmail = vi.fn(() => 'super_admin');
      const { handler } = getEmailStartHandler({
        generateEmailVerificationOtp,
        roleForEmail,
        sendEmailVerificationWithRetry,
      });
      const req = {
        body: {
          email: 'Owner@Gmail.com',
          displayName: 'Owner',
          acceptedTerms: true,
          intent: 'signup',
          password: 'StrongPass123!',
        },
      } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await handler(req, res);

      expect(roleForEmail).toHaveBeenCalledWith('owner@gmail.com');
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Could not create your account. Please check your details and try again.',
      });
      expect(findOne).not.toHaveBeenCalled();
      expect(create).not.toHaveBeenCalled();
      expect(generateEmailVerificationOtp).not.toHaveBeenCalled();
      expect(sendEmailVerificationWithRetry).not.toHaveBeenCalled();

      findOne.mockRestore();
      create.mockRestore();
    });

    it('should reject direct signup for super admin allowlist emails', async () => {
      const findOne = vi.spyOn(User, 'findOne').mockResolvedValue(null);
      const create = vi.spyOn(User, 'create').mockResolvedValue({} as any);
      const generateEmailVerificationOtp = vi.fn();
      const roleForEmail = vi.fn(() => 'super_admin');
      const { handler } = getAuthPostHandler('/api/auth/signup', {
        generateEmailVerificationOtp,
        roleForEmail,
      });
      const req = {
        body: {
          email: 'Owner@Gmail.com',
          displayName: 'Owner',
          phone: '+94771234567',
          acceptedTerms: true,
          password: 'StrongPass123!',
        },
      } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
      const next = vi.fn();

      await handler(req, res, next);

      expect(roleForEmail).toHaveBeenCalledWith('owner@gmail.com');
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Could not create your account. Please check your details and try again.',
      });
      expect(findOne).not.toHaveBeenCalled();
      expect(create).not.toHaveBeenCalled();
      expect(generateEmailVerificationOtp).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();

      findOne.mockRestore();
      create.mockRestore();
    });

    it('should reject signup email checks for existing accounts before profile entry', async () => {
      const findOne = vi.spyOn(User, 'findOne').mockResolvedValue({
        email: 'taken@gmail.com',
        passwordHash: 'existing-hash',
      } as any);
      const { handler } = getAuthPostHandler('/api/auth/email/check');
      const req = {
        body: {
          email: 'Taken@Gmail.com',
          intent: 'signup',
        },
      } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await handler(req, res);

      expect(findOne).toHaveBeenCalledWith({ email: 'taken@gmail.com' });
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: 'An account already exists for this email. Please log in instead.',
        code: 'account_exists',
      });

      findOne.mockRestore();
    });

    it('should reject signup email checks for super admin allowlist emails before profile entry', async () => {
      const findOne = vi.spyOn(User, 'findOne').mockResolvedValue(null);
      const roleForEmail = vi.fn(() => 'super_admin');
      const { handler } = getAuthPostHandler('/api/auth/email/check', { roleForEmail });
      const req = {
        body: {
          email: 'Owner@Gmail.com',
          intent: 'signup',
        },
      } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await handler(req, res);

      expect(roleForEmail).toHaveBeenCalledWith('owner@gmail.com');
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Could not create your account. Please check your details and try again.',
      });
      expect(findOne).not.toHaveBeenCalled();

      findOne.mockRestore();
    });
  });

  describe('integrityCheck middleware', () => {
    it('should allow non-POST requests', () => {
      const req = { method: 'GET', path: '/api/test', header: vi.fn() } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
      const next = vi.fn();

      integrityCheck(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should block POST requests without integrity header', () => {
      const req = { 
        method: 'POST', 
        path: '/api/generate-pdf', 
        header: vi.fn().mockReturnValue(undefined) 
      } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
      const next = vi.fn();

      integrityCheck(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Unauthorized request source' }));
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow provider payment webhooks without app integrity header', () => {
      for (const path of ['/api/payhere/ipn', '/api/lemonsqueezy/webhook']) {
        const req = {
          method: 'POST',
          path,
          header: vi.fn().mockReturnValue(undefined),
        } as any;
        const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
        const next = vi.fn();

        integrityCheck(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      }
    });

    it('should allow POST requests with correct integrity and CSRF headers', () => {
      const csrfToken = 'test-csrf-token';
      const req = { 
        method: 'POST', 
        path: '/api/generate-pdf', 
        protocol: 'http',
        session: { csrfToken },
        header: vi.fn((name: string) => {
          if (name === 'X-App-Source') return 'cv-builder-app';
          if (name === 'X-CSRF-Token') return csrfToken;
          if (name === 'Origin') return 'http://localhost:3000';
          if (name === 'host') return 'localhost:3000';
          return undefined;
        }),
        get: vi.fn((name: string) => name === 'host' ? 'localhost:3000' : undefined),
      } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
      const next = vi.fn();

      integrityCheck(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should block state-changing requests without a valid CSRF token', () => {
      const req = {
        method: 'POST',
        path: '/api/generate-pdf',
        protocol: 'http',
        session: { csrfToken: 'expected-csrf-token' },
        header: vi.fn((name: string) => {
          if (name === 'X-App-Source') return 'cv-builder-app';
          if (name === 'Origin') return 'http://localhost:3000';
          if (name === 'host') return 'localhost:3000';
          return undefined;
        }),
        get: vi.fn((name: string) => name === 'host' ? 'localhost:3000' : undefined),
      } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
      const next = vi.fn();

      integrityCheck(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'CSRF_TOKEN_INVALID' }));
      expect(next).not.toHaveBeenCalled();
    });

    it('should block PATCH requests without integrity header', () => {
      const req = {
        method: 'PATCH',
        path: '/api/auth/profile',
        header: vi.fn().mockReturnValue(undefined),
      } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
      const next = vi.fn();

      integrityCheck(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Unauthorized request source' }));
      expect(next).not.toHaveBeenCalled();
    });

    it('should block state-changing requests from untrusted origins', () => {
      const req = {
        method: 'DELETE',
        path: '/api/documents/123',
        protocol: 'http',
        header: vi.fn((name: string) => {
          if (name === 'X-App-Source') return 'cv-builder-app';
          if (name === 'Origin') return 'https://evil.example';
          if (name === 'host') return 'localhost:3000';
          return undefined;
        }),
        get: vi.fn((name: string) => name === 'host' ? 'localhost:3000' : undefined),
      } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
      const next = vi.fn();

      integrityCheck(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Untrusted request origin' }));
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('sendError helper', () => {
    it('should hide internal details in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
      sendError(res, 500, 'Public Message', new Error('Private Secret'));
      
      expect(res.status).toHaveBeenCalledWith(500);
      const jsonResponse = res.json.mock.calls[0][0];
      expect(jsonResponse.error).toBe('Public Message');
      expect(jsonResponse.errorId).toBeUndefined();
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should include errorId in non-production environments', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
      sendError(res, 400, 'Bad Request');
      
      const jsonResponse = res.json.mock.calls[0][0];
      expect(jsonResponse.errorId).toBeDefined();
      expect(typeof jsonResponse.errorId).toBe('string');
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('admin IP allowlist', () => {
    it('should let admin page requests reach the React 404/admin-disabled flow', () => {
      const req = {} as any;
      const res = { status: vi.fn().mockReturnThis(), send: vi.fn() } as any;
      const next = vi.fn();

      requireAdminPageAllowedIp(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.send).not.toHaveBeenCalled();
    });

    it('should not trust spoofable client IP headers from direct clients', () => {
      const originalAllowedIps = process.env.ADMIN_ALLOWED_IPS;
      const originalTrustedProxyIps = process.env.ADMIN_TRUSTED_PROXY_IPS;
      process.env.ADMIN_ALLOWED_IPS = '203.0.113.10';
      delete process.env.ADMIN_TRUSTED_PROXY_IPS;

      const req = {
        socket: { remoteAddress: '198.51.100.50' },
        ips: [],
        header: vi.fn((name: string) => {
          if (name === 'x-real-ip') return '203.0.113.10';
          if (name === 'cf-connecting-ip') return '203.0.113.10';
          if (name === 'true-client-ip') return '203.0.113.10';
          if (name === 'x-forwarded-for') return '203.0.113.10';
          return undefined;
        }),
      } as any;

      expect(resolveAdminClientIp(req)).toBe('198.51.100.50');
      expect(isAdminIpAllowed(req)).toBe(false);

      restoreEnvValue('ADMIN_ALLOWED_IPS', originalAllowedIps);
      restoreEnvValue('ADMIN_TRUSTED_PROXY_IPS', originalTrustedProxyIps);
    });

    it('should use forwarded client IP only from explicitly trusted proxies', () => {
      const originalAllowedIps = process.env.ADMIN_ALLOWED_IPS;
      const originalTrustedProxyIps = process.env.ADMIN_TRUSTED_PROXY_IPS;
      process.env.ADMIN_ALLOWED_IPS = '203.0.113.10';
      process.env.ADMIN_TRUSTED_PROXY_IPS = '10.0.0.5';

      const req = {
        socket: { remoteAddress: '10.0.0.5' },
        ips: ['203.0.113.10', '10.0.0.5'],
        header: vi.fn((name: string) => {
          if (name === 'x-forwarded-for') return '203.0.113.10, 10.0.0.5';
          return undefined;
        }),
      } as any;

      expect(resolveAdminClientIp(req)).toBe('203.0.113.10');
      expect(isAdminIpAllowed(req)).toBe(true);

      restoreEnvValue('ADMIN_ALLOWED_IPS', originalAllowedIps);
      restoreEnvValue('ADMIN_TRUSTED_PROXY_IPS', originalTrustedProxyIps);
    });
  });

  describe('Google OAuth account linking', () => {
    it('should reject email collisions without linking the Google account', async () => {
      const existingUser = {
        email: 'victim@example.com',
        googleId: undefined,
        authProvider: 'email',
        emailVerified: true,
        profileImage: 'https://example.com/original.png',
        save: vi.fn(),
        isModified: vi.fn(() => false),
      };
      const findOne = vi.spyOn(User, 'findOne')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existingUser as any);
      const create = vi.spyOn(User, 'create').mockResolvedValue({} as any);

      const result = await resolveGoogleOAuthUser({
        id: 'attacker-google-id',
        displayName: 'Attacker',
        emails: [{ value: 'Victim@Example.com' }],
        photos: [{ value: 'https://example.com/attacker.png' }],
      });

      expect(result.user).toBeNull();
      expect(result.info).toEqual({ message: GOOGLE_EMAIL_CONFLICT_MESSAGE });
      expect(existingUser.googleId).toBeUndefined();
      expect(existingUser.authProvider).toBe('email');
      expect(existingUser.profileImage).toBe('https://example.com/original.png');
      expect(existingUser.save).not.toHaveBeenCalled();
      expect(create).not.toHaveBeenCalled();
      expect(findOne).toHaveBeenNthCalledWith(1, { googleId: 'attacker-google-id' });
      expect(findOne).toHaveBeenNthCalledWith(2, { email: 'victim@example.com' });

      findOne.mockRestore();
      create.mockRestore();
    });
  });

  describe('PDF Sanitization (Regression/Security)', () => {
    it('should sanitize rich text descriptions in generated HTML', () => {
      const dataWithXSS = {
        personalInfo: { fullName: 'John', email: 'j@j.com', summary: 'Dev' },
        experience: [
          {
            position: 'Dev',
            company: 'ACME',
            description: 'Safe <b>Bold</b> <script>alert("xss")</script> <iframe src="evil.com"></iframe>'
          }
        ],
        themeColor: '#000',
        sidebarColor: '#000'
      };

      const html = generateCVHTML(dataWithXSS as any, 'classic');
      
      // Should preserve safe tags
      expect(html).toContain('<b>Bold</b>');
      expect(html).toContain('Safe');
      
      // Should strip dangerous tags
      expect(html).not.toContain('<script>');
      expect(html).not.toContain('alert("xss")');
      expect(html).not.toContain('<iframe');
      expect(html).not.toContain('evil.com');
    });
  });
});
