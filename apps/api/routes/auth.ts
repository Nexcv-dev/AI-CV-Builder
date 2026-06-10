import express, { Router, Request, Response, NextFunction } from 'express';
import { bindDeps } from './_shared';
import { validateAuthEmail } from '../services/authValidationService';

type RouteDeps = Record<string, any>;

const loginWithRegeneratedSession = (
    req: Request,
    user: any,
    next: NextFunction,
    onSuccess: () => void,
) => {
    const authRedirect = (req.session as any)?.authRedirect;

    req.session.regenerate((regenerateErr) => {
        if (regenerateErr) return next(regenerateErr);

        if (authRedirect) {
            (req.session as any).authRedirect = authRedirect;
        }

        req.login(user, (loginErr) => {
            if (loginErr) return next(loginErr);
            return onSuccess();
        });
    });
};

const GOOGLE_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const GITHUB_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const LINKEDIN_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

type TokenHasher = (value: string) => string;
type RandomBytesFactory = (size: number) => { toString(encoding: 'hex'): string };

const createGoogleOAuthState = (
    req: Request,
    randomBytes: RandomBytesFactory,
    hashToken: TokenHasher,
) => {
    const state = randomBytes(32).toString('hex');
    (req.session as any).googleOAuthState = {
        value: hashToken(state),
        createdAt: Date.now(),
    };
    return state;
};

const consumeGoogleOAuthState = (
    req: Request,
    state: unknown,
    hashToken: TokenHasher,
) => {
    const stored = (req.session as any)?.googleOAuthState;
    delete (req.session as any).googleOAuthState;

    if (!stored || typeof state !== 'string' || !state) return false;
    if (typeof stored.createdAt !== 'number' || Date.now() - stored.createdAt > GOOGLE_OAUTH_STATE_TTL_MS) {
        return false;
    }

    return stored.value === hashToken(state);
};

const createLinkedInOAuthState = (
    req: Request,
    randomBytes: RandomBytesFactory,
    hashToken: TokenHasher,
) => {
    const state = randomBytes(32).toString('hex');
    (req.session as any).linkedinOAuthState = {
        value: hashToken(state),
        createdAt: Date.now(),
    };
    return state;
};

const consumeLinkedInOAuthState = (
    req: Request,
    state: unknown,
    hashToken: TokenHasher,
) => {
    const stored = (req.session as any)?.linkedinOAuthState;
    delete (req.session as any).linkedinOAuthState;

    if (!stored || typeof state !== 'string' || !state) return false;
    if (typeof stored.createdAt !== 'number' || Date.now() - stored.createdAt > LINKEDIN_OAUTH_STATE_TTL_MS) {
        return false;
    }

    return stored.value === hashToken(state);
};

const createGitHubOAuthState = (
    req: Request,
    randomBytes: RandomBytesFactory,
    hashToken: TokenHasher,
) => {
    const state = randomBytes(32).toString('hex');
    (req.session as any).githubOAuthState = {
        value: hashToken(state),
        createdAt: Date.now(),
    };
    return state;
};

const consumeGitHubOAuthState = (
    req: Request,
    state: unknown,
    hashToken: TokenHasher,
) => {
    const stored = (req.session as any)?.githubOAuthState;
    delete (req.session as any).githubOAuthState;

    if (!stored || typeof state !== 'string' || !state) return false;
    if (typeof stored.createdAt !== 'number' || Date.now() - stored.createdAt > GITHUB_OAUTH_STATE_TTL_MS) {
        return false;
    }

    return stored.value === hashToken(state);
};

const authRedirectForNextTarget = (nextTarget: unknown) =>
    nextTarget === 'download' ? '/builder?download=1' :
        nextTarget === 'builder' ? '/builder' :
            nextTarget === 'dashboard' ? '/dashboard' :
                nextTarget === 'my-cvs' ? '/my-cvs' :
                    nextTarget === 'profile' ? '/profile' :
                        nextTarget === 'admin' ? '/admin' :
                            '/builder?import=1';

const linkedinCallbackUrl = (req: Request) => {
    const configured = process.env.LINKEDIN_REDIRECT_URI?.trim();
    if (configured) return configured;
    const frontendUrl = process.env.FRONTEND_URL?.replace(/\/+$/, '');
    if (frontendUrl) return `${frontendUrl}/api/auth/linkedin/callback`;
    return `${req.protocol}://${req.get('host')}/api/auth/linkedin/callback`;
};

const linkedinConfig = () => {
    const clientId = process.env.LINKEDIN_CLIENT_ID?.trim();
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET?.trim();
    return clientId && clientSecret ? { clientId, clientSecret } : null;
};

const githubCallbackUrl = (req: Request) => {
    const configured = (process.env.GITHUB_CALLBACK_URL || process.env.GITHUB_REDIRECT_URI || '').trim();
    if (configured) return configured;
    const frontendUrl = process.env.FRONTEND_URL?.replace(/\/+$/, '');
    if (frontendUrl) return `${frontendUrl}/api/auth/github/callback`;
    return `${req.protocol}://${req.get('host')}/api/auth/github/callback`;
};

const githubConfig = () => {
    const clientId = process.env.GITHUB_CLIENT_ID?.trim();
    const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();
    return clientId && clientSecret ? { clientId, clientSecret } : null;
};

const safeLinkedInImage = (value: unknown) => {
    const image = typeof value === 'string' ? value.trim() : '';
    return image.startsWith('https://') ? image : '';
};

const resolveLinkedInOAuthUser = async ({
    User,
    roleForEmail,
    syncUserRoleFromAllowlist,
    normalizeEmail,
    sanitizeDisplayName,
    profile,
}: {
    User: any;
    roleForEmail: (email: string) => string;
    syncUserRoleFromAllowlist: (user: any) => Promise<any>;
    normalizeEmail: (email: unknown) => string;
    sanitizeDisplayName: (value: unknown) => string;
    profile: Record<string, any>;
}) => {
    const linkedinId = typeof profile.sub === 'string' ? profile.sub.trim() : '';
    const email = normalizeEmail(profile.email);
    const displayName = sanitizeDisplayName(profile.name || [profile.given_name, profile.family_name].filter(Boolean).join(' '));
    const profileImage = safeLinkedInImage(profile.picture);

    if (!linkedinId) throw new Error('LinkedIn account did not provide an account id.');
    if (!email) throw new Error('LinkedIn account did not provide an email address.');
    if (!displayName) throw new Error('LinkedIn account did not provide a display name.');

    let user = await User.findOne({ linkedinId });
    if (user) {
        if (profileImage && user.profileImage !== profileImage) {
            user.profileImage = profileImage;
        }
        if (!user.emailVerified) {
            user.emailVerified = true;
            user.emailVerificationToken = undefined;
            user.emailVerificationExpires = undefined;
        }
        await syncUserRoleFromAllowlist(user);
        await user.save();
        return { user };
    }

    user = await User.findOne({ email });
    if (user) {
        return {
            user: null,
            info: { message: 'A NexCV account already exists for this email. Sign in with email first.' },
        };
    }

    user = await User.create({
        linkedinId,
        displayName,
        email,
        profileImage,
        role: roleForEmail(email),
        emailVerified: true,
        authProvider: 'linkedin',
    });
    (user as any).wasNewlyCreated = true;

    return { user };
};

const primaryGitHubEmail = (profile: Record<string, any>, emails: any[], normalizeEmail: (email: unknown) => string) => {
    const profileEmail = normalizeEmail(profile.email);
    if (profileEmail) return profileEmail;

    const primaryVerified = emails.find((item) => item?.primary && item?.verified && item?.email);
    const anyVerified = emails.find((item) => item?.verified && item?.email);
    return normalizeEmail(primaryVerified?.email || anyVerified?.email);
};

const resolveGitHubOAuthUser = async ({
    User,
    roleForEmail,
    syncUserRoleFromAllowlist,
    normalizeEmail,
    sanitizeDisplayName,
    profile,
    emails,
}: {
    User: any;
    roleForEmail: (email: string) => string;
    syncUserRoleFromAllowlist: (user: any) => Promise<any>;
    normalizeEmail: (email: unknown) => string;
    sanitizeDisplayName: (value: unknown) => string;
    profile: Record<string, any>;
    emails: any[];
}) => {
    const githubId = profile.id ? String(profile.id).trim() : '';
    const email = primaryGitHubEmail(profile, emails, normalizeEmail);
    const displayName = sanitizeDisplayName(profile.name || profile.login);
    const profileImage = safeLinkedInImage(profile.avatar_url);

    if (!githubId) throw new Error('GitHub account did not provide an account id.');
    if (!email) throw new Error('GitHub account did not provide a verified email address.');
    if (!displayName) throw new Error('GitHub account did not provide a display name.');

    let user = await User.findOne({ githubId });
    if (user) {
        if (profileImage && user.profileImage !== profileImage) {
            user.profileImage = profileImage;
        }
        if (!user.emailVerified) {
            user.emailVerified = true;
            user.emailVerificationToken = undefined;
            user.emailVerificationExpires = undefined;
        }
        await syncUserRoleFromAllowlist(user);
        await user.save();
        return { user };
    }

    user = await User.findOne({ email });
    if (user) {
        return {
            user: null,
            info: { message: 'A NexCV account already exists for this email. Sign in with email first.' },
        };
    }

    user = await User.create({
        githubId,
        displayName,
        email,
        profileImage,
        role: roleForEmail(email),
        emailVerified: true,
        authProvider: 'github',
    });
    (user as any).wasNewlyCreated = true;

    return { user };
};

const genericSignupError = 'Could not create your account. Please check your details and try again.';
const existingAccountSignupError = 'An account already exists for this email. Please log in instead.';
const genericPasswordResetMessage = 'If an account exists for this email, we will send password reset instructions.';

export function registerAuthRoutes(router: Router, deps: RouteDeps) {
    const {
        CVDocument,
        User,
        authLimiter,
        currentUserId,
        emailGreetingName,
        emailVerificationAttemptLimiter,
        emailVerificationLimiter,
        generateEmailVerificationOtp,
        hashPassword,
        hashToken,
        isEmailVerified,
        isEmailServiceConfigured,
        isMongoDuplicateKeyError,
        isMongoValidationError,
        isValidEmail,
        invalidateUserSessions,
        markSessionCurrent,
        mergeEmailTemplates,
        mongoose,
        normalizeEmail,
        normalizeEmailFrom,
        buildBrandedEmailHtml,
        passport,
        passwordPolicyMessage,
        passwordResetDailyLimiter,
        passwordResetLimiter,
        publicUser,
        randomBytes,
        renderEmailTemplate,
        requireAuth,
        roleForEmail,
        sanitizeDisplayName,
        sanitizeProfileField,
        sendAppEmail,
        sendSystemEmail,
        sendEmailVerificationWithRetry,
        sendError,
        sendNewAccountNotification,
        syncUserRoleFromAllowlist,
        validatePasswordStrength,
        verifyPassword,
    } = bindDeps(deps);

    router.post('/api/auth/signup', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (mongoose.connection.readyState !== 1) {
                return res.status(503).json({ error: 'Database is not connected. Check MongoDB settings and try again.' });
            }
    
            const email = normalizeEmail(req.body.email);
            const displayName = sanitizeDisplayName(req.body.displayName);
            const phone = sanitizeProfileField(req.body.phone, 40);
            const password = typeof req.body.password === 'string' ? req.body.password : '';
            const acceptedTerms = req.body.acceptedTerms === true || req.body.acceptedTerms === 'true';
    
            const emailError = validateAuthEmail(email, isValidEmail);
            if (emailError) {
                return res.status(400).json({ error: emailError });
            }

            if (roleForEmail(email) !== 'user') {
                return res.status(400).json({ error: genericSignupError });
            }
    
            if (!displayName) {
                return res.status(400).json({ error: 'Enter your name.' });
            }

            if (!phone) {
                return res.status(400).json({ error: 'Enter your contact number.' });
            }

            if (!acceptedTerms) {
                return res.status(400).json({ error: 'Please accept the Terms and Privacy Policy to create your account.' });
            }
    
            if (!validatePasswordStrength(password)) {
                return res.status(400).json({ error: passwordPolicyMessage });
            }
    
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(409).json({ error: existingAccountSignupError, code: 'account_exists' });
            }
    
            const verification = generateEmailVerificationOtp();
            const user = await User.create({
                email,
                displayName,
                phone,
                passwordHash: hashPassword(password),
                role: roleForEmail(email),
                termsAcceptedAt: new Date(),
                emailVerified: false,
                emailVerificationToken: verification.codeHash,
                emailVerificationExpires: verification.expires,
                authProvider: 'email',
            });
    
            const verificationEmailSent = await sendEmailVerificationWithRetry(user, verification.code);
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
                return res.status(400).json({ error: genericSignupError });
            }
    
            if (isMongoValidationError(error)) {
                return res.status(400).json({ error: 'Please check your signup details and try again.' });
            }
    
            return sendError(res, 500, 'Could not create your account.', error);
        }
    });


    router.post('/api/auth/login', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
        try {
            const email = normalizeEmail(req.body.email);
            const password = typeof req.body.password === 'string' ? req.body.password : '';
    
            const emailError = validateAuthEmail(email, isValidEmail);
            if (emailError || !password) {
                return res.status(400).json({ error: emailError || 'Enter your email and password.' });
            }
    
            const user = await User.findOne({ email });
            if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
                return res.status(401).json({ error: 'Email or password is incorrect.' });
            }
    
            await syncUserRoleFromAllowlist(user);
    
            loginWithRegeneratedSession(req, user, next, () => {
                markSessionCurrent(req, user);
                return res.json({ user: publicUser(user) });
            });
        } catch (error) {
            return sendError(res, 500, 'Could not sign you in.', error);
        }
    });


    router.post('/api/auth/email/check', authLimiter, async (req: Request, res: Response) => {
        try {
            const email = normalizeEmail(req.body.email);
            const intent = req.body.intent === 'signup' ? 'signup' : 'login';

            const emailError = validateAuthEmail(email, isValidEmail);
            if (emailError) {
                return res.status(400).json({ error: emailError });
            }

            if (intent === 'signup' && roleForEmail(email) !== 'user') {
                return res.status(400).json({ error: genericSignupError });
            }

            const user = await User.findOne({ email });
            if (intent === 'signup' && user) {
                return res.status(409).json({ error: existingAccountSignupError, code: 'account_exists' });
            }

            return res.json({ exists: Boolean(user), method: user?.passwordHash ? 'password' : 'otp' });
        } catch (error) {
            return sendError(res, 500, 'Could not check this email.', error);
        }
    });


    router.post('/api/auth/email/start', emailVerificationLimiter, async (req: Request, res: Response) => {
        try {
            if (mongoose.connection.readyState !== 1) {
                return res.status(503).json({ error: 'Database is not connected. Check MongoDB settings and try again.' });
            }

            if (!isEmailServiceConfigured()) {
                return res.status(503).json({ error: 'We could not send your OTP right now. Please try again in a few minutes.' });
            }

            const email = normalizeEmail(req.body.email);
            const displayName = sanitizeDisplayName(req.body.displayName);
            const password = typeof req.body.password === 'string' ? req.body.password : '';
            const acceptedTerms = req.body.acceptedTerms === true || req.body.acceptedTerms === 'true';
            const intent = req.body.intent === 'signup' ? 'signup' : 'login';

            const emailError = validateAuthEmail(email, isValidEmail);
            if (emailError) {
                return res.status(400).json({ error: emailError });
            }

            if (intent === 'signup' && roleForEmail(email) !== 'user') {
                return res.status(400).json({ error: genericSignupError });
            }

            let user = await User.findOne({ email });
            const isNewUser = !user;

            if (intent === 'signup' && user) {
                return res.status(409).json({ error: existingAccountSignupError, code: 'account_exists' });
            }

            if (!displayName && isNewUser) {
                return res.json({ needsName: true });
            }

            if (isNewUser && !acceptedTerms) {
                return res.status(400).json({ error: 'Please accept the Terms and Privacy Policy to create your account.' });
            }

            if ((isNewUser || (intent === 'signup' && !user?.passwordHash)) && !validatePasswordStrength(password)) {
                return res.status(400).json({ error: passwordPolicyMessage });
            }

            const verification = generateEmailVerificationOtp();

            if (!user) {
                user = await User.create({
                    email,
                    displayName,
                    role: roleForEmail(email),
                    passwordHash: hashPassword(password),
                    termsAcceptedAt: new Date(),
                    emailVerified: false,
                    emailVerificationToken: verification.codeHash,
                    emailVerificationExpires: verification.expires,
                    authProvider: 'email',
                });
                void sendNewAccountNotification(user);
            } else {
                if (!user.displayName) {
                    user.displayName = displayName;
                }
                user.emailVerificationToken = verification.codeHash;
                user.emailVerificationExpires = verification.expires;
                user.authProvider = user.authProvider || 'email';
                if (intent === 'signup' && validatePasswordStrength(password)) {
                    user.passwordHash = hashPassword(password);
                }
                await user.save();
            }

            const verificationEmailSent = await sendEmailVerificationWithRetry(user, verification.code);
            if (!verificationEmailSent) {
                if (isNewUser) {
                    await User.findByIdAndDelete(user._id).catch(() => undefined);
                }
                return res.status(502).json({ error: 'We could not send your OTP right now. Please try again in a few minutes.' });
            }

            return res.json({
                needsName: false,
                message: 'OTP sent. Please check your email.',
            });
        } catch (error) {
            if (isMongoDuplicateKeyError(error)) {
                return res.status(409).json({ error: 'Could not start email login. Please try again.' });
            }

            if (isMongoValidationError(error)) {
                return res.status(400).json({ error: 'Please check your details and try again.' });
            }

            return sendError(res, 500, 'Could not start email login.', error);
        }
    });


    router.post('/api/auth/email/verify', emailVerificationAttemptLimiter, async (req: Request, res: Response, next: NextFunction) => {
        try {
            const email = normalizeEmail(req.body.email);
            const code = typeof req.body.code === 'string' ? req.body.code.replace(/\D/g, '') : '';

            const emailError = validateAuthEmail(email, isValidEmail);
            if (emailError) {
                return res.status(400).json({ error: emailError });
            }

            if (!/^\d{6}$/.test(code)) {
                return res.status(400).json({ error: 'Enter the 6-digit verification code.' });
            }

            const user = await User.findOne({
                email,
                emailVerificationToken: hashToken(code),
                emailVerificationExpires: { $gt: new Date() },
            });

            if (!user) {
                return res.status(400).json({ error: 'OTP is invalid or has expired.' });
            }

            user.emailVerified = true;
            user.emailVerificationToken = undefined;
            user.emailVerificationExpires = undefined;
            user.authProvider = user.authProvider || 'email';
            await syncUserRoleFromAllowlist(user);
            await user.save();

            loginWithRegeneratedSession(req, user, next, () => {
                markSessionCurrent(req, user);
                return res.json({ user: publicUser(user), message: 'Logged in successfully.' });
            });
        } catch (error) {
            return sendError(res, 500, 'Could not verify OTP.', error);
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
                return res.status(400).json({ error: 'Enter your name.' });
            }
    
            if (profileImage && profileImage.length > 2 * 1024 * 1024) {
                return res.status(400).json({ error: 'Profile image is too large.' });
            }
    
            if (profileImage && !profileImage.startsWith('data:image/') && !profileImage.startsWith('https://')) {
                return res.status(400).json({ error: 'Profile image format is not supported.' });
            }
    
            const user = await User.findByIdAndUpdate(
                currentUserId(req),
                { displayName, profileImage, phone, address, dob, gender, nationality },
                { new: true, runValidators: true }
            );
    
            if (!user) {
                return res.status(404).json({ error: 'User not found.' });
            }
    
            res.json({ user: publicUser(user) });
        } catch (error) {
            return sendError(res, 500, 'Could not update your profile.', error);
        }
    });


    router.patch('/api/auth/password', requireAuth, async (req: Request, res: Response) => {
        try {
            const currentPassword = typeof req.body.currentPassword === 'string' ? req.body.currentPassword : '';
            const newPassword = typeof req.body.newPassword === 'string' ? req.body.newPassword : '';
    
            if (!validatePasswordStrength(newPassword)) {
                return res.status(400).json({ error: passwordPolicyMessage });
            }
    
            const user = await User.findById(currentUserId(req));
            if (!user) {
                return res.status(404).json({ error: 'User not found.' });
            }
    
            if (!user.passwordHash) {
                return res.status(400).json({ error: 'This account does not have a password yet. Use forgot password to create one securely.' });
            }

            if (!verifyPassword(currentPassword, user.passwordHash)) {
                return res.status(401).json({ error: 'Current password is incorrect.' });
            }
    
            user.passwordHash = hashPassword(newPassword);
            user.authProvider = user.authProvider || 'email';
            invalidateUserSessions(user);
            await user.save();
            markSessionCurrent(req, user);
    
            res.json({ message: 'Password updated successfully.' });
        } catch (error) {
            return sendError(res, 500, 'Could not update your password.', error);
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
                    res.clearCookie(process.env.SESSION_COOKIE_NAME || 'nexcv.sid');
                    res.json({ message: 'Account deleted successfully.' });
                });
            });
        } catch (error) {
            return sendError(res, 500, 'Could not delete your account.', error);
        }
    });
    
    // Initiate Google Login
    const PASSWORD_RESET_EXPIRES_MS = 60 * 60 * 1000;
    
    const findUserByValidPasswordResetToken = (token: string) => User.findOne({
        resetPasswordToken: hashToken(token),
        resetPasswordExpires: { $gt: new Date() }
    });


    router.post('/api/auth/forgot-password', passwordResetLimiter, passwordResetDailyLimiter, async (req: Request, res: Response) => {
        try {
            const email = normalizeEmail(req.body.email);
            const emailError = validateAuthEmail(email, isValidEmail);
            if (emailError) {
                return res.status(400).json({ error: emailError });
            }

            if (!isEmailServiceConfigured()) {
                return res.status(500).json({ error: 'Email service is not configured.' });
            }

            const user = await User.findOne({ email });
            if (!user) {
                return res.json({ message: genericPasswordResetMessage });
            }
    
            // Generate token
            const token = randomBytes(20).toString('hex');
            const tokenHash = hashToken(token);
            user.resetPasswordToken = tokenHash;
            user.resetPasswordExpires = new Date(Date.now() + PASSWORD_RESET_EXPIRES_MS);
            await user.save();
    
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
    
            const templates = (req as any).appSettings?.emailTemplates;
            const passwordResetTemplate = renderEmailTemplate(
                mergeEmailTemplates(templates).passwordReset,
                {
                    name: emailGreetingName(user.displayName),
                    resetUrl,
                    expiresIn: '1 hour',
                }
            );
            const mailOptions = {
                to: user.email,
                subject: passwordResetTemplate.subject,
                text: passwordResetTemplate.text,
                html: await buildBrandedEmailHtml({
                    subject: passwordResetTemplate.subject,
                    text: passwordResetTemplate.text,
                    badge: 'Password reset',
                    ctaLabel: 'Reset password',
                    ctaUrl: resetUrl,
                }),
            };
    
            try {
                await sendSystemEmail(mailOptions);
            } catch (emailError) {
                await User.updateOne(
                    { _id: user._id, resetPasswordToken: tokenHash },
                    { $unset: { resetPasswordToken: '', resetPasswordExpires: '' } }
                );
                throw emailError;
            }
    
            res.json({ message: genericPasswordResetMessage });
        } catch (error) {
            return sendError(res, 500, 'Could not send reset password email.', error);
        }
    });


    router.post('/api/auth/validate-reset-token', authLimiter, async (req: Request, res: Response) => {
        try {
            const token = typeof req.body.token === 'string' ? req.body.token : '';
    
            if (!token) {
                return res.status(400).json({ error: 'Password reset token is missing.' });
            }
    
            const user = await findUserByValidPasswordResetToken(token).select('_id');
            if (!user) {
                return res.status(400).json({ error: 'Password reset token is invalid or has expired.' });
            }
    
            res.json({ valid: true });
        } catch (error) {
            return sendError(res, 500, 'Could not validate password reset token.', error);
        }
    });


    router.post('/api/auth/reset-password', authLimiter, async (req: Request, res: Response) => {
        try {
            const token = req.body.token;
            const newPassword = typeof req.body.password === 'string' ? req.body.password : '';
    
            if (!token) {
                return res.status(400).json({ error: 'Password reset token is missing.' });
            }
    
            if (!validatePasswordStrength(newPassword)) {
                return res.status(400).json({ error: passwordPolicyMessage });
            }
    
            const user = await findUserByValidPasswordResetToken(token);
    
            if (!user) {
                return res.status(400).json({ error: 'Password reset token is invalid or has expired.' });
            }
    
            user.passwordHash = hashPassword(newPassword);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            invalidateUserSessions(user);
            await user.save();
    
            res.json({ message: 'Password has been successfully reset.' });
        } catch (error) {
            return sendError(res, 500, 'Could not reset password.', error);
        }
    });


    router.post('/api/auth/verify-email', requireAuth, emailVerificationAttemptLimiter, async (req: Request, res: Response) => {
        try {
            const code = typeof req.body.code === 'string' ? req.body.code.replace(/\D/g, '') : '';
            if (!/^\d{6}$/.test(code)) {
                return res.status(400).json({ error: 'Enter the 6-digit verification code.' });
            }
    
            const user = await User.findOne({
                _id: currentUserId(req),
                emailVerificationToken: hashToken(code),
                emailVerificationExpires: { $gt: new Date() },
            });
    
            if (!user) {
                return res.status(400).json({ error: 'Verification code is invalid or has expired.' });
            }
    
            user.emailVerified = true;
            user.emailVerificationToken = undefined;
            user.emailVerificationExpires = undefined;
            await user.save();
    
            return res.json({ user: publicUser(user), message: 'Email verified successfully.' });
        } catch (error) {
            return sendError(res, 500, 'Could not verify email.', error);
        }
    });


    router.post('/api/auth/resend-verification', requireAuth, emailVerificationLimiter, async (req: Request, res: Response) => {
        try {
            const user = await User.findById(currentUserId(req));
            if (!user) {
                return res.status(404).json({ error: 'User not found.' });
            }
    
            if (isEmailVerified(user)) {
                return res.json({ user: publicUser(user), message: 'Email is already verified.' });
            }
    
            const verification = generateEmailVerificationOtp();
            user.emailVerificationToken = verification.codeHash;
            user.emailVerificationExpires = verification.expires;
            await user.save();
    
            const verificationEmailSent = await sendEmailVerificationWithRetry(user, verification.code);
            if (!verificationEmailSent) {
                return res.status(502).json({ error: 'Could not send verification OTP. Please try again.' });
            }
    
            return res.json({ user: publicUser(user), message: 'Verification OTP sent. Please check your inbox.' });
        } catch (error) {
            return sendError(res, 500, 'Could not send verification OTP.', error);
        }
    });
    
    // Initiate Google Login


    router.get('/api/auth/google', (req: Request, _res: Response, next: NextFunction) => {
        const nextTarget = typeof req.query.next === 'string' ? req.query.next : 'import';
        (req.session as any).authRedirect = authRedirectForNextTarget(nextTarget);
        (req as any).googleOAuthState = createGoogleOAuthState(req, randomBytes, hashToken);
        next();
    }, (req: Request, res: Response, next: NextFunction) => passport.authenticate('google', {
        scope: ['profile', 'email'],
        state: (req as any).googleOAuthState,
    })(req, res, next));
    
    router.get('/api/auth/google/callback', (req: Request, res: Response, next: NextFunction) => {
        if (!consumeGoogleOAuthState(req, req.query.state, hashToken)) {
            console.warn('Google Auth callback rejected: invalid OAuth state');
            return res.redirect('/?auth=failed&reason=invalid_state');
        }

        passport.authenticate('google', (err: any, user: any, info: any) => {
            if (err) {
                console.error('Google Auth callback error:', err?.message || err);
                return res.redirect('/?auth=failed&reason=server_error');
            }
            if (!user) {
                console.warn('Google Auth failed:', info?.message || 'No user returned');
                const reason = info?.message?.includes('already exists') ? 'account_exists' : 'denied';
                return res.redirect(`/?auth=failed&reason=${reason}`);
            }
            loginWithRegeneratedSession(req, user, (loginErr) => {
                console.error('Google Auth session error:', loginErr?.message || loginErr);
                return res.redirect('/?auth=failed&reason=session_error');
            }, () => {
                markSessionCurrent(req, user);
                // Successful authentication
                if ((user as any).wasNewlyCreated) {
                    void sendNewAccountNotification(user);
                }
                const redirectTo = (req.session as any).authRedirect || '/builder?import=1';
                delete (req.session as any).authRedirect;
                res.redirect(redirectTo);
            });
        })(req, res, next);
    });

    router.get('/api/auth/github', (req: Request, res: Response) => {
        const config = githubConfig();
        if (!config) {
            console.warn('GitHub Auth variables missing in .env. GitHub login is not available.');
            return res.redirect('/?auth=failed&reason=github_not_configured');
        }

        const nextTarget = typeof req.query.next === 'string' ? req.query.next : 'import';
        (req.session as any).authRedirect = authRedirectForNextTarget(nextTarget);
        const state = createGitHubOAuthState(req, randomBytes, hashToken);
        const params = new URLSearchParams({
            client_id: config.clientId,
            redirect_uri: githubCallbackUrl(req),
            scope: 'read:user user:email',
            state,
        });

        return res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
    });

    router.get('/api/auth/github/callback', async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!consumeGitHubOAuthState(req, req.query.state, hashToken)) {
                console.warn('GitHub Auth callback rejected: invalid OAuth state');
                return res.redirect('/?auth=failed&reason=invalid_state');
            }

            const config = githubConfig();
            const code = typeof req.query.code === 'string' ? req.query.code : '';
            if (!config || !code) {
                return res.redirect('/?auth=failed&reason=denied');
            }

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
                    redirect_uri: githubCallbackUrl(req),
                }),
            });

            const tokenData = await tokenResponse.json().catch(() => ({}));
            if (!tokenResponse.ok || typeof tokenData.access_token !== 'string') {
                console.warn('GitHub token exchange failed:', tokenData?.error_description || tokenData?.error || tokenResponse.status);
                return res.redirect('/?auth=failed&reason=server_error');
            }

            const authHeaders = {
                Authorization: `Bearer ${tokenData.access_token}`,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
            };
            const profileResponse = await fetch('https://api.github.com/user', { headers: authHeaders });
            const profile = await profileResponse.json().catch(() => ({}));
            if (!profileResponse.ok) {
                console.warn('GitHub profile fetch failed:', profile?.message || profileResponse.status);
                return res.redirect('/?auth=failed&reason=server_error');
            }

            const emailsResponse = await fetch('https://api.github.com/user/emails', { headers: authHeaders });
            const emails = await emailsResponse.json().catch(() => []);
            if (!emailsResponse.ok) {
                console.warn('GitHub email fetch failed:', Array.isArray(emails) ? emailsResponse.status : emails?.message || emailsResponse.status);
                return res.redirect('/?auth=failed&reason=server_error');
            }

            const result = await resolveGitHubOAuthUser({
                User,
                roleForEmail,
                syncUserRoleFromAllowlist,
                normalizeEmail,
                sanitizeDisplayName,
                profile,
                emails: Array.isArray(emails) ? emails : [],
            });

            if (!result.user) {
                const reason = result.info?.message?.includes('already exists') ? 'account_exists' : 'denied';
                return res.redirect(`/?auth=failed&reason=${reason}`);
            }

            loginWithRegeneratedSession(req, result.user, next, () => {
                markSessionCurrent(req, result.user);
                if ((result.user as any).wasNewlyCreated) {
                    void sendNewAccountNotification(result.user);
                }
                const redirectTo = (req.session as any).authRedirect || '/builder?import=1';
                delete (req.session as any).authRedirect;
                return res.redirect(redirectTo);
            });
        } catch (error) {
            console.error('GitHub Auth callback error:', error instanceof Error ? error.message : error);
            return res.redirect('/?auth=failed&reason=server_error');
        }
    });

    router.get('/api/auth/linkedin', (req: Request, res: Response) => {
        const config = linkedinConfig();
        if (!config) {
            console.warn('LinkedIn Auth variables missing in .env. LinkedIn login is not available.');
            return res.redirect('/?auth=failed&reason=linkedin_not_configured');
        }

        const nextTarget = typeof req.query.next === 'string' ? req.query.next : 'import';
        (req.session as any).authRedirect = authRedirectForNextTarget(nextTarget);
        const state = createLinkedInOAuthState(req, randomBytes, hashToken);
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: config.clientId,
            redirect_uri: linkedinCallbackUrl(req),
            scope: 'openid profile email',
            state,
        });

        return res.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`);
    });

    router.get('/api/auth/linkedin/callback', async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!consumeLinkedInOAuthState(req, req.query.state, hashToken)) {
                console.warn('LinkedIn Auth callback rejected: invalid OAuth state');
                return res.redirect('/?auth=failed&reason=invalid_state');
            }

            const config = linkedinConfig();
            const code = typeof req.query.code === 'string' ? req.query.code : '';
            if (!config || !code) {
                return res.redirect('/?auth=failed&reason=denied');
            }

            const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: linkedinCallbackUrl(req),
                    client_id: config.clientId,
                    client_secret: config.clientSecret,
                }),
            });

            const tokenData = await tokenResponse.json().catch(() => ({}));
            if (!tokenResponse.ok || typeof tokenData.access_token !== 'string') {
                console.warn('LinkedIn token exchange failed:', tokenData?.error_description || tokenData?.error || tokenResponse.status);
                return res.redirect('/?auth=failed&reason=server_error');
            }

            const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
                headers: { Authorization: `Bearer ${tokenData.access_token}` },
            });
            const profile = await profileResponse.json().catch(() => ({}));
            if (!profileResponse.ok) {
                console.warn('LinkedIn userinfo failed:', profile?.message || profile?.error || profileResponse.status);
                return res.redirect('/?auth=failed&reason=server_error');
            }

            const result = await resolveLinkedInOAuthUser({
                User,
                roleForEmail,
                syncUserRoleFromAllowlist,
                normalizeEmail,
                sanitizeDisplayName,
                profile,
            });

            if (!result.user) {
                const reason = result.info?.message?.includes('already exists') ? 'account_exists' : 'denied';
                return res.redirect(`/?auth=failed&reason=${reason}`);
            }

            loginWithRegeneratedSession(req, result.user, next, () => {
                markSessionCurrent(req, result.user);
                if ((result.user as any).wasNewlyCreated) {
                    void sendNewAccountNotification(result.user);
                }
                const redirectTo = (req.session as any).authRedirect || '/builder?import=1';
                delete (req.session as any).authRedirect;
                return res.redirect(redirectTo);
            });
        } catch (error) {
            console.error('LinkedIn Auth callback error:', error instanceof Error ? error.message : error);
            return res.redirect('/?auth=failed&reason=server_error');
        }
    });
    
    // Get Current User


    router.get('/api/auth/current-user', async (req: Request, res: Response) => {
        try {
            if (req.isAuthenticated() && req.user) {
                await syncUserRoleFromAllowlist(req.user as any);
                return res.json({ user: publicUser(req.user) });
            }
            return res.status(401).json({ error: 'Not authenticated' });
        } catch (error) {
            return sendError(res, 500, 'Could not load current user.', error);
        }
    });
    
    // Logout


    router.post('/api/auth/logout', (req: Request, res: Response, next: NextFunction) => {
        req.logout((err) => {
            if (err) { return next(err); }
            req.session.destroy((destroyError) => {
                if (destroyError) return next(destroyError);
                res.clearCookie(process.env.SESSION_COOKIE_NAME || 'nexcv.sid');
                res.json({ message: 'Logged out successfully' });
            });
        });
    });


}

