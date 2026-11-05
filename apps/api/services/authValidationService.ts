import type { roleForEmail } from '../server-models/userRole';
import { API_ERROR_CODES, type ApiErrorCode } from '../server-utils/apiErrors';

const allowedAuthEmailDomains = new Set([
    'gmail.com',
    'googlemail.com',
    'yahoo.com',
    'hotmail.com',
    'outlook.com',
    'live.com',
    'msn.com',
    'icloud.com',
    'me.com',
    'proton.me',
    'protonmail.com',
    'aol.com',
]);

const blockedAuthEmailDomains = new Set([
    'mailinator.com',
    'guerrillamail.com',
    'guerrillamail.net',
    'guerrillamail.org',
    'yopmail.com',
    'tempmail.com',
    'temp-mail.org',
    '10minutemail.com',
    'throwawaymail.com',
    'trashmail.com',
    'sharklasers.com',
    'getairmail.com',
]);

const getAuthEmailDomainError = (email: string) => {
    const domain = email.split('@')[1]?.toLowerCase() || '';
    if (!domain) return 'Enter a valid email address.';
    if (blockedAuthEmailDomains.has(domain)) return 'Enter a valid email address.';
    if (!allowedAuthEmailDomains.has(domain)) {
        return 'Enter a valid email address.';
    }
    return '';
};

export const validateAuthEmail = (email: string, isValidEmail: (value: string) => boolean) => {
    if (!isValidEmail(email)) return 'Enter a valid email address.';
    return getAuthEmailDomainError(email);
};

/**
 * A rejected auth request: the HTTP status and the `{ error, code }` body the
 * route sends. Auth services return this instead of writing the response.
 */
export interface AuthFailure {
    ok: false;
    status: number;
    error: string;
    code: ApiErrorCode;
}

/**
 * Narrows a service result to its failure branch. `strict` is off in apps/api,
 * so checking `!result.ok` alone does not narrow the union.
 */
export const isAuthFailure = (result: { ok: boolean }): result is AuthFailure => result.ok === false;

export const authFailure = (status: number, error: string, code: ApiErrorCode): AuthFailure => ({
    ok: false,
    status,
    error,
    code,
});

// Signup errors stay generic for allowlisted admin emails and duplicate-key
// races, so the response does not reveal which emails are reserved.
export const GENERIC_SIGNUP_ERROR = 'Could not create your account. Please check your details and try again.';
export const EXISTING_ACCOUNT_SIGNUP_ERROR = 'An account already exists for this email. Please log in instead.';
export const TERMS_REQUIRED_ERROR = 'Please accept the Terms and Privacy Policy to create your account.';
export const OTP_CODE_REQUIRED_ERROR = 'Enter the 6-digit verification code.';

export type AuthIntent = 'signup' | 'login';

export const authIntent = (value: unknown): AuthIntent => (value === 'signup' ? 'signup' : 'login');

/** The signup forms send the agreement checkbox as a boolean or as the string "true". */
export const hasAcceptedTerms = (value: unknown) => value === true || value === 'true';

/** Strips spaces and other separators the user may type into the 6-digit code. */
export const normalizeOtpCode = (value: unknown) => (typeof value === 'string' ? value.replace(/\D/g, '') : '');

export const isOtpCode = (code: string) => /^\d{6}$/.test(code);

export const termsRequiredFailure = () => authFailure(400, TERMS_REQUIRED_ERROR, API_ERROR_CODES.VALIDATION_FAILED);

export const existingAccountFailure = () => authFailure(409, EXISTING_ACCOUNT_SIGNUP_ERROR, API_ERROR_CODES.ACCOUNT_EXISTS);

export const otpCodeRequiredFailure = () => authFailure(400, OTP_CODE_REQUIRED_ERROR, API_ERROR_CODES.VALIDATION_FAILED);

export interface AuthEmailRules {
    isValidEmail: (value: string) => boolean;
    roleForEmail: typeof roleForEmail;
}

/**
 * Checks the email format and supported domain. For signup it also refuses
 * emails on the super admin allowlist: those accounts are never self-created.
 */
export const validateAuthEmailForIntent = (
    email: string,
    intent: AuthIntent,
    rules: AuthEmailRules,
): AuthFailure | null => {
    const emailError = validateAuthEmail(email, rules.isValidEmail);
    if (emailError) return authFailure(400, emailError, API_ERROR_CODES.VALIDATION_FAILED);

    if (intent === 'signup' && rules.roleForEmail(email) !== 'user') {
        return authFailure(400, GENERIC_SIGNUP_ERROR, API_ERROR_CODES.VALIDATION_FAILED);
    }

    return null;
};

export interface SignupRules extends AuthEmailRules {
    validatePasswordStrength: (password: string) => boolean;
    passwordPolicyMessage: string;
}

export interface SignupDetails {
    email: string;
    displayName: string;
    phone: string;
    password: string;
    acceptedTerms: boolean;
}

/**
 * Rules for `POST /api/auth/signup`, checked in this order: valid email, not
 * an allowlisted admin email, name, contact number, terms agreement, strong
 * password.
 *
 * The web auth modal does not use this endpoint. It signs up through
 * `POST /api/auth/email/start` (see `startEmailOtp`), which asks for no
 * contact number.
 */
export const validateSignupDetails = (details: SignupDetails, rules: SignupRules): AuthFailure | null => {
    const emailFailure = validateAuthEmailForIntent(details.email, 'signup', rules);
    if (emailFailure) return emailFailure;

    if (!details.displayName) {
        return authFailure(400, 'Enter your name.', API_ERROR_CODES.VALIDATION_FAILED);
    }

    if (!details.phone) {
        return authFailure(400, 'Enter your contact number.', API_ERROR_CODES.VALIDATION_FAILED);
    }

    if (!details.acceptedTerms) return termsRequiredFailure();

    if (!rules.validatePasswordStrength(details.password)) {
        return authFailure(400, rules.passwordPolicyMessage, API_ERROR_CODES.PASSWORD_INVALID);
    }

    return null;
};
