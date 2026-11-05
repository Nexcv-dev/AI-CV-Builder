import type UserModel from '../server-models/User';
import type { IUser } from '../server-models/User';
import type { roleForEmail, syncUserRoleFromAllowlist } from '../server-models/userRole';
import { API_ERROR_CODES } from '../server-utils/apiErrors';
import type {
    generateEmailVerificationOtp,
    hashPassword,
    hashToken,
    isEmailVerified,
    sendEmailVerificationWithRetry,
    sendNewAccountNotification,
} from '../server-utils/userAuth';
import {
    authFailure,
    existingAccountFailure,
    isOtpCode,
    otpCodeRequiredFailure,
    termsRequiredFailure,
    validateAuthEmailForIntent,
    type AuthEmailRules,
    type AuthFailure,
    type AuthIntent,
} from './authValidationService';

/**
 * Email accounts and their one-time verification codes.
 *
 * A 6-digit OTP is emailed to the user and only its hash is stored, in
 * `emailVerificationToken`, with `emailVerificationExpires` (10 minutes, set by
 * `generateEmailVerificationOtp`). The same code both verifies the email and,
 * for OTP sign-in, proves the user owns it.
 *
 * Functions here return an `AuthFailure` for rejected requests and leave the
 * HTTP response and session login to the route.
 */

type UserModelType = typeof UserModel;
type EmailVerification = ReturnType<typeof generateEmailVerificationOtp>;

export interface EmailAccountDeps {
    User: UserModelType;
    hashPassword: typeof hashPassword;
    generateEmailVerificationOtp: typeof generateEmailVerificationOtp;
    roleForEmail: typeof roleForEmail;
}

export interface EmailOtpDeps extends EmailAccountDeps, AuthEmailRules {
    hashToken: typeof hashToken;
    isEmailVerified: typeof isEmailVerified;
    validatePasswordStrength: (password: string) => boolean;
    passwordPolicyMessage: string;
    sendEmailVerificationWithRetry: typeof sendEmailVerificationWithRetry;
    sendNewAccountNotification: typeof sendNewAccountNotification;
    syncUserRoleFromAllowlist: typeof syncUserRoleFromAllowlist;
}

const otpDeliveryFailure = (status: number, error: string) => authFailure(status, error, API_ERROR_CODES.OTP_DELIVERY_FAILED);

export const OTP_DELIVERY_FAILED_ERROR = 'We could not send your OTP right now. Please try again in a few minutes.';

export const setPendingEmailVerification = (user: IUser, verification: EmailVerification) => {
    user.emailVerificationToken = verification.codeHash;
    user.emailVerificationExpires = verification.expires;
};

export const markEmailVerified = (user: IUser) => {
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
};

/** Finds the user whose stored OTP hash matches `code` and has not expired. */
const findUserByValidOtp = (
    deps: Pick<EmailOtpDeps, 'User' | 'hashToken'>,
    filter: { email: string } | { _id: unknown },
    code: string,
) => deps.User.findOne({
    ...filter,
    emailVerificationToken: deps.hashToken(code),
    emailVerificationExpires: { $gt: new Date() },
});

/**
 * Creates an unverified email account with a pending OTP. The caller sends
 * the returned code.
 */
export const createEmailAccount = async (
    deps: EmailAccountDeps,
    details: { email: string; displayName: string; password: string; phone?: string },
) => {
    const verification = deps.generateEmailVerificationOtp();
    const user = await deps.User.create({
        email: details.email,
        displayName: details.displayName,
        ...(details.phone ? { phone: details.phone } : {}),
        passwordHash: deps.hashPassword(details.password),
        role: deps.roleForEmail(details.email),
        termsAcceptedAt: new Date(),
        emailVerified: false,
        emailVerificationToken: verification.codeHash,
        emailVerificationExpires: verification.expires,
        authProvider: 'email',
    });
    return { user, code: verification.code };
};

export interface StartEmailOtpInput {
    email: string;
    displayName: string;
    password: string;
    acceptedTerms: boolean;
    intent: AuthIntent;
}

export type StartEmailOtpResult = AuthFailure | { ok: true; needsName: boolean };

/**
 * Sends a sign-in OTP, creating the account first when the email is new.
 *
 * - `signup` intent with an existing account is refused.
 * - A new email (from either intent) needs a name, the terms agreement, and a
 *   strong password. Without a name the result is `needsName: true`, and the
 *   modal asks for one.
 * - An existing account (only reachable with the `login` intent) gets a fresh
 *   OTP. Its password is never changed here.
 *
 * If the OTP email cannot be sent, a just-created account is deleted again so
 * the user can retry the signup.
 */
export const startEmailOtp = async (deps: EmailOtpDeps, input: StartEmailOtpInput): Promise<StartEmailOtpResult> => {
    const emailFailure = validateAuthEmailForIntent(input.email, input.intent, deps);
    if (emailFailure) return emailFailure;

    const user = await deps.User.findOne({ email: input.email });

    if (input.intent === 'signup' && user) return existingAccountFailure();

    if (!user) {
        if (!input.displayName) return { ok: true, needsName: true };
        if (!input.acceptedTerms) return termsRequiredFailure();
        if (!deps.validatePasswordStrength(input.password)) {
            return authFailure(400, deps.passwordPolicyMessage, API_ERROR_CODES.PASSWORD_INVALID);
        }

        const created = await createEmailAccount(deps, input);
        void deps.sendNewAccountNotification(created.user);

        const sent = await deps.sendEmailVerificationWithRetry(created.user, created.code);
        if (!sent) {
            await deps.User.findByIdAndDelete(created.user._id).catch(() => undefined);
            return otpDeliveryFailure(502, OTP_DELIVERY_FAILED_ERROR);
        }
        return { ok: true, needsName: false };
    }

    const verification = deps.generateEmailVerificationOtp();
    if (!user.displayName) {
        user.displayName = input.displayName;
    }
    setPendingEmailVerification(user, verification);
    user.authProvider = user.authProvider || 'email';
    await user.save();

    const sent = await deps.sendEmailVerificationWithRetry(user, verification.code);
    if (!sent) return otpDeliveryFailure(502, OTP_DELIVERY_FAILED_ERROR);

    return { ok: true, needsName: false };
};

export type VerifiedUserResult = AuthFailure | { ok: true; user: IUser };

/** Checks an OTP sign-in code. On success the email is verified; the route signs the user in. */
export const verifyEmailOtpLogin = async (
    deps: EmailOtpDeps,
    input: { email: string; code: string },
): Promise<VerifiedUserResult> => {
    const emailFailure = validateAuthEmailForIntent(input.email, 'login', deps);
    if (emailFailure) return emailFailure;

    if (!isOtpCode(input.code)) return otpCodeRequiredFailure();

    const user = await findUserByValidOtp(deps, { email: input.email }, input.code);
    if (!user) {
        return authFailure(400, 'OTP is invalid or has expired.', API_ERROR_CODES.OTP_INVALID);
    }

    markEmailVerified(user);
    user.authProvider = user.authProvider || 'email';
    await deps.syncUserRoleFromAllowlist(user);
    await user.save();

    return { ok: true, user };
};

/** Verifies the signed-in user's email with the code they were sent. */
export const verifyCurrentUserEmail = async (
    deps: EmailOtpDeps,
    input: { userId: unknown; code: string },
): Promise<VerifiedUserResult> => {
    if (!isOtpCode(input.code)) return otpCodeRequiredFailure();

    const user = await findUserByValidOtp(deps, { _id: input.userId }, input.code);
    if (!user) {
        return authFailure(400, 'Verification code is invalid or has expired.', API_ERROR_CODES.OTP_INVALID);
    }

    markEmailVerified(user);
    await user.save();

    return { ok: true, user };
};

export type ResendVerificationResult = AuthFailure | { ok: true; user: IUser; alreadyVerified: boolean };

/** Sends the signed-in user a new verification code, unless the email is already verified. */
export const resendEmailVerification = async (
    deps: EmailOtpDeps,
    userId: unknown,
): Promise<ResendVerificationResult> => {
    const user = await deps.User.findById(userId);
    if (!user) return authFailure(404, 'User not found.', API_ERROR_CODES.USER_NOT_FOUND);

    if (deps.isEmailVerified(user)) return { ok: true, user, alreadyVerified: true };

    const verification = deps.generateEmailVerificationOtp();
    setPendingEmailVerification(user, verification);
    await user.save();

    const sent = await deps.sendEmailVerificationWithRetry(user, verification.code);
    if (!sent) return otpDeliveryFailure(502, 'Could not send verification OTP. Please try again.');

    return { ok: true, user, alreadyVerified: false };
};
