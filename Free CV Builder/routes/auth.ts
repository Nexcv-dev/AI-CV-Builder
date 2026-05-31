import express, { Router, Request, Response, NextFunction } from 'express';
import { bindDeps } from './_shared';

type RouteDeps = Record<string, any>;

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

const validateAuthEmail = (email: string, isValidEmail: (value: string) => boolean) => {
    if (!isValidEmail(email)) return 'Enter a valid email address.';
    return getAuthEmailDomainError(email);
};

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

const genericSignupError = 'Could not create your account. Please check your details and try again.';
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
                return res.status(400).json({ error: genericSignupError });
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

            const emailError = validateAuthEmail(email, isValidEmail);
            if (emailError) {
                return res.status(400).json({ error: emailError });
            }

            return res.json({ exists: true, method: 'password' });
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

            let user = await User.findOne({ email });
            const isNewUser = !user;

            if (intent === 'signup' && user && user.emailVerified !== false) {
                return res.json({
                    needsName: false,
                    message: 'If this email can continue, we will send an OTP.',
                });
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
    
            if (user.passwordHash && !verifyPassword(currentPassword, user.passwordHash)) {
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
                    res.clearCookie('connect.sid');
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

            const resendApiKey = process.env.RESEND_API_KEY?.trim();
            const emailUser = process.env.EMAIL_USER?.trim();
            const emailPass = process.env.EMAIL_PASS?.trim();
            const emailFromFallback = resendApiKey
                    ? 'NexCV <onboarding@resend.dev>'
                    : emailUser || '';
            const emailFrom = normalizeEmailFrom(process.env.EMAIL_FROM, emailFromFallback);
            if (!emailFrom || (!resendApiKey && (!emailUser || !emailPass))) {
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
                from: emailFrom,
                subject: passwordResetTemplate.subject,
                text: passwordResetTemplate.text,
            };
    
            try {
                await sendAppEmail(mailOptions);
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
        (req.session as any).authRedirect =
            nextTarget === 'download' ? '/builder?download=1' :
                nextTarget === 'builder' ? '/builder' :
                    '/builder?import=1';
        next();
    }, passport.authenticate('google', {
        scope: ['profile', 'email']
    }));
    
    // Google Auth Callback


    router.get('/api/auth/google/callback', (req: Request, res: Response, next: NextFunction) => {
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
            res.json({ message: 'Logged out successfully' });
        });
    });


}

