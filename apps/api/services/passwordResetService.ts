import type { mergeEmailTemplates, renderEmailTemplate } from '@nexcv/shared/emailTemplateDefaults';
import type UserModel from '../server-models/User';
import type { IUser } from '../server-models/User';
import type { emailGreetingName, hashPassword, hashToken } from '../server-utils/userAuth';
import type { buildBrandedEmailHtml } from './brandedEmail';
import type { sendSystemEmail } from './emailService';
import type { invalidateUserSessions } from './sessionService';

/**
 * Forgot-password flow.
 *
 * A random token goes into the emailed link and only its hash is stored, in
 * `resetPasswordToken`, with `resetPasswordExpires` one hour ahead. Resetting
 * clears the token, so a link works once, and signs out every existing
 * session.
 */

export const PASSWORD_RESET_EXPIRES_MS = 60 * 60 * 1000;
const PASSWORD_RESET_EXPIRES_LABEL = '1 hour';

/** Sent whether or not the email has an account, so the response does not reveal which emails exist. */
export const GENERIC_PASSWORD_RESET_MESSAGE = 'If an account exists for this email, we will send password reset instructions.';

type RandomBytesFactory = (size: number) => { toString(encoding: 'hex'): string };

export interface PasswordResetTokenDeps {
    User: typeof UserModel;
    hashToken: typeof hashToken;
}

export interface PasswordResetEmailDeps extends PasswordResetTokenDeps {
    randomBytes: RandomBytesFactory;
    emailGreetingName: typeof emailGreetingName;
    mergeEmailTemplates: typeof mergeEmailTemplates;
    renderEmailTemplate: typeof renderEmailTemplate;
    buildBrandedEmailHtml: typeof buildBrandedEmailHtml;
    sendSystemEmail: typeof sendSystemEmail;
}

export interface PasswordResetDeps extends PasswordResetTokenDeps {
    hashPassword: typeof hashPassword;
    invalidateUserSessions: typeof invalidateUserSessions;
}

export const findUserByValidPasswordResetToken = (deps: PasswordResetTokenDeps, token: string) => deps.User.findOne({
    resetPasswordToken: deps.hashToken(token),
    resetPasswordExpires: { $gt: new Date() },
});

/**
 * Emails a reset link to the account with this email, if there is one.
 * Returns false when no account matches.
 *
 * If sending fails, the new token is removed again and the send error is
 * rethrown. A token that was never delivered cannot be left usable.
 */
export const sendPasswordResetEmail = async (
    deps: PasswordResetEmailDeps,
    input: { email: string; emailTemplates?: Parameters<typeof mergeEmailTemplates>[0] },
) => {
    const user = await deps.User.findOne({ email: input.email });
    if (!user) return false;

    const token = deps.randomBytes(20).toString('hex');
    const tokenHash = deps.hashToken(token);
    user.resetPasswordToken = tokenHash;
    user.resetPasswordExpires = new Date(Date.now() + PASSWORD_RESET_EXPIRES_MS);
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    const passwordResetTemplate = deps.renderEmailTemplate(
        deps.mergeEmailTemplates(input.emailTemplates).passwordReset,
        {
            name: deps.emailGreetingName(user.displayName),
            resetUrl,
            expiresIn: PASSWORD_RESET_EXPIRES_LABEL,
        }
    );
    const mailOptions = {
        to: user.email,
        subject: passwordResetTemplate.subject,
        text: passwordResetTemplate.text,
        html: await deps.buildBrandedEmailHtml({
            subject: passwordResetTemplate.subject,
            text: passwordResetTemplate.text,
            badge: 'Password reset',
            ctaLabel: 'Reset password',
            ctaUrl: resetUrl,
        }),
    };

    try {
        await deps.sendSystemEmail(mailOptions);
    } catch (emailError) {
        await deps.User.updateOne(
            { _id: user._id, resetPasswordToken: tokenHash },
            { $unset: { resetPasswordToken: '', resetPasswordExpires: '' } }
        );
        throw emailError;
    }

    return true;
};

/**
 * Sets a new password for the account holding this live reset token. Returns
 * null when the token is unknown or expired. The caller checks the password
 * strength first.
 */
export const resetPasswordWithToken = async (
    deps: PasswordResetDeps,
    input: { token: string; newPassword: string },
): Promise<IUser | null> => {
    const user = await findUserByValidPasswordResetToken(deps, input.token);
    if (!user) return null;

    user.passwordHash = deps.hashPassword(input.newPassword);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    deps.invalidateUserSessions(user);
    await user.save();

    return user;
};
