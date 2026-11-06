import { Router, Request, Response, NextFunction } from 'express';
import { API_ERROR_CODES } from '../server-utils/apiErrors';
import type { AppRouteDeps } from '../routeDeps';
import {
    authIntent,
    existingAccountFailure,
    hasAcceptedTerms,
    isAuthFailure,
    normalizeOtpCode,
    validateAuthEmail,
    validateAuthEmailForIntent,
    validateSignupDetails,
    type AuthFailure,
} from '../services/authValidationService';
import {
    createEmailAccount,
    OTP_DELIVERY_FAILED_ERROR,
    resendEmailVerification,
    startEmailOtp,
    verifyCurrentUserEmail,
    verifyEmailOtpLogin,
} from '../services/emailVerificationService';
import {
    consumeOAuthState,
    createOAuthState,
    GITHUB_OAUTH_PROVIDER,
    LINKEDIN_OAUTH_PROVIDER,
    oauthDeniedReason,
    oauthFailureRedirect,
    rememberAuthRedirect,
    resolveOAuthUser,
    takeAuthRedirect,
    type CodeFlowOAuthProvider,
} from '../services/oauthService';
import {
    findUserByValidPasswordResetToken,
    GENERIC_PASSWORD_RESET_MESSAGE,
    resetPasswordWithToken,
    sendPasswordResetEmail,
} from '../services/passwordResetService';
import { loginWithRegeneratedSession, sessionCookieName } from '../services/sessionService';

const sendAuthFailure = (res: Response, failure: AuthFailure) => (
    res.status(failure.status).json({ error: failure.error, code: failure.code })
);

const databaseUnavailable = (res: Response) => res.status(503).json({
    error: 'Database is not connected. Check MongoDB settings and try again.',
    code: API_ERROR_CODES.AUTH_SERVICE_UNAVAILABLE,
});

export type AuthRouteDeps = Pick<AppRouteDeps,
    | 'authLimiter'
    | 'buildBrandedEmailHtml'
    | 'currentUserId'
    | 'CVDocument'
    | 'emailGreetingName'
    | 'emailVerificationAttemptLimiter'
    | 'emailVerificationLimiter'
    | 'generateEmailVerificationOtp'
    | 'hashPassword'
    | 'hashToken'
    | 'invalidateUserSessions'
    | 'isEmailServiceConfigured'
    | 'isEmailVerified'
    | 'isMongoDuplicateKeyError'
    | 'isMongoValidationError'
    | 'isValidEmail'
    | 'markSessionCurrent'
    | 'mergeEmailTemplates'
    | 'mongoose'
    | 'normalizeEmail'
    | 'passport'
    | 'passwordPolicyMessage'
    | 'passwordResetDailyLimiter'
    | 'passwordResetLimiter'
    | 'publicUser'
    | 'randomBytes'
    | 'renderEmailTemplate'
    | 'requireAuth'
    | 'roleForEmail'
    | 'sanitizeDisplayName'
    | 'sanitizeProfileField'
    | 'sendEmailVerificationWithRetry'
    | 'sendError'
    | 'sendNewAccountNotification'
    | 'sendSystemEmail'
    | 'syncUserRoleFromAllowlist'
    | 'User'
    | 'validatePasswordStrength'
    | 'verifyPassword'
>;

export function registerAuthRoutes(router: Router, deps: AuthRouteDeps) {
    const {
        CVDocument,
        User,
        authLimiter,
        currentUserId,
        emailVerificationAttemptLimiter,
        emailVerificationLimiter,
        hashPassword,
        hashToken,
        isEmailServiceConfigured,
        isMongoDuplicateKeyError,
        isMongoValidationError,
        isValidEmail,
        invalidateUserSessions,
        markSessionCurrent,
        mongoose,
        normalizeEmail,
        passport,
        passwordPolicyMessage,
        passwordResetDailyLimiter,
        passwordResetLimiter,
        publicUser,
        randomBytes,
        requireAuth,
        roleForEmail,
        sanitizeDisplayName,
        sanitizeProfileField,
        sendEmailVerificationWithRetry,
        sendError,
        sendNewAccountNotification,
        syncUserRoleFromAllowlist,
        validatePasswordStrength,
        verifyPassword,
    } = deps;

    /** Signs a provider user in on a fresh session and redirects to the saved target. */
    const completeOAuthLogin = (req: Request, res: Response, user: any, onSessionError: NextFunction) => {
        loginWithRegeneratedSession(req, user, onSessionError, () => {
            markSessionCurrent(req, user);
            if (user.wasNewlyCreated) {
                void sendNewAccountNotification(user);
            }
            return res.redirect(takeAuthRedirect(req));
        });
    };

    router.post('/api/auth/signup', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (mongoose.connection.readyState !== 1) return databaseUnavailable(res);

            const details = {
                email: normalizeEmail(req.body.email),
                displayName: sanitizeDisplayName(req.body.displayName),
                phone: sanitizeProfileField(req.body.phone, 40),
                password: typeof req.body.password === 'string' ? req.body.password : '',
                acceptedTerms: hasAcceptedTerms(req.body.acceptedTerms),
            };

            const invalid = validateSignupDetails(details, deps);
            if (invalid) return sendAuthFailure(res, invalid);

            const existingUser = await User.findOne({ email: details.email });
            if (existingUser) return sendAuthFailure(res, existingAccountFailure());

            const { user, code } = await createEmailAccount(deps, details);

            const verificationEmailSent = await sendEmailVerificationWithRetry(user, code);
            void sendNewAccountNotification(user);

            loginWithRegeneratedSession(req, user, next, () => {
                markSessionCurrent(req, user);
                return res.status(201).json({
                    user: publicUser(user),
                    message: verificationEmailSent
                        ? 'Account created. Enter the OTP sent to your email to verify your account.'
                        : 'Account created, but verification OTP could not be sent. Try resend verification.',
                });
            });
        } catch (error) {
            if (isMongoDuplicateKeyError(error)) {
                return res.status(400).json({
                    error: 'Could not create your account. Please check your details and try again.',
                    code: API_ERROR_CODES.VALIDATION_FAILED,
                });
            }

            if (isMongoValidationError(error)) {
                return res.status(400).json({
                    error: 'Please check your signup details and try again.',
                    code: API_ERROR_CODES.VALIDATION_FAILED,
                });
            }

            return sendError(res, 500, 'Could not create your account.', error, API_ERROR_CODES.AUTH_OPERATION_FAILED);
        }
    });


    router.post('/api/auth/login', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
        try {
            const email = normalizeEmail(req.body.email);
            const password = typeof req.body.password === 'string' ? req.body.password : '';

            const emailError = validateAuthEmail(email, isValidEmail);
            if (emailError || !password) {
                return res.status(400).json({
                    error: emailError || 'Enter your email and password.',
                    code: API_ERROR_CODES.VALIDATION_FAILED,
                });
            }

            const user = await User.findOne({ email });
            if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
                return res.status(401).json({
                    error: 'Email or password is incorrect.',
                    code: API_ERROR_CODES.INVALID_CREDENTIALS,
                });
            }

            await syncUserRoleFromAllowlist(user);

            loginWithRegeneratedSession(req, user, next, () => {
                markSessionCurrent(req, user);
                return res.json({ user: publicUser(user) });
            });
        } catch (error) {
            return sendError(res, 500, 'Could not sign you in.', error, API_ERROR_CODES.AUTH_OPERATION_FAILED);
        }
    });


    router.post('/api/auth/email/check', authLimiter, async (req: Request, res: Response) => {
        try {
            const email = normalizeEmail(req.body.email);
            const intent = authIntent(req.body.intent);

            const invalid = validateAuthEmailForIntent(email, intent, deps);
            if (invalid) return sendAuthFailure(res, invalid);

            const user = await User.findOne({ email });
            if (intent === 'signup' && user) return sendAuthFailure(res, existingAccountFailure());

            return res.json({ exists: Boolean(user), method: user?.passwordHash ? 'password' : 'otp' });
        } catch (error) {
            return sendError(res, 500, 'Could not check this email.', error, API_ERROR_CODES.AUTH_OPERATION_FAILED);
        }
    });


    router.post('/api/auth/email/start', emailVerificationLimiter, async (req: Request, res: Response) => {
        try {
            if (mongoose.connection.readyState !== 1) return databaseUnavailable(res);

            if (!isEmailServiceConfigured()) {
                return res.status(503).json({
                    error: OTP_DELIVERY_FAILED_ERROR,
                    code: API_ERROR_CODES.OTP_DELIVERY_FAILED,
                });
            }

            const result = await startEmailOtp(deps, {
                email: normalizeEmail(req.body.email),
                displayName: sanitizeDisplayName(req.body.displayName),
                password: typeof req.body.password === 'string' ? req.body.password : '',
                acceptedTerms: hasAcceptedTerms(req.body.acceptedTerms),
                intent: authIntent(req.body.intent),
            });

            if (isAuthFailure(result)) return sendAuthFailure(res, result);
            if (result.needsName) return res.json({ needsName: true });

            return res.json({
                needsName: false,
                message: 'OTP sent. Please check your email.',
            });
        } catch (error) {
            if (isMongoDuplicateKeyError(error)) {
                return res.status(409).json({
                    error: 'Could not start email login. Please try again.',
                    code: API_ERROR_CODES.AUTH_OPERATION_FAILED,
                });
            }

            if (isMongoValidationError(error)) {
                return res.status(400).json({
                    error: 'Please check your details and try again.',
                    code: API_ERROR_CODES.VALIDATION_FAILED,
                });
            }

            return sendError(res, 500, 'Could not start email login.', error, API_ERROR_CODES.AUTH_OPERATION_FAILED);
        }
    });


    router.post('/api/auth/email/verify', emailVerificationAttemptLimiter, async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await verifyEmailOtpLogin(deps, {
                email: normalizeEmail(req.body.email),
                code: normalizeOtpCode(req.body.code),
            });
            if (isAuthFailure(result)) return sendAuthFailure(res, result);

            const { user } = result;
            loginWithRegeneratedSession(req, user, next, () => {
                markSessionCurrent(req, user);
                return res.json({ user: publicUser(user), message: 'Logged in successfully.' });
            });
        } catch (error) {
            return sendError(res, 500, 'Could not verify OTP.', error, API_ERROR_CODES.AUTH_OPERATION_FAILED);
        }
    });


    router.patch('/api/auth/profile', requireAuth, async (req: Request, res: Response) => {
        try {
            const displayName = sanitizeDisplayName(req.body.displayName);
            const profileImage = typeof req.body.profileImage === 'string' ? req.body.profileImage.trim() : '';
            const phone = sanitizeProfileField(req.body.phone, 40);
            const address = sanitizeProfileField(req.body.address, 220);
            const dob = sanitizeProfileField(req.body.dob, 30);
            const gender = sanitizeProfileField(req.body.gender, 40);
            const nationality = sanitizeProfileField(req.body.nationality, 80);

            if (!displayName) {
                return res.status(400).json({ error: 'Enter your name.', code: API_ERROR_CODES.VALIDATION_FAILED });
            }

            if (profileImage && profileImage.length > 2 * 1024 * 1024) {
                return res.status(400).json({
                    error: 'Profile image is too large.',
                    code: API_ERROR_CODES.VALIDATION_FAILED,
                });
            }

            if (profileImage && !profileImage.startsWith('data:image/') && !profileImage.startsWith('https://')) {
                return res.status(400).json({
                    error: 'Profile image format is not supported.',
                    code: API_ERROR_CODES.VALIDATION_FAILED,
                });
            }

            const user = await User.findByIdAndUpdate(
                currentUserId(req),
                { displayName, profileImage, phone, address, dob, gender, nationality },
                { returnDocument: 'after', runValidators: true }
            );

            if (!user) {
                return res.status(404).json({ error: 'User not found.', code: API_ERROR_CODES.USER_NOT_FOUND });
            }

            res.json({ user: publicUser(user) });
        } catch (error) {
            return sendError(res, 500, 'Could not update your profile.', error, API_ERROR_CODES.AUTH_OPERATION_FAILED);
        }
    });


    router.patch('/api/auth/password', requireAuth, async (req: Request, res: Response) => {
        try {
            const currentPassword = typeof req.body.currentPassword === 'string' ? req.body.currentPassword : '';
            const newPassword = typeof req.body.newPassword === 'string' ? req.body.newPassword : '';

            if (!validatePasswordStrength(newPassword)) {
                return res.status(400).json({ error: passwordPolicyMessage, code: API_ERROR_CODES.PASSWORD_INVALID });
            }

            const user = await User.findById(currentUserId(req));
            if (!user) {
                return res.status(404).json({ error: 'User not found.', code: API_ERROR_CODES.USER_NOT_FOUND });
            }

            if (!user.passwordHash) {
                return res.status(400).json({
                    error: 'This account does not have a password yet. Use forgot password to create one securely.',
                    code: API_ERROR_CODES.PASSWORD_NOT_CONFIGURED,
                });
            }

            if (!verifyPassword(currentPassword, user.passwordHash)) {
                return res.status(401).json({
                    error: 'Current password is incorrect.',
                    code: API_ERROR_CODES.CURRENT_PASSWORD_INVALID,
                });
            }

            // Bumping the session version signs out every other session; this one is re-marked current.
            user.passwordHash = hashPassword(newPassword);
            user.authProvider = user.authProvider || 'email';
            invalidateUserSessions(user);
            await user.save();
            markSessionCurrent(req, user);

            res.json({ message: 'Password updated successfully.' });
        } catch (error) {
            return sendError(res, 500, 'Could not update your password.', error, API_ERROR_CODES.AUTH_OPERATION_FAILED);
        }
    });


    router.delete('/api/auth/account', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = currentUserId(req);
            await CVDocument.deleteMany({ userId });
            await User.findByIdAndDelete(userId);

            req.logout((err) => {
                if (err) return next(err);
                req.session.destroy(() => {
                    res.clearCookie(sessionCookieName());
                    res.json({ message: 'Account deleted successfully.' });
                });
            });
        } catch (error) {
            return sendError(res, 500, 'Could not delete your account.', error, API_ERROR_CODES.AUTH_OPERATION_FAILED);
        }
    });


    router.post('/api/auth/forgot-password', passwordResetLimiter, passwordResetDailyLimiter, async (req: Request, res: Response) => {
        try {
            const email = normalizeEmail(req.body.email);
            const emailError = validateAuthEmail(email, isValidEmail);
            if (emailError) {
                return res.status(400).json({ error: emailError, code: API_ERROR_CODES.VALIDATION_FAILED });
            }

            if (!isEmailServiceConfigured()) {
                return res.status(503).json({
                    error: 'Email service is not configured.',
                    code: API_ERROR_CODES.AUTH_SERVICE_UNAVAILABLE,
                });
            }

            await sendPasswordResetEmail(deps, {
                email,
                emailTemplates: (req as any).appSettings?.emailTemplates,
            });

            res.json({ message: GENERIC_PASSWORD_RESET_MESSAGE });
        } catch (error) {
            return sendError(res, 500, 'Could not send reset password email.', error, API_ERROR_CODES.PASSWORD_RESET_FAILED);
        }
    });


    router.post('/api/auth/validate-reset-token', authLimiter, async (req: Request, res: Response) => {
        try {
            const token = typeof req.body.token === 'string' ? req.body.token : '';

            if (!token) {
                return res.status(400).json({
                    error: 'Password reset token is missing.',
                    code: API_ERROR_CODES.PASSWORD_RESET_TOKEN_INVALID,
                });
            }

            const user = await findUserByValidPasswordResetToken(deps, token).select('_id');
            if (!user) {
                return res.status(400).json({
                    error: 'Password reset token is invalid or has expired.',
                    code: API_ERROR_CODES.PASSWORD_RESET_TOKEN_INVALID,
                });
            }

            res.json({ valid: true });
        } catch (error) {
            return sendError(res, 500, 'Could not validate password reset token.', error, API_ERROR_CODES.PASSWORD_RESET_FAILED);
        }
    });


    router.post('/api/auth/reset-password', authLimiter, async (req: Request, res: Response) => {
        try {
            const token = req.body.token;
            const newPassword = typeof req.body.password === 'string' ? req.body.password : '';

            if (!token) {
                return res.status(400).json({
                    error: 'Password reset token is missing.',
                    code: API_ERROR_CODES.PASSWORD_RESET_TOKEN_INVALID,
                });
            }

            if (!validatePasswordStrength(newPassword)) {
                return res.status(400).json({ error: passwordPolicyMessage, code: API_ERROR_CODES.PASSWORD_INVALID });
            }

            const user = await resetPasswordWithToken(deps, { token, newPassword });
            if (!user) {
                return res.status(400).json({
                    error: 'Password reset token is invalid or has expired.',
                    code: API_ERROR_CODES.PASSWORD_RESET_TOKEN_INVALID,
                });
            }

            res.json({ message: 'Password has been successfully reset.' });
        } catch (error) {
            return sendError(res, 500, 'Could not reset password.', error, API_ERROR_CODES.PASSWORD_RESET_FAILED);
        }
    });


    router.post('/api/auth/verify-email', requireAuth, emailVerificationAttemptLimiter, async (req: Request, res: Response) => {
        try {
            const result = await verifyCurrentUserEmail(deps, {
                userId: currentUserId(req),
                code: normalizeOtpCode(req.body.code),
            });
            if (isAuthFailure(result)) return sendAuthFailure(res, result);

            return res.json({ user: publicUser(result.user), message: 'Email verified successfully.' });
        } catch (error) {
            return sendError(res, 500, 'Could not verify email.', error, API_ERROR_CODES.AUTH_OPERATION_FAILED);
        }
    });


    router.post('/api/auth/resend-verification', requireAuth, emailVerificationLimiter, async (req: Request, res: Response) => {
        try {
            const result = await resendEmailVerification(deps, currentUserId(req));
            if (isAuthFailure(result)) return sendAuthFailure(res, result);

            return res.json({
                user: publicUser(result.user),
                message: result.alreadyVerified
                    ? 'Email is already verified.'
                    : 'Verification OTP sent. Please check your inbox.',
            });
        } catch (error) {
            return sendError(res, 500, 'Could not send verification OTP.', error, API_ERROR_CODES.AUTH_OPERATION_FAILED);
        }
    });


    router.get('/api/auth/google', (req: Request, _res: Response, next: NextFunction) => {
        rememberAuthRedirect(req);
        (req as any).googleOAuthState = createOAuthState(req, 'google', randomBytes, hashToken);
        next();
    }, (req: Request, res: Response, next: NextFunction) => passport.authenticate('google', {
        scope: ['profile', 'email'],
        state: (req as any).googleOAuthState,
    })(req, res, next));

    router.get('/api/auth/google/callback', (req: Request, res: Response, next: NextFunction) => {
        if (!consumeOAuthState(req, 'google', req.query.state, hashToken)) {
            console.warn('Google Auth callback rejected: invalid OAuth state');
            return res.redirect(oauthFailureRedirect('invalid_state'));
        }

        passport.authenticate('google', (err: any, user: any, info: any) => {
            if (err) {
                console.error('Google Auth callback error:', err?.message || err);
                return res.redirect(oauthFailureRedirect('server_error'));
            }
            if (!user) {
                console.warn('Google Auth failed:', info?.message || 'No user returned');
                return res.redirect(oauthFailureRedirect(oauthDeniedReason(info)));
            }
            completeOAuthLogin(req, res, user, (loginErr) => {
                console.error('Google Auth session error:', loginErr?.message || loginErr);
                return res.redirect(oauthFailureRedirect('session_error'));
            });
        })(req, res, next);
    });

    // Registers GET /api/auth/<provider> and GET /api/auth/<provider>/callback.
    const registerCodeFlowProvider = (provider: CodeFlowOAuthProvider) => {
        router.get(`/api/auth/${provider.key}`, (req: Request, res: Response) => {
            const config = provider.config();
            if (!config) {
                console.warn(`${provider.label} Auth variables missing in .env. ${provider.label} login is not available.`);
                return res.redirect(oauthFailureRedirect(`${provider.key}_not_configured`));
            }

            rememberAuthRedirect(req);
            const state = createOAuthState(req, provider.key, randomBytes, hashToken);
            return res.redirect(provider.authorizeUrl(config, provider.callbackUrl(req), state));
        });

        router.get(`/api/auth/${provider.key}/callback`, async (req: Request, res: Response, next: NextFunction) => {
            try {
                if (!consumeOAuthState(req, provider.key, req.query.state, hashToken)) {
                    console.warn(`${provider.label} Auth callback rejected: invalid OAuth state`);
                    return res.redirect(oauthFailureRedirect('invalid_state'));
                }

                const config = provider.config();
                const code = typeof req.query.code === 'string' ? req.query.code : '';
                if (!config || !code) {
                    return res.redirect(oauthFailureRedirect('denied'));
                }

                const identity = await provider.fetchIdentity(config, code, provider.callbackUrl(req), deps);
                if (!identity) return res.redirect(oauthFailureRedirect('server_error'));

                const result = await resolveOAuthUser(deps, identity);
                if ('info' in result) {
                    return res.redirect(oauthFailureRedirect(oauthDeniedReason(result.info)));
                }

                completeOAuthLogin(req, res, result.user, next);
            } catch (error) {
                console.error(`${provider.label} Auth callback error:`, error instanceof Error ? error.message : error);
                return res.redirect(oauthFailureRedirect('server_error'));
            }
        });
    };

    registerCodeFlowProvider(GITHUB_OAUTH_PROVIDER);
    registerCodeFlowProvider(LINKEDIN_OAUTH_PROVIDER);


    router.get('/api/auth/current-user', async (req: Request, res: Response) => {
        try {
            if (req.isAuthenticated() && req.user) {
                await syncUserRoleFromAllowlist(req.user as any);
                return res.json({ user: publicUser(req.user) });
            }
            return res.status(401).json({ error: 'Not authenticated', code: API_ERROR_CODES.AUTH_REQUIRED });
        } catch (error) {
            return sendError(res, 500, 'Could not load current user.', error, API_ERROR_CODES.AUTH_OPERATION_FAILED);
        }
    });


    router.post('/api/auth/logout', (req: Request, res: Response, next: NextFunction) => {
        req.logout((err) => {
            if (err) { return next(err); }
            req.session.destroy((destroyError) => {
                if (destroyError) return next(destroyError);
                res.clearCookie(sessionCookieName());
                res.json({ message: 'Logged out successfully' });
            });
        });
    });
}
