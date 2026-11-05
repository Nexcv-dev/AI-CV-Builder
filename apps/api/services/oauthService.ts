import type { Request } from 'express';
import type UserModel from '../server-models/User';
import type { IUser } from '../server-models/User';
import type { roleForEmail, syncUserRoleFromAllowlist } from '../server-models/userRole';
import { API_ERROR_CODES } from '../server-utils/apiErrors';
import type { normalizeEmail, sanitizeDisplayName } from '../server-utils/userAuth';
import { markEmailVerified } from './emailVerificationService';

/**
 * Social sign-in: Google (through passport, see `server-models/passportSetup.ts`),
 * and GitHub and LinkedIn (authorization code flow, handled here directly).
 *
 * Every provider uses the same CSRF protection: the start route stores a hash
 * of a random `state` in the session, and the callback accepts it once,
 * within ten minutes.
 *
 * A provider login never links to an existing email account. If the email
 * already belongs to a NexCV account, the login is refused with
 * `account_exists` and the user signs in with email instead.
 */

// Loosely typed provider JSON and session fields.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;

type TokenHasher = (value: string) => string;
type RandomBytesFactory = (size: number) => { toString(encoding: 'hex'): string };

export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export type OAuthStateProvider = 'google' | 'github' | 'linkedin';

// Session keys: googleOAuthState, githubOAuthState, linkedinOAuthState.
const stateSessionKey = (provider: OAuthStateProvider) => `${provider}OAuthState`;

export const createOAuthState = (
    req: Request,
    provider: OAuthStateProvider,
    randomBytes: RandomBytesFactory,
    hashToken: TokenHasher,
) => {
    const state = randomBytes(32).toString('hex');
    (req.session as Loose)[stateSessionKey(provider)] = {
        value: hashToken(state),
        createdAt: Date.now(),
    };
    return state;
};

/** Checks the callback `state` against the stored one. The stored state is removed either way. */
export const consumeOAuthState = (
    req: Request,
    provider: OAuthStateProvider,
    state: unknown,
    hashToken: TokenHasher,
) => {
    const key = stateSessionKey(provider);
    const stored = (req.session as Loose)?.[key];
    delete (req.session as Loose)[key];

    if (!stored || typeof state !== 'string' || !state) return false;
    if (typeof stored.createdAt !== 'number' || Date.now() - stored.createdAt > OAUTH_STATE_TTL_MS) {
        return false;
    }

    return stored.value === hashToken(state);
};

export const DEFAULT_AUTH_REDIRECT = '/builder?import=1';

const AUTH_REDIRECTS: Record<string, string> = {
    download: '/builder?download=1',
    builder: '/builder',
    dashboard: '/dashboard',
    'my-cvs': '/my-cvs',
    profile: '/profile',
    admin: '/admin',
};

/** Maps the `next` query value to a fixed in-app path. Anything unknown goes to the CV import. */
export const authRedirectForNextTarget = (nextTarget: unknown) => (
    typeof nextTarget === 'string' && Object.prototype.hasOwnProperty.call(AUTH_REDIRECTS, nextTarget)
        ? AUTH_REDIRECTS[nextTarget]
        : DEFAULT_AUTH_REDIRECT
);

/** Saves where to send the user once the provider calls back. */
export const rememberAuthRedirect = (req: Request) => {
    const nextTarget = typeof req.query.next === 'string' ? req.query.next : 'import';
    (req.session as Loose).authRedirect = authRedirectForNextTarget(nextTarget);
};

/** Reads and clears the saved post-login redirect. */
export const takeAuthRedirect = (req: Request) => {
    const redirectTo = (req.session as Loose).authRedirect || DEFAULT_AUTH_REDIRECT;
    delete (req.session as Loose).authRedirect;
    return redirectTo as string;
};

export type OAuthFailureReason =
    | 'invalid_state'
    | 'denied'
    | 'account_exists'
    | 'server_error'
    | 'session_error'
    | 'github_not_configured'
    | 'linkedin_not_configured';

export const oauthFailureRedirect = (reason: OAuthFailureReason) => `/?auth=failed&reason=${reason}`;

/** `account_exists` when the provider email belongs to an email account, otherwise `denied`. */
export const oauthDeniedReason = (info: { code?: string } | undefined): OAuthFailureReason => (
    info?.code === API_ERROR_CODES.ACCOUNT_EXISTS ? 'account_exists' : 'denied'
);

/** Only HTTPS avatar URLs are stored. */
const safeHttpsImage = (value: unknown) => {
    const image = typeof value === 'string' ? value.trim() : '';
    return image.startsWith('https://') ? image : '';
};

interface OAuthClientConfig {
    clientId: string;
    clientSecret: string;
}

const clientConfig = (clientId?: string, clientSecret?: string): OAuthClientConfig | null => {
    const id = clientId?.trim();
    const secret = clientSecret?.trim();
    return id && secret ? { clientId: id, clientSecret: secret } : null;
};

const callbackUrlFor = (req: Request, configured: string, path: string) => {
    if (configured) return configured;
    const frontendUrl = process.env.FRONTEND_URL?.replace(/\/+$/, '');
    if (frontendUrl) return `${frontendUrl}${path}`;
    return `${req.protocol}://${req.get('host')}${path}`;
};

export interface IdentityHelpers {
    normalizeEmail: typeof normalizeEmail;
    sanitizeDisplayName: typeof sanitizeDisplayName;
}

/** The account details a GitHub or LinkedIn login provides. */
export interface OAuthIdentity {
    provider: 'github' | 'linkedin';
    providerId: string;
    email: string;
    displayName: string;
    profileImage: string;
}

/**
 * A provider that signs in with the authorization code flow. `fetchIdentity`
 * returns null when a provider call failed (already logged), and throws when
 * the provider account lacks an id, email, or name.
 */
export interface CodeFlowOAuthProvider {
    key: 'github' | 'linkedin';
    label: string;
    config: () => OAuthClientConfig | null;
    callbackUrl: (req: Request) => string;
    authorizeUrl: (config: OAuthClientConfig, redirectUri: string, state: string) => string;
    fetchIdentity: (
        config: OAuthClientConfig,
        code: string,
        redirectUri: string,
        helpers: IdentityHelpers,
    ) => Promise<OAuthIdentity | null>;
}

const readJson = async (response: Response, fallback: unknown): Promise<Loose> => response.json().catch(() => fallback);

/** The profile email, or else the primary verified email, or else any verified email. */
const primaryGitHubEmail = (profile: Record<string, Loose>, emails: Loose[], normalize: typeof normalizeEmail) => {
    const profileEmail = normalize(profile.email);
    if (profileEmail) return profileEmail;

    const primaryVerified = emails.find((item) => item?.primary && item?.verified && item?.email);
    const anyVerified = emails.find((item) => item?.verified && item?.email);
    return normalize(primaryVerified?.email || anyVerified?.email);
};

export const gitHubIdentity = (
    profile: Record<string, Loose>,
    emails: Loose[],
    helpers: IdentityHelpers,
): OAuthIdentity => {
    const providerId = profile.id ? String(profile.id).trim() : '';
    const email = primaryGitHubEmail(profile, emails, helpers.normalizeEmail);
    const displayName = helpers.sanitizeDisplayName(profile.name || profile.login);
    const profileImage = safeHttpsImage(profile.avatar_url);

    if (!providerId) throw new Error('GitHub account did not provide an account id.');
    if (!email) throw new Error('GitHub account did not provide a verified email address.');
    if (!displayName) throw new Error('GitHub account did not provide a display name.');

    return { provider: 'github', providerId, email, displayName, profileImage };
};

export const linkedInIdentity = (profile: Record<string, Loose>, helpers: IdentityHelpers): OAuthIdentity => {
    const providerId = typeof profile.sub === 'string' ? profile.sub.trim() : '';
    const email = helpers.normalizeEmail(profile.email);
    const displayName = helpers.sanitizeDisplayName(profile.name || [profile.given_name, profile.family_name].filter(Boolean).join(' '));
    const profileImage = safeHttpsImage(profile.picture);

    if (!providerId) throw new Error('LinkedIn account did not provide an account id.');
    if (!email) throw new Error('LinkedIn account did not provide an email address.');
    if (!displayName) throw new Error('LinkedIn account did not provide a display name.');

    return { provider: 'linkedin', providerId, email, displayName, profileImage };
};

export const GITHUB_OAUTH_PROVIDER: CodeFlowOAuthProvider = {
    key: 'github',
    label: 'GitHub',
    config: () => clientConfig(process.env.GITHUB_CLIENT_ID, process.env.GITHUB_CLIENT_SECRET),
    callbackUrl: (req) => callbackUrlFor(
        req,
        (process.env.GITHUB_CALLBACK_URL || process.env.GITHUB_REDIRECT_URI || '').trim(),
        '/api/auth/github/callback',
    ),
    authorizeUrl: (config, redirectUri, state) => {
        const params = new URLSearchParams({
            client_id: config.clientId,
            redirect_uri: redirectUri,
            scope: 'read:user user:email',
            state,
        });
        return `https://github.com/login/oauth/authorize?${params.toString()}`;
    },
    fetchIdentity: async (config, code, redirectUri, helpers) => {
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json',
            },
            body: new URLSearchParams({
                client_id: config.clientId,
                client_secret: config.clientSecret,
                code,
                redirect_uri: redirectUri,
            }),
        });

        const tokenData = await readJson(tokenResponse, {});
        if (!tokenResponse.ok || typeof tokenData.access_token !== 'string') {
            console.warn('GitHub token exchange failed:', tokenData?.error_description || tokenData?.error || tokenResponse.status);
            return null;
        }

        const authHeaders = {
            Authorization: `Bearer ${tokenData.access_token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
        };
        const profileResponse = await fetch('https://api.github.com/user', { headers: authHeaders });
        const profile = await readJson(profileResponse, {});
        if (!profileResponse.ok) {
            console.warn('GitHub profile fetch failed:', profile?.message || profileResponse.status);
            return null;
        }

        const emailsResponse = await fetch('https://api.github.com/user/emails', { headers: authHeaders });
        const emails = await readJson(emailsResponse, []);
        if (!emailsResponse.ok) {
            console.warn('GitHub email fetch failed:', Array.isArray(emails) ? emailsResponse.status : emails?.message || emailsResponse.status);
            return null;
        }

        return gitHubIdentity(profile, Array.isArray(emails) ? emails : [], helpers);
    },
};

export const LINKEDIN_OAUTH_PROVIDER: CodeFlowOAuthProvider = {
    key: 'linkedin',
    label: 'LinkedIn',
    config: () => clientConfig(process.env.LINKEDIN_CLIENT_ID, process.env.LINKEDIN_CLIENT_SECRET),
    callbackUrl: (req) => callbackUrlFor(
        req,
        process.env.LINKEDIN_REDIRECT_URI?.trim() || '',
        '/api/auth/linkedin/callback',
    ),
    authorizeUrl: (config, redirectUri, state) => {
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: config.clientId,
            redirect_uri: redirectUri,
            scope: 'openid profile email',
            state,
        });
        return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
    },
    fetchIdentity: async (config, code, redirectUri, helpers) => {
        const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri,
                client_id: config.clientId,
                client_secret: config.clientSecret,
            }),
        });

        const tokenData = await readJson(tokenResponse, {});
        if (!tokenResponse.ok || typeof tokenData.access_token !== 'string') {
            console.warn('LinkedIn token exchange failed:', tokenData?.error_description || tokenData?.error || tokenResponse.status);
            return null;
        }

        const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const profile = await readJson(profileResponse, {});
        if (!profileResponse.ok) {
            console.warn('LinkedIn userinfo failed:', profile?.message || profile?.error || profileResponse.status);
            return null;
        }

        return linkedInIdentity(profile, helpers);
    },
};

export interface OAuthUserDeps {
    User: typeof UserModel;
    roleForEmail: typeof roleForEmail;
    syncUserRoleFromAllowlist: typeof syncUserRoleFromAllowlist;
}

export type OAuthUserResult =
    | { user: IUser & { wasNewlyCreated?: boolean } }
    | { user: null; info: { message: string; code: typeof API_ERROR_CODES.ACCOUNT_EXISTS } };

/**
 * Finds or creates the NexCV user for a GitHub or LinkedIn login.
 *
 * - Known provider id: refresh the avatar, mark the email verified, sync the
 *   admin role.
 * - Unknown provider id, but the email has an account: refuse (no linking).
 * - Otherwise: create a verified account, flagged `wasNewlyCreated` so the
 *   route sends the new-account notification.
 */
export const resolveOAuthUser = async (deps: OAuthUserDeps, identity: OAuthIdentity): Promise<OAuthUserResult> => {
    const idField = identity.provider === 'github' ? 'githubId' : 'linkedinId';

    let user = await deps.User.findOne({ [idField]: identity.providerId });
    if (user) {
        if (identity.profileImage && user.profileImage !== identity.profileImage) {
            user.profileImage = identity.profileImage;
        }
        if (!user.emailVerified) {
            markEmailVerified(user);
        }
        await deps.syncUserRoleFromAllowlist(user);
        await user.save();
        return { user };
    }

    user = await deps.User.findOne({ email: identity.email });
    if (user) {
        return {
            user: null,
            info: {
                message: 'A NexCV account already exists for this email. Sign in with email first.',
                code: API_ERROR_CODES.ACCOUNT_EXISTS,
            },
        };
    }

    const created: IUser & { wasNewlyCreated?: boolean } = await deps.User.create({
        [idField]: identity.providerId,
        displayName: identity.displayName,
        email: identity.email,
        profileImage: identity.profileImage,
        role: deps.roleForEmail(identity.email),
        emailVerified: true,
        authProvider: identity.provider,
    });
    created.wasNewlyCreated = true;

    return { user: created };
};
