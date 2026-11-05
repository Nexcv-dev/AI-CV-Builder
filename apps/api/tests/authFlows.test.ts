import { randomBytes } from 'crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mergeEmailTemplates, renderEmailTemplate } from '@nexcv/shared/emailTemplateDefaults';
import { registerAuthRoutes, type AuthRouteDeps } from '../routes/auth';
import { currentUserId } from '../middlewares/auth';
import { roleForEmail, syncUserRoleFromAllowlist } from '../server-models/userRole';
import { API_ERROR_CODES } from '../server-utils/apiErrors';
import { isMongoDuplicateKeyError, isMongoValidationError } from '../server-utils/requestValidation';
import {
    emailGreetingName,
    generateEmailVerificationOtp,
    hashPassword,
    hashToken,
    isEmailVerified,
    isValidEmail,
    normalizeEmail,
    passwordPolicyMessage,
    publicUser,
    sanitizeDisplayName,
    sanitizeProfileField,
    validatePasswordStrength,
    verifyPassword,
} from '../server-utils/userAuth';
import { invalidateUserSessions, markSessionCurrent } from '../services/sessionService';
import { createFakeModel, createResponse, createRouteCapture, type FakeDoc } from './helpers/fakeModels';
import { stubRouteDeps } from './helpers/routeDeps';

/**
 * Auth route flows, run on in-memory fake models with the real hashing,
 * validation, session-version, and role helpers. Only email delivery,
 * passport, and outbound OAuth HTTP calls are stubbed.
 *
 * Like the payment flow tests, these check stored state and responses, not
 * call shapes, so they keep passing while the logic moves into services.
 */

// Request, session, and passport objects are loosely typed in these tests.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;

const NOW = new Date('2026-11-05T10:00:00.000Z');
const MINUTE_MS = 60 * 1000;
const USER_ID = '64b0000000000000000000b1';
const PASSWORD = 'StrongPass123!';
const NEW_PASSWORD = 'NewerPass456?';
const PASSWORD_HASH = hashPassword(PASSWORD);
const SUPER_ADMIN_EMAIL = 'owner@gmail.com';

const existingUser = (overrides: FakeDoc = {}): FakeDoc => ({
    _id: USER_ID,
    email: 'member@gmail.com',
    displayName: 'Member',
    passwordHash: PASSWORD_HASH,
    role: 'user',
    emailVerified: true,
    authProvider: 'email',
    sessionVersion: 0,
    plan: 'free',
    ...overrides,
});

const createRequest = (overrides: Loose = {}) => {
    const { session: sessionData = {}, ...rest } = overrides;
    const session: Loose = { ...sessionData };
    const req: Loose = {
        body: {},
        query: {},
        protocol: 'https',
        get: (name: string) => (name === 'host' ? 'api.test' : undefined),
        user: undefined,
        session,
        ...rest,
    };
    session.regenerate = vi.fn((callback: (error?: unknown) => void) => {
        Object.keys(session).forEach((key) => {
            if (typeof session[key] !== 'function') delete session[key];
        });
        req.sessionRegenerated = true;
        callback();
    });
    session.destroy = vi.fn((callback: (error?: unknown) => void) => {
        req.sessionDestroyed = true;
        callback();
    });
    req.login = vi.fn((user: FakeDoc, callback: (error?: unknown) => void) => {
        req.user = user;
        callback();
    });
    req.logout = vi.fn((callback: (error?: unknown) => void) => {
        req.user = undefined;
        callback();
    });
    req.isAuthenticated = () => Boolean(req.user);
    return req;
};

const jsonResponse = (data: unknown, ok = true, status = 200) => ({
    ok,
    status,
    json: vi.fn(async () => data),
});

const createHarness = (seed: { users?: FakeDoc[]; cvs?: FakeDoc[] } = {}, overrides: Record<string, unknown> = {}) => {
    const models = {
        User: createFakeModel(seed.users),
        CVDocument: createFakeModel(seed.cvs),
    };
    const googleOutcome: { err?: unknown; user?: FakeDoc | null; info?: Loose } = {};
    const passport = {
        authenticate: vi.fn((strategy: string, optionsOrCallback: Loose) => vi.fn((req: Loose) => {
            if (typeof optionsOrCallback === 'function') {
                return optionsOrCallback(googleOutcome.err ?? null, googleOutcome.user ?? null, googleOutcome.info);
            }
            req.passportStart = { strategy, options: optionsOrCallback };
            return undefined;
        })),
    };
    const deps = {
        ...models,
        mongoose: { connection: { readyState: 1 } },
        authLimiter: vi.fn(),
        emailVerificationLimiter: vi.fn(),
        emailVerificationAttemptLimiter: vi.fn(),
        passwordResetLimiter: vi.fn(),
        passwordResetDailyLimiter: vi.fn(),
        requireAuth: vi.fn(),
        currentUserId,
        normalizeEmail,
        sanitizeDisplayName,
        sanitizeProfileField,
        isValidEmail,
        validatePasswordStrength,
        passwordPolicyMessage,
        hashPassword,
        verifyPassword,
        hashToken,
        generateEmailVerificationOtp,
        isEmailVerified,
        publicUser,
        emailGreetingName,
        isMongoDuplicateKeyError,
        isMongoValidationError,
        markSessionCurrent,
        invalidateUserSessions,
        roleForEmail,
        syncUserRoleFromAllowlist,
        mergeEmailTemplates,
        renderEmailTemplate,
        randomBytes,
        passport,
        buildBrandedEmailHtml: vi.fn(async ({ subject }: { subject: string }) => `<html>${subject}</html>`),
        sendSystemEmail: vi.fn(async () => undefined),
        sendEmailVerificationWithRetry: vi.fn(async () => true),
        sendNewAccountNotification: vi.fn(async () => undefined),
        isEmailServiceConfigured: vi.fn(() => true),
        sendError: vi.fn((res: Loose, status: number, message: string, _error: unknown, code?: string) => (
            res.status(status).json({ error: message, code })
        )),
        ...overrides,
    };
    const { router, handler, handlers } = createRouteCapture();
    registerAuthRoutes(router, stubRouteDeps<AuthRouteDeps>(deps));

    const call = async (method: string, path: string, req: Loose) => {
        const res = createResponse();
        const next = vi.fn();
        await handler(method, path)(req, res, next);
        return { res, next };
    };
    const runAll = async (method: string, path: string, req: Loose) => {
        const res = createResponse();
        const next = vi.fn();
        for (const routeHandler of handlers(method, path)) {
            await routeHandler(req, res, next);
        }
        return { res, next };
    };

    return { models, deps, call, runAll, googleOutcome };
};

const lastJson = (res: Loose) => res.json.mock.calls.at(-1)?.[0];

const signupBody = (overrides: Record<string, unknown> = {}) => ({
    email: 'New.Person@Gmail.com',
    displayName: '  New Person  ',
    phone: '+94 77 123 4567',
    password: PASSWORD,
    acceptedTerms: true,
    ...overrides,
});

const originalEnv = {
    FRONTEND_URL: process.env.FRONTEND_URL,
    SUPER_ADMIN_EMAILS: process.env.SUPER_ADMIN_EMAILS,
    SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    GITHUB_CALLBACK_URL: process.env.GITHUB_CALLBACK_URL,
    GITHUB_REDIRECT_URI: process.env.GITHUB_REDIRECT_URI,
    LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID,
    LINKEDIN_CLIENT_SECRET: process.env.LINKEDIN_CLIENT_SECRET,
    LINKEDIN_REDIRECT_URI: process.env.LINKEDIN_REDIRECT_URI,
};

beforeEach(() => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    process.env.FRONTEND_URL = 'https://app.test';
    process.env.SUPER_ADMIN_EMAILS = SUPER_ADMIN_EMAIL;
    delete process.env.SESSION_COOKIE_NAME;
    process.env.GITHUB_CLIENT_ID = 'gh-client';
    process.env.GITHUB_CLIENT_SECRET = 'gh-secret';
    delete process.env.GITHUB_CALLBACK_URL;
    delete process.env.GITHUB_REDIRECT_URI;
    process.env.LINKEDIN_CLIENT_ID = 'li-client';
    process.env.LINKEDIN_CLIENT_SECRET = 'li-secret';
    delete process.env.LINKEDIN_REDIRECT_URI;
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    Object.entries(originalEnv).forEach(([name, value]) => {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
    });
});

describe('email and password signup', () => {
    it('creates the account with phone, terms timestamp, hashed password, and a pending OTP', async () => {
        const harness = createHarness();
        const req = createRequest({ body: signupBody(), session: { authRedirect: '/dashboard', csrfToken: 'old' } });

        const { res } = await harness.call('post', '/api/auth/signup', req);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(harness.models.User.docs).toHaveLength(1);
        const [user] = harness.models.User.docs;
        expect(user).toMatchObject({
            email: 'new.person@gmail.com',
            displayName: 'New Person',
            phone: '+94 77 123 4567',
            role: 'user',
            emailVerified: false,
            authProvider: 'email',
            termsAcceptedAt: NOW,
            emailVerificationExpires: new Date(NOW.getTime() + 10 * MINUTE_MS),
        });
        expect(user.passwordHash).not.toContain(PASSWORD);
        expect(verifyPassword(PASSWORD, user.passwordHash)).toBe(true);

        const [, sentCode] = harness.deps.sendEmailVerificationWithRetry.mock.calls[0] as unknown as [FakeDoc, string];
        expect(sentCode).toMatch(/^\d{6}$/);
        expect(user.emailVerificationToken).toBe(hashToken(sentCode));
        expect(harness.deps.sendNewAccountNotification).toHaveBeenCalledWith(user);

        expect(req.sessionRegenerated).toBe(true);
        expect(req.user).toBe(user);
        expect(req.session.csrfToken).toBeUndefined();
        expect(req.session.authRedirect).toBe('/dashboard');
        expect(req.session.authSessionVersion).toBe(0);
        expect(lastJson(res)).toEqual({
            user: expect.objectContaining({ email: 'new.person@gmail.com', emailVerified: false, hasPassword: true }),
            message: 'Account created. Enter the OTP sent to your email to verify your account.',
        });
    });

    it('still creates the account when the OTP email fails, with a resend hint', async () => {
        const harness = createHarness({}, { sendEmailVerificationWithRetry: vi.fn(async () => false) });

        const { res } = await harness.call('post', '/api/auth/signup', createRequest({ body: signupBody() }));

        expect(res.status).toHaveBeenCalledWith(201);
        expect(harness.models.User.docs).toHaveLength(1);
        expect(lastJson(res).message).toBe('Account created, but verification OTP could not be sent. Try resend verification.');
    });

    it.each([
        ['name', { displayName: '   ' }, 'Enter your name.', API_ERROR_CODES.VALIDATION_FAILED],
        ['contact number', { phone: '' }, 'Enter your contact number.', API_ERROR_CODES.VALIDATION_FAILED],
        ['terms agreement', { acceptedTerms: false }, 'Please accept the Terms and Privacy Policy to create your account.', API_ERROR_CODES.VALIDATION_FAILED],
        ['strong password', { password: 'weakpass' }, passwordPolicyMessage, API_ERROR_CODES.PASSWORD_INVALID],
        ['supported email', { email: 'someone@mailinator.com' }, 'Enter a valid email address.', API_ERROR_CODES.VALIDATION_FAILED],
    ])('requires a %s', async (_label, override, error, code) => {
        const harness = createHarness();

        const { res } = await harness.call('post', '/api/auth/signup', createRequest({ body: signupBody(override) }));

        expect(res.status).toHaveBeenCalledWith(400);
        expect(lastJson(res)).toEqual({ error, code });
        expect(harness.models.User.docs).toHaveLength(0);
        expect(harness.deps.sendEmailVerificationWithRetry).not.toHaveBeenCalled();
    });

    it('accepts the string "true" for the terms agreement', async () => {
        const harness = createHarness();

        const { res } = await harness.call('post', '/api/auth/signup', createRequest({ body: signupBody({ acceptedTerms: 'true' }) }));

        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('rejects an email that already has an account', async () => {
        const harness = createHarness({ users: [existingUser({ email: 'new.person@gmail.com' })] });

        const { res } = await harness.call('post', '/api/auth/signup', createRequest({ body: signupBody() }));

        expect(res.status).toHaveBeenCalledWith(409);
        expect(lastJson(res)).toEqual({
            error: 'An account already exists for this email. Please log in instead.',
            code: API_ERROR_CODES.ACCOUNT_EXISTS,
        });
        expect(harness.models.User.docs).toHaveLength(1);
    });

    it('answers 503 while the database is disconnected', async () => {
        const harness = createHarness({}, { mongoose: { connection: { readyState: 0 } } });

        const { res } = await harness.call('post', '/api/auth/signup', createRequest({ body: signupBody() }));

        expect(res.status).toHaveBeenCalledWith(503);
        expect(lastJson(res).code).toBe(API_ERROR_CODES.AUTH_SERVICE_UNAVAILABLE);
    });

    it('maps a duplicate key race to the generic signup error', async () => {
        const harness = createHarness();
        harness.models.User.create.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 11000 }));

        const { res } = await harness.call('post', '/api/auth/signup', createRequest({ body: signupBody() }));

        expect(res.status).toHaveBeenCalledWith(400);
        expect(lastJson(res)).toEqual({
            error: 'Could not create your account. Please check your details and try again.',
            code: API_ERROR_CODES.VALIDATION_FAILED,
        });
    });
});

describe('password login', () => {
    it('signs in with a regenerated session and the current session version', async () => {
        const harness = createHarness({ users: [existingUser({ sessionVersion: 3 })] });
        const req = createRequest({ body: { email: ' Member@Gmail.com ', password: PASSWORD }, session: { stale: 'yes' } });

        const { res } = await harness.call('post', '/api/auth/login', req);

        expect(res.status).not.toHaveBeenCalled();
        expect(lastJson(res)).toEqual({ user: expect.objectContaining({ id: USER_ID, email: 'member@gmail.com' }) });
        expect(req.user).toBe(harness.models.User.docs[0]);
        expect(req.session.stale).toBeUndefined();
        expect(req.session.authSessionVersion).toBe(3);
    });

    it('promotes an allowlisted super admin on login', async () => {
        const harness = createHarness({ users: [existingUser({ email: SUPER_ADMIN_EMAIL })] });

        const { res } = await harness.call('post', '/api/auth/login', createRequest({ body: { email: SUPER_ADMIN_EMAIL, password: PASSWORD } }));

        expect(harness.models.User.docs[0].role).toBe('super_admin');
        expect(lastJson(res).user.role).toBe('super_admin');
    });

    it.each([
        ['a wrong password', { email: 'member@gmail.com', password: 'WrongPass123!' }],
        ['an unknown email', { email: 'nobody@gmail.com', password: PASSWORD }],
    ])('rejects %s with the same message', async (_label, body) => {
        const harness = createHarness({ users: [existingUser()] });
        const req = createRequest({ body });

        const { res } = await harness.call('post', '/api/auth/login', req);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(lastJson(res)).toEqual({ error: 'Email or password is incorrect.', code: API_ERROR_CODES.INVALID_CREDENTIALS });
        expect(req.user).toBeUndefined();
    });

    it('rejects a password login for an OTP-only account', async () => {
        const harness = createHarness({ users: [existingUser({ passwordHash: undefined })] });

        const { res } = await harness.call('post', '/api/auth/login', createRequest({ body: { email: 'member@gmail.com', password: PASSWORD } }));

        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('asks for both fields when the password is missing', async () => {
        const harness = createHarness();

        const { res } = await harness.call('post', '/api/auth/login', createRequest({ body: { email: 'member@gmail.com' } }));

        expect(res.status).toHaveBeenCalledWith(400);
        expect(lastJson(res)).toEqual({ error: 'Enter your email and password.', code: API_ERROR_CODES.VALIDATION_FAILED });
    });
});

describe('email check', () => {
    it.each([
        ['a password account', existingUser(), { exists: true, method: 'password' }],
        ['an OTP-only account', existingUser({ passwordHash: undefined }), { exists: true, method: 'otp' }],
    ])('reports %s', async (_label, user, expected) => {
        const harness = createHarness({ users: [user] });

        const { res } = await harness.call('post', '/api/auth/email/check', createRequest({ body: { email: 'member@gmail.com' } }));

        expect(lastJson(res)).toEqual(expected);
    });

    it('reports an unknown email', async () => {
        const harness = createHarness();

        const { res } = await harness.call('post', '/api/auth/email/check', createRequest({ body: { email: 'nobody@gmail.com', intent: 'signup' } }));

        expect(lastJson(res)).toEqual({ exists: false, method: 'otp' });
    });
});

describe('email OTP start', () => {
    const startBody = (overrides: Record<string, unknown> = {}) => ({
        email: 'otp.person@gmail.com',
        displayName: 'Otp Person',
        password: PASSWORD,
        acceptedTerms: true,
        intent: 'signup',
        ...overrides,
    });

    it('asks for a name before creating a new account', async () => {
        const harness = createHarness();

        const { res } = await harness.call('post', '/api/auth/email/start', createRequest({ body: startBody({ displayName: '' }) }));

        expect(lastJson(res)).toEqual({ needsName: true });
        expect(harness.models.User.docs).toHaveLength(0);
    });

    it('requires the terms agreement for a new account', async () => {
        const harness = createHarness();

        const { res } = await harness.call('post', '/api/auth/email/start', createRequest({ body: startBody({ acceptedTerms: false }) }));

        expect(res.status).toHaveBeenCalledWith(400);
        expect(lastJson(res).error).toBe('Please accept the Terms and Privacy Policy to create your account.');
        expect(harness.models.User.docs).toHaveLength(0);
    });

    it('requires a strong password for a new account', async () => {
        const harness = createHarness();

        const { res } = await harness.call('post', '/api/auth/email/start', createRequest({ body: startBody({ password: 'short' }) }));

        expect(res.status).toHaveBeenCalledWith(400);
        expect(lastJson(res)).toEqual({ error: passwordPolicyMessage, code: API_ERROR_CODES.PASSWORD_INVALID });
    });

    it('creates an unverified account and sends the OTP', async () => {
        const harness = createHarness();

        const { res } = await harness.call('post', '/api/auth/email/start', createRequest({ body: startBody() }));

        expect(lastJson(res)).toEqual({ needsName: false, message: 'OTP sent. Please check your email.' });
        const [user] = harness.models.User.docs;
        expect(user).toMatchObject({
            email: 'otp.person@gmail.com',
            displayName: 'Otp Person',
            emailVerified: false,
            authProvider: 'email',
            termsAcceptedAt: NOW,
        });
        expect(verifyPassword(PASSWORD, user.passwordHash)).toBe(true);
        const [, code] = harness.deps.sendEmailVerificationWithRetry.mock.calls[0] as unknown as [FakeDoc, string];
        expect(user.emailVerificationToken).toBe(hashToken(code));
        expect(harness.deps.sendNewAccountNotification).toHaveBeenCalledWith(user);
    });

    it('creates the account from the login intent too, when the email is new', async () => {
        const harness = createHarness();

        const { res } = await harness.call('post', '/api/auth/email/start', createRequest({ body: startBody({ intent: 'login' }) }));

        expect(lastJson(res).needsName).toBe(false);
        expect(harness.models.User.docs).toHaveLength(1);
    });

    it('deletes the new account again when the OTP cannot be sent', async () => {
        const harness = createHarness({}, { sendEmailVerificationWithRetry: vi.fn(async () => false) });

        const { res } = await harness.call('post', '/api/auth/email/start', createRequest({ body: startBody() }));

        expect(res.status).toHaveBeenCalledWith(502);
        expect(lastJson(res).code).toBe(API_ERROR_CODES.OTP_DELIVERY_FAILED);
        expect(harness.models.User.docs).toHaveLength(0);
    });

    it('refreshes the OTP of an existing account on login and keeps its password', async () => {
        const harness = createHarness({
            users: [existingUser({ email: 'otp.person@gmail.com', displayName: '', authProvider: undefined, emailVerificationToken: 'old' })],
        });

        const { res } = await harness.call('post', '/api/auth/email/start', createRequest({ body: startBody({ intent: 'login', password: NEW_PASSWORD }) }));

        expect(lastJson(res).needsName).toBe(false);
        const [user] = harness.models.User.docs;
        const [, code] = harness.deps.sendEmailVerificationWithRetry.mock.calls[0] as unknown as [FakeDoc, string];
        expect(user.emailVerificationToken).toBe(hashToken(code));
        expect(user.emailVerificationExpires).toEqual(new Date(NOW.getTime() + 10 * MINUTE_MS));
        expect(user.displayName).toBe('Otp Person');
        expect(user.authProvider).toBe('email');
        expect(user.passwordHash).toBe(PASSWORD_HASH);
        expect(harness.deps.sendNewAccountNotification).not.toHaveBeenCalled();
    });

    it('keeps an existing account when its login OTP cannot be sent', async () => {
        const harness = createHarness(
            { users: [existingUser({ email: 'otp.person@gmail.com' })] },
            { sendEmailVerificationWithRetry: vi.fn(async () => false) },
        );

        const { res } = await harness.call('post', '/api/auth/email/start', createRequest({ body: startBody({ intent: 'login' }) }));

        expect(res.status).toHaveBeenCalledWith(502);
        expect(harness.models.User.docs).toHaveLength(1);
    });

    it('answers 503 when email is not configured', async () => {
        const harness = createHarness({}, { isEmailServiceConfigured: vi.fn(() => false) });

        const { res } = await harness.call('post', '/api/auth/email/start', createRequest({ body: startBody() }));

        expect(res.status).toHaveBeenCalledWith(503);
        expect(lastJson(res).code).toBe(API_ERROR_CODES.OTP_DELIVERY_FAILED);
    });
});

describe('email OTP verify (sign in)', () => {
    const pendingUser = (overrides: FakeDoc = {}) => existingUser({
        email: 'otp.person@gmail.com',
        emailVerified: false,
        authProvider: undefined,
        emailVerificationToken: hashToken('123456'),
        emailVerificationExpires: new Date(NOW.getTime() + 5 * MINUTE_MS),
        ...overrides,
    });

    it('verifies the email, clears the OTP, and signs in', async () => {
        const harness = createHarness({ users: [pendingUser()] });
        const req = createRequest({ body: { email: 'otp.person@gmail.com', code: '123 456' } });

        const { res } = await harness.call('post', '/api/auth/email/verify', req);

        const [user] = harness.models.User.docs;
        expect(user.emailVerified).toBe(true);
        expect(user.emailVerificationToken).toBeUndefined();
        expect(user.emailVerificationExpires).toBeUndefined();
        expect(user.authProvider).toBe('email');
        expect(req.user).toBe(user);
        expect(req.sessionRegenerated).toBe(true);
        expect(lastJson(res)).toEqual({ user: expect.objectContaining({ emailVerified: true }), message: 'Logged in successfully.' });
    });

    it.each([
        ['an expired code', pendingUser({ emailVerificationExpires: new Date(NOW.getTime() - 1) }), '123456'],
        ['a wrong code', pendingUser(), '654321'],
    ])('rejects %s', async (_label, user, code) => {
        const harness = createHarness({ users: [user] });
        const req = createRequest({ body: { email: 'otp.person@gmail.com', code } });

        const { res } = await harness.call('post', '/api/auth/email/verify', req);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(lastJson(res)).toEqual({ error: 'OTP is invalid or has expired.', code: API_ERROR_CODES.OTP_INVALID });
        expect(harness.models.User.docs[0].emailVerified).toBe(false);
        expect(req.user).toBeUndefined();
    });

    it('requires six digits', async () => {
        const harness = createHarness({ users: [pendingUser()] });

        const { res } = await harness.call('post', '/api/auth/email/verify', createRequest({ body: { email: 'otp.person@gmail.com', code: '12345' } }));

        expect(res.status).toHaveBeenCalledWith(400);
        expect(lastJson(res).error).toBe('Enter the 6-digit verification code.');
    });
});

describe('signed-in email verification', () => {
    const unverified = (overrides: FakeDoc = {}) => existingUser({
        emailVerified: false,
        emailVerificationToken: hashToken('111222'),
        emailVerificationExpires: new Date(NOW.getTime() + 5 * MINUTE_MS),
        ...overrides,
    });

    it('verifies the current user with a valid code', async () => {
        const harness = createHarness({ users: [unverified()] });
        const req = createRequest({ user: harness.models.User.docs[0], body: { code: '111222' } });

        const { res } = await harness.call('post', '/api/auth/verify-email', req);

        expect(harness.models.User.docs[0]).toMatchObject({ emailVerified: true, emailVerificationToken: undefined });
        expect(lastJson(res).message).toBe('Email verified successfully.');
        expect(req.sessionRegenerated).toBeUndefined();
    });

    it('does not accept another user\'s code', async () => {
        const other = unverified({ _id: '64b0000000000000000000b2', email: 'other@gmail.com' });
        const harness = createHarness({ users: [unverified({ emailVerificationToken: hashToken('999999') }), other] });
        const req = createRequest({ user: harness.models.User.docs[0], body: { code: '111222' } });

        const { res } = await harness.call('post', '/api/auth/verify-email', req);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(lastJson(res)).toEqual({ error: 'Verification code is invalid or has expired.', code: API_ERROR_CODES.OTP_INVALID });
        expect(harness.models.User.docs[1].emailVerified).toBe(false);
    });

    it('resends a fresh code', async () => {
        const harness = createHarness({ users: [unverified()] });
        const req = createRequest({ user: harness.models.User.docs[0] });

        const { res } = await harness.call('post', '/api/auth/resend-verification', req);

        const [, code] = harness.deps.sendEmailVerificationWithRetry.mock.calls[0] as unknown as [FakeDoc, string];
        expect(harness.models.User.docs[0].emailVerificationToken).toBe(hashToken(code));
        expect(lastJson(res).message).toBe('Verification OTP sent. Please check your inbox.');
    });

    it('skips the resend when already verified', async () => {
        const harness = createHarness({ users: [existingUser()] });

        const { res } = await harness.call('post', '/api/auth/resend-verification', createRequest({ user: harness.models.User.docs[0] }));

        expect(lastJson(res).message).toBe('Email is already verified.');
        expect(harness.deps.sendEmailVerificationWithRetry).not.toHaveBeenCalled();
    });

    it('reports a failed resend', async () => {
        const harness = createHarness({ users: [unverified()] }, { sendEmailVerificationWithRetry: vi.fn(async () => false) });

        const { res } = await harness.call('post', '/api/auth/resend-verification', createRequest({ user: harness.models.User.docs[0] }));

        expect(res.status).toHaveBeenCalledWith(502);
        expect(lastJson(res).code).toBe(API_ERROR_CODES.OTP_DELIVERY_FAILED);
    });
});

describe('profile, password change, and account deletion', () => {
    it('updates the profile fields', async () => {
        const harness = createHarness({ users: [existingUser()] });
        const req = createRequest({
            user: harness.models.User.docs[0],
            body: { displayName: 'Renamed', phone: '0771234567', address: 'Colombo', profileImage: 'https://img.test/a.png' },
        });

        const { res } = await harness.call('patch', '/api/auth/profile', req);

        expect(harness.models.User.docs[0]).toMatchObject({
            displayName: 'Renamed',
            phone: '0771234567',
            address: 'Colombo',
            profileImage: 'https://img.test/a.png',
        });
        expect(lastJson(res).user.displayName).toBe('Renamed');
    });

    it('rejects an unsupported profile image', async () => {
        const harness = createHarness({ users: [existingUser()] });
        const req = createRequest({ user: harness.models.User.docs[0], body: { displayName: 'Member', profileImage: 'http://insecure.test/a.png' } });

        const { res } = await harness.call('patch', '/api/auth/profile', req);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(lastJson(res).error).toBe('Profile image format is not supported.');
    });

    it('changes the password, signs out other sessions, and keeps this one', async () => {
        const harness = createHarness({ users: [existingUser({ sessionVersion: 2 })] });
        const req = createRequest({ user: harness.models.User.docs[0], body: { currentPassword: PASSWORD, newPassword: NEW_PASSWORD } });

        const { res } = await harness.call('patch', '/api/auth/password', req);

        const [user] = harness.models.User.docs;
        expect(verifyPassword(NEW_PASSWORD, user.passwordHash)).toBe(true);
        expect(user.sessionVersion).toBe(3);
        expect(req.session.authSessionVersion).toBe(3);
        expect(lastJson(res)).toEqual({ message: 'Password updated successfully.' });
    });

    it('rejects a wrong current password', async () => {
        const harness = createHarness({ users: [existingUser()] });
        const req = createRequest({ user: harness.models.User.docs[0], body: { currentPassword: 'Nope1234!', newPassword: NEW_PASSWORD } });

        const { res } = await harness.call('patch', '/api/auth/password', req);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(lastJson(res).code).toBe(API_ERROR_CODES.CURRENT_PASSWORD_INVALID);
        expect(harness.models.User.docs[0].passwordHash).toBe(PASSWORD_HASH);
    });

    it('sends OTP-only accounts to forgot password', async () => {
        const harness = createHarness({ users: [existingUser({ passwordHash: undefined })] });
        const req = createRequest({ user: harness.models.User.docs[0], body: { currentPassword: '', newPassword: NEW_PASSWORD } });

        const { res } = await harness.call('patch', '/api/auth/password', req);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(lastJson(res).code).toBe(API_ERROR_CODES.PASSWORD_NOT_CONFIGURED);
    });

    it('deletes the account with its CVs and ends the session', async () => {
        const harness = createHarness({
            users: [existingUser(), existingUser({ _id: '64b0000000000000000000b2', email: 'other@gmail.com' })],
            cvs: [{ userId: USER_ID }, { userId: USER_ID }, { userId: '64b0000000000000000000b2' }],
        });
        const req = createRequest({ user: harness.models.User.docs[0] });

        const { res } = await harness.call('delete', '/api/auth/account', req);

        expect(harness.models.User.docs.map((user) => user.email)).toEqual(['other@gmail.com']);
        expect(harness.models.CVDocument.docs).toEqual([expect.objectContaining({ userId: '64b0000000000000000000b2' })]);
        expect(req.sessionDestroyed).toBe(true);
        expect(res.clearCookie).toHaveBeenCalledWith('nexcv.sid');
        expect(lastJson(res)).toEqual({ message: 'Account deleted successfully.' });
    });
});

describe('password reset', () => {
    const genericMessage = 'If an account exists for this email, we will send password reset instructions.';

    it('stores a hashed one-hour token and emails the reset link', async () => {
        const harness = createHarness({ users: [existingUser()] });

        const { res } = await harness.call('post', '/api/auth/forgot-password', createRequest({ body: { email: 'member@gmail.com' } }));

        expect(lastJson(res)).toEqual({ message: genericMessage });
        const [user] = harness.models.User.docs;
        const { ctaUrl } = harness.deps.buildBrandedEmailHtml.mock.calls[0][0] as unknown as { ctaUrl: string };
        const token = new URL(ctaUrl).searchParams.get('token') as string;
        expect(ctaUrl).toBe(`https://app.test/reset-password?token=${token}`);
        expect(token).toMatch(/^[0-9a-f]{40}$/);
        expect(user.resetPasswordToken).toBe(hashToken(token));
        expect(user.resetPasswordExpires).toEqual(new Date(NOW.getTime() + 60 * MINUTE_MS));
        expect(harness.deps.sendSystemEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'member@gmail.com' }));
    });

    it('answers the same way for an unknown email and sends nothing', async () => {
        const harness = createHarness({ users: [existingUser()] });

        const { res } = await harness.call('post', '/api/auth/forgot-password', createRequest({ body: { email: 'nobody@gmail.com' } }));

        expect(lastJson(res)).toEqual({ message: genericMessage });
        expect(harness.deps.sendSystemEmail).not.toHaveBeenCalled();
    });

    it('removes the token again when the email fails', async () => {
        const harness = createHarness({ users: [existingUser()] }, { sendSystemEmail: vi.fn(async () => { throw new Error('smtp down'); }) });

        const { res } = await harness.call('post', '/api/auth/forgot-password', createRequest({ body: { email: 'member@gmail.com' } }));

        expect(res.status).toHaveBeenCalledWith(500);
        expect(lastJson(res).code).toBe(API_ERROR_CODES.PASSWORD_RESET_FAILED);
        expect(harness.models.User.docs[0].resetPasswordToken).toBeUndefined();
        expect(harness.models.User.docs[0].resetPasswordExpires).toBeUndefined();
    });

    it('answers 503 when email is not configured', async () => {
        const harness = createHarness({ users: [existingUser()] }, { isEmailServiceConfigured: vi.fn(() => false) });

        const { res } = await harness.call('post', '/api/auth/forgot-password', createRequest({ body: { email: 'member@gmail.com' } }));

        expect(res.status).toHaveBeenCalledWith(503);
        expect(harness.models.User.docs[0].resetPasswordToken).toBeUndefined();
    });

    const withResetToken = (expiresInMs: number) => existingUser({
        sessionVersion: 1,
        resetPasswordToken: hashToken('reset-token'),
        resetPasswordExpires: new Date(NOW.getTime() + expiresInMs),
    });

    it('validates a live token and rejects an expired one', async () => {
        const live = createHarness({ users: [withResetToken(MINUTE_MS)] });
        const expired = createHarness({ users: [withResetToken(-MINUTE_MS)] });

        const liveResult = await live.call('post', '/api/auth/validate-reset-token', createRequest({ body: { token: 'reset-token' } }));
        const expiredResult = await expired.call('post', '/api/auth/validate-reset-token', createRequest({ body: { token: 'reset-token' } }));

        expect(lastJson(liveResult.res)).toEqual({ valid: true });
        expect(expiredResult.res.status).toHaveBeenCalledWith(400);
        expect(lastJson(expiredResult.res).code).toBe(API_ERROR_CODES.PASSWORD_RESET_TOKEN_INVALID);
    });

    it('resets the password once, clears the token, and signs out every session', async () => {
        const harness = createHarness({ users: [withResetToken(MINUTE_MS)] });

        const { res } = await harness.call('post', '/api/auth/reset-password', createRequest({ body: { token: 'reset-token', password: NEW_PASSWORD } }));

        const [user] = harness.models.User.docs;
        expect(lastJson(res)).toEqual({ message: 'Password has been successfully reset.' });
        expect(verifyPassword(NEW_PASSWORD, user.passwordHash)).toBe(true);
        expect(user.resetPasswordToken).toBeUndefined();
        expect(user.resetPasswordExpires).toBeUndefined();
        expect(user.sessionVersion).toBe(2);

        const reuse = await harness.call('post', '/api/auth/reset-password', createRequest({ body: { token: 'reset-token', password: PASSWORD } }));
        expect(reuse.res.status).toHaveBeenCalledWith(400);
        expect(verifyPassword(NEW_PASSWORD, user.passwordHash)).toBe(true);
    });

    it('rejects a weak new password before looking up the token', async () => {
        const harness = createHarness({ users: [withResetToken(MINUTE_MS)] });

        const { res } = await harness.call('post', '/api/auth/reset-password', createRequest({ body: { token: 'reset-token', password: 'weak' } }));

        expect(res.status).toHaveBeenCalledWith(400);
        expect(lastJson(res).code).toBe(API_ERROR_CODES.PASSWORD_INVALID);
        expect(harness.models.User.docs[0].resetPasswordToken).toBe(hashToken('reset-token'));
    });
});

describe('Google OAuth', () => {
    it.each([
        ['download', '/builder?download=1'],
        ['dashboard', '/dashboard'],
        ['admin', '/admin'],
        ['anything-else', '/builder?import=1'],
        [undefined, '/builder?import=1'],
    ])('maps next=%s to %s and passes a hashed state to passport', async (next, redirect) => {
        const harness = createHarness();
        const req = createRequest({ query: next ? { next } : {} });

        await harness.runAll('get', '/api/auth/google', req);

        expect(req.session.authRedirect).toBe(redirect);
        expect(req.passportStart.strategy).toBe('google');
        expect(req.passportStart.options.scope).toEqual(['profile', 'email']);
        const state = req.passportStart.options.state as string;
        expect(req.session.googleOAuthState).toEqual({ value: hashToken(state), createdAt: NOW.getTime() });
    });

    const startedSession = async (harness: ReturnType<typeof createHarness>) => {
        const req = createRequest({ query: { next: 'dashboard' } });
        await harness.runAll('get', '/api/auth/google', req);
        return { session: req.session, state: req.passportStart.options.state as string };
    };

    it('signs in a returning user and redirects to the saved target', async () => {
        const harness = createHarness({ users: [existingUser()] });
        const { session, state } = await startedSession(harness);
        harness.googleOutcome.user = harness.models.User.docs[0];
        const req = createRequest({ query: { state }, session });

        const { res } = await harness.call('get', '/api/auth/google/callback', req);

        expect(res.redirect).toHaveBeenCalledWith('/dashboard');
        expect(req.user).toBe(harness.models.User.docs[0]);
        expect(req.session.googleOAuthState).toBeUndefined();
        expect(req.session.authRedirect).toBeUndefined();
        expect(harness.deps.sendNewAccountNotification).not.toHaveBeenCalled();
    });

    it('notifies admins about a newly created Google user', async () => {
        const harness = createHarness();
        const { session, state } = await startedSession(harness);
        harness.googleOutcome.user = { _id: USER_ID, email: 'new@gmail.com', wasNewlyCreated: true };

        await harness.call('get', '/api/auth/google/callback', createRequest({ query: { state }, session }));

        expect(harness.deps.sendNewAccountNotification).toHaveBeenCalledWith(harness.googleOutcome.user);
    });

    it.each([
        ['a wrong state', (state: string) => `${state}x`, 0],
        ['an expired state', (state: string) => state, 11 * MINUTE_MS],
    ])('rejects %s', async (_label, mutate, elapsedMs) => {
        const harness = createHarness({ users: [existingUser()] });
        const { session, state } = await startedSession(harness);
        harness.googleOutcome.user = harness.models.User.docs[0];
        vi.setSystemTime(new Date(NOW.getTime() + elapsedMs));
        const req = createRequest({ query: { state: mutate(state) }, session });

        const { res } = await harness.call('get', '/api/auth/google/callback', req);

        expect(res.redirect).toHaveBeenCalledWith('/?auth=failed&reason=invalid_state');
        expect(req.user).toBeUndefined();
        expect(req.session.googleOAuthState).toBeUndefined();
    });

    it('cannot reuse a state', async () => {
        const harness = createHarness({ users: [existingUser()] });
        const { session, state } = await startedSession(harness);
        harness.googleOutcome.user = harness.models.User.docs[0];
        const first = createRequest({ query: { state }, session });
        await harness.call('get', '/api/auth/google/callback', first);
        expect(first.user).toBe(harness.models.User.docs[0]);

        const replay = createRequest({ query: { state }, session: first.session });
        const { res } = await harness.call('get', '/api/auth/google/callback', replay);

        expect(res.redirect).toHaveBeenCalledWith('/?auth=failed&reason=invalid_state');
        expect(replay.user).toBeUndefined();
    });

    it.each([
        [{ info: { code: API_ERROR_CODES.ACCOUNT_EXISTS } }, '/?auth=failed&reason=account_exists'],
        [{ info: { message: 'no' } }, '/?auth=failed&reason=denied'],
        [{ err: new Error('boom') }, '/?auth=failed&reason=server_error'],
    ])('maps passport outcome %o to %s', async (outcome, redirect) => {
        const harness = createHarness();
        const { session, state } = await startedSession(harness);
        Object.assign(harness.googleOutcome, { user: null, ...outcome });

        const { res } = await harness.call('get', '/api/auth/google/callback', createRequest({ query: { state }, session }));

        expect(res.redirect).toHaveBeenCalledWith(redirect);
    });
});

type ProviderCase = {
    name: 'GitHub' | 'LinkedIn';
    path: string;
    idField: 'githubId' | 'linkedinId';
    stateKey: 'githubOAuthState' | 'linkedinOAuthState';
    authorizeUrl: string;
    callbackUrl: string;
    scope: string;
    notConfigured: string;
    clearConfig: () => void;
    profile: Record<string, unknown>;
    profileId: string;
    stubFetch: (profile: Record<string, unknown>, options?: { tokenOk?: boolean; emails?: unknown[] }) => ReturnType<typeof vi.fn>;
};

const githubFetch: ProviderCase['stubFetch'] = (profile, { tokenOk = true, emails = [] } = {}) => {
    const fetchMock = vi.fn(async (url: string) => {
        if (url === 'https://github.com/login/oauth/access_token') {
            return tokenOk ? jsonResponse({ access_token: 'gh-token' }) : jsonResponse({ error: 'bad_verification_code' }, false, 400);
        }
        if (url === 'https://api.github.com/user') return jsonResponse(profile);
        if (url === 'https://api.github.com/user/emails') return jsonResponse(emails);
        throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
};

const linkedinFetch: ProviderCase['stubFetch'] = (profile, { tokenOk = true } = {}) => {
    const fetchMock = vi.fn(async (url: string) => {
        if (url === 'https://www.linkedin.com/oauth/v2/accessToken') {
            return tokenOk ? jsonResponse({ access_token: 'li-token' }) : jsonResponse({ error: 'invalid_request' }, false, 400);
        }
        if (url === 'https://api.linkedin.com/v2/userinfo') return jsonResponse(profile);
        throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
};

const providerCases: ProviderCase[] = [
    {
        name: 'GitHub',
        path: '/api/auth/github',
        idField: 'githubId',
        stateKey: 'githubOAuthState',
        authorizeUrl: 'https://github.com/login/oauth/authorize',
        callbackUrl: 'https://app.test/api/auth/github/callback',
        scope: 'read:user user:email',
        notConfigured: '/?auth=failed&reason=github_not_configured',
        clearConfig: () => { delete process.env.GITHUB_CLIENT_SECRET; },
        profile: { id: 4242, login: 'octo', name: 'Octo Cat', email: 'Octo@Gmail.com', avatar_url: 'https://avatars.test/octo.png' },
        profileId: '4242',
        stubFetch: githubFetch,
    },
    {
        name: 'LinkedIn',
        path: '/api/auth/linkedin',
        idField: 'linkedinId',
        stateKey: 'linkedinOAuthState',
        authorizeUrl: 'https://www.linkedin.com/oauth/v2/authorization',
        callbackUrl: 'https://app.test/api/auth/linkedin/callback',
        scope: 'openid profile email',
        notConfigured: '/?auth=failed&reason=linkedin_not_configured',
        clearConfig: () => { delete process.env.LINKEDIN_CLIENT_ID; },
        profile: { sub: 'li-777', given_name: 'Link', family_name: 'Person', email: 'Octo@Gmail.com', picture: 'https://media.test/li.png' },
        profileId: 'li-777',
        stubFetch: linkedinFetch,
    },
];

describe.each(providerCases)('$name OAuth', (provider) => {
    const start = async (harness: ReturnType<typeof createHarness>, next = 'my-cvs') => {
        const req = createRequest({ query: { next } });
        const { res } = await harness.call('get', provider.path, req);
        const location = new URL(res.redirect.mock.calls[0][0] as string);
        return { req, location, state: location.searchParams.get('state') as string };
    };

    const finish = async (harness: ReturnType<typeof createHarness>, session: Loose, query: Record<string, string>) => {
        const req = createRequest({ query, session });
        const { res, next } = await harness.call('get', `${provider.path}/callback`, req);
        return { req, res, next };
    };

    it('redirects to the provider with a hashed state saved in the session', async () => {
        const harness = createHarness();

        const { req, location, state } = await start(harness);

        expect(`${location.origin}${location.pathname}`).toBe(provider.authorizeUrl);
        expect(location.searchParams.get('client_id')).toBe(provider.name === 'GitHub' ? 'gh-client' : 'li-client');
        expect(location.searchParams.get('redirect_uri')).toBe(provider.callbackUrl);
        expect(location.searchParams.get('scope')).toBe(provider.scope);
        expect(state).toMatch(/^[0-9a-f]{64}$/);
        expect(req.session[provider.stateKey]).toEqual({ value: hashToken(state), createdAt: NOW.getTime() });
        expect(req.session.authRedirect).toBe('/my-cvs');
    });

    it('redirects with a reason when the provider is not configured', async () => {
        provider.clearConfig();
        const harness = createHarness();
        const req = createRequest();

        const { res } = await harness.call('get', provider.path, req);

        expect(res.redirect).toHaveBeenCalledWith(provider.notConfigured);
        expect(req.session[provider.stateKey]).toBeUndefined();
    });

    it('creates a verified account for a new provider user and signs in', async () => {
        const harness = createHarness();
        const fetchMock = provider.stubFetch(provider.profile);
        const { req: startReq, state } = await start(harness);

        const { req, res } = await finish(harness, startReq.session, { state, code: 'auth-code' });

        expect(res.redirect).toHaveBeenCalledWith('/my-cvs');
        expect(harness.models.User.docs).toHaveLength(1);
        const [user] = harness.models.User.docs;
        expect(user).toMatchObject({
            [provider.idField]: provider.profileId,
            email: 'octo@gmail.com',
            displayName: provider.name === 'GitHub' ? 'Octo Cat' : 'Link Person',
            emailVerified: true,
            role: 'user',
            authProvider: provider.name === 'GitHub' ? 'github' : 'linkedin',
            profileImage: provider.name === 'GitHub' ? 'https://avatars.test/octo.png' : 'https://media.test/li.png',
        });
        expect(req.user).toBe(user);
        expect(req.session.authRedirect).toBeUndefined();
        expect(harness.deps.sendNewAccountNotification).toHaveBeenCalledWith(user);

        const tokenRequest = fetchMock.mock.calls[0] as unknown as [string, { body: URLSearchParams }];
        expect(tokenRequest[1].body.get('code')).toBe('auth-code');
        expect(tokenRequest[1].body.get('redirect_uri')).toBe(provider.callbackUrl);
    });

    it('updates a returning provider user without creating a new one', async () => {
        const harness = createHarness({
            users: [existingUser({
                [provider.idField]: provider.profileId,
                email: SUPER_ADMIN_EMAIL,
                emailVerified: false,
                emailVerificationToken: 'pending',
                profileImage: 'https://old.test/a.png',
            })],
        });
        provider.stubFetch(provider.profile);
        const { req: startReq, state } = await start(harness);

        const { req, res } = await finish(harness, startReq.session, { state, code: 'auth-code' });

        expect(res.redirect).toHaveBeenCalledWith('/my-cvs');
        expect(harness.models.User.docs).toHaveLength(1);
        expect(harness.models.User.docs[0]).toMatchObject({
            emailVerified: true,
            emailVerificationToken: undefined,
            role: 'super_admin',
            profileImage: provider.name === 'GitHub' ? 'https://avatars.test/octo.png' : 'https://media.test/li.png',
        });
        expect(req.user).toBe(harness.models.User.docs[0]);
        expect(harness.deps.sendNewAccountNotification).not.toHaveBeenCalled();
    });

    it('refuses to link a provider login to an existing email account', async () => {
        const harness = createHarness({ users: [existingUser({ email: 'octo@gmail.com' })] });
        provider.stubFetch(provider.profile);
        const { req: startReq, state } = await start(harness);

        const { req, res } = await finish(harness, startReq.session, { state, code: 'auth-code' });

        expect(res.redirect).toHaveBeenCalledWith('/?auth=failed&reason=account_exists');
        expect(harness.models.User.docs[0][provider.idField]).toBeUndefined();
        expect(req.user).toBeUndefined();
    });

    it('rejects a callback with the wrong state before calling the provider', async () => {
        const harness = createHarness();
        const fetchMock = provider.stubFetch(provider.profile);
        const { req: startReq, state } = await start(harness);

        const { res } = await finish(harness, startReq.session, { state: `${state}x`, code: 'auth-code' });

        expect(res.redirect).toHaveBeenCalledWith('/?auth=failed&reason=invalid_state');
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects a state older than ten minutes', async () => {
        const harness = createHarness();
        const fetchMock = provider.stubFetch(provider.profile);
        const { req: startReq, state } = await start(harness);
        vi.setSystemTime(new Date(NOW.getTime() + 10 * MINUTE_MS + 1));

        const { res } = await finish(harness, startReq.session, { state, code: 'auth-code' });

        expect(res.redirect).toHaveBeenCalledWith('/?auth=failed&reason=invalid_state');
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('treats a missing code as denied', async () => {
        const harness = createHarness();
        const fetchMock = provider.stubFetch(provider.profile);
        const { req: startReq, state } = await start(harness);

        const { res } = await finish(harness, startReq.session, { state });

        expect(res.redirect).toHaveBeenCalledWith('/?auth=failed&reason=denied');
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('reports a failed token exchange as a server error', async () => {
        const harness = createHarness();
        provider.stubFetch(provider.profile, { tokenOk: false });
        const { req: startReq, state } = await start(harness);

        const { res } = await finish(harness, startReq.session, { state, code: 'auth-code' });

        expect(res.redirect).toHaveBeenCalledWith('/?auth=failed&reason=server_error');
        expect(harness.models.User.docs).toHaveLength(0);
    });

    it('reports a profile without an email as a server error', async () => {
        const harness = createHarness();
        provider.stubFetch({ ...provider.profile, email: undefined });
        const { req: startReq, state } = await start(harness);

        const { res } = await finish(harness, startReq.session, { state, code: 'auth-code' });

        expect(res.redirect).toHaveBeenCalledWith('/?auth=failed&reason=server_error');
        expect(harness.models.User.docs).toHaveLength(0);
    });
});

describe('GitHub OAuth email selection', () => {
    it('uses the primary verified email when the profile email is private', async () => {
        const harness = createHarness();
        githubFetch(
            { id: 99, login: 'quiet', email: null, avatar_url: 'http://insecure.test/a.png' },
            {
                emails: [
                    { email: 'unverified@gmail.com', primary: false, verified: false },
                    { email: 'second@gmail.com', primary: false, verified: true },
                    { email: 'Primary@Gmail.com', primary: true, verified: true },
                ],
            },
        );
        const startReq = createRequest();
        const { res: startRes } = await harness.call('get', '/api/auth/github', startReq);
        const state = new URL(startRes.redirect.mock.calls[0][0] as string).searchParams.get('state') as string;

        const { res } = await harness.call('get', '/api/auth/github/callback', createRequest({ query: { state, code: 'c' }, session: startReq.session }));

        expect(res.redirect).toHaveBeenCalledWith('/builder?import=1');
        expect(harness.models.User.docs[0]).toMatchObject({ email: 'primary@gmail.com', displayName: 'quiet', profileImage: '' });
    });
});

describe('current user and logout', () => {
    it('returns the signed-in user', async () => {
        const harness = createHarness({ users: [existingUser()] });

        const { res } = await harness.call('get', '/api/auth/current-user', createRequest({ user: harness.models.User.docs[0] }));

        expect(lastJson(res)).toEqual({ user: expect.objectContaining({ id: USER_ID }) });
    });

    it('answers 401 when signed out', async () => {
        const harness = createHarness();

        const { res } = await harness.call('get', '/api/auth/current-user', createRequest());

        expect(res.status).toHaveBeenCalledWith(401);
        expect(lastJson(res)).toEqual({ error: 'Not authenticated', code: API_ERROR_CODES.AUTH_REQUIRED });
    });

    it('logs out, destroys the session, and clears the configured cookie', async () => {
        process.env.SESSION_COOKIE_NAME = 'custom.sid';
        const harness = createHarness({ users: [existingUser()] });
        const req = createRequest({ user: harness.models.User.docs[0] });

        const { res } = await harness.call('post', '/api/auth/logout', req);

        expect(req.user).toBeUndefined();
        expect(req.sessionDestroyed).toBe(true);
        expect(res.clearCookie).toHaveBeenCalledWith('custom.sid');
        expect(lastJson(res)).toEqual({ message: 'Logged out successfully' });
    });
});
