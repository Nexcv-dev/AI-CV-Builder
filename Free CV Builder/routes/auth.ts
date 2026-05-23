import express, { Router, Request, Response, NextFunction } from 'express';
import { bindDeps } from './_shared';
import type { BillingPlan } from '../server-models/userPlan';
import type { TemplateName } from '../src/templates';

type RouteDeps = Record<string, any>;

export function registerAuthRoutes(router: Router, deps: RouteDeps) {
    const { User, CVDocument, DownloadQuota, PaymentTransaction, BillingPlanSetting, Coupon, CheckoutSession, TemplateSetting, SupportTicket, CV_TEMPLATES, DEFAULT_TEMPLATE, TemplateName, templateRequiresPaidPlan, requireAuth, requireSuperAdmin, sendError, passport, adminTemplateJsonParser, cvImportJsonParser, pdfJsonParser, authLimiter, passwordResetLimiter, emailVerificationAttemptLimiter, emailVerificationLimiter, getRequestOrigin, isAllowedOrigin, clearS3TemplateCache, fetchS3Text, generateS3CVHTML, getS3ObjectStream, putS3Object, S3_TEMPLATE_BUCKET, S3_TEMPLATE_PREFIX, generateCVHTML, generatePdfDocument, sanitizeCvData, getDownloadQuota, incrementDownloadQuota, getActiveTemplateForKey, sanitizeTextForPrompt, sanitizeContextField, sanitizeProfileField, sanitizeDisplayName, normalizeEmail, isValidEmail, validatePasswordStrength, hashPassword, verifyPassword, hashToken, generateEmailVerificationOtp, isEmailVerified, publicUser, isMongoDuplicateKeyError, isMongoValidationError, passwordPolicyMessage, sendEmailVerificationWithRetry, sendNewAccountNotification, sendContactNotification, sendBillingSuccessNotifications, getFrontendOrigin, getApiOrigin, currentUserId, isValidDocumentId, adminTemplateSummary, customTemplateSummary, templateThumbnailPath, validateCustomTemplateKey, defaultTemplateCategory, sanitizeTemplateSource, validateTemplateHtml, validateTemplateCss, parseThumbnailUpload, TEMPLATE_CATEGORIES, TEMPLATE_SURFACE_COLOR_ROLES, TEMPLATE_STATUSES, MAX_TEMPLATE_HTML_LENGTH, MAX_TEMPLATE_CSS_LENGTH, ensureDefaultBillingPlans, billingPlanSummary, normalizeCouponCode,  isPaidBillingPlan, calculateBillingQuote, parsePayherePlan, verifyPayhereMd5Signature, markPaymentProcessed, createCheckoutHash, createCheckoutOrderId, getPayhereConfig, buildPayhereCheckoutPayload, createPlanExpiry, getEffectivePlan, isPaidPlan, documentSummary, buildInitialCvData, parsePdfText, generateGeminiText, Type, ALLOWED_MIME_TYPES, ALLOWED_SECTION_TYPES, buildCvCreationQuota, consumeCvCreationQuota, buildDownloadQuota, sendAppEmail, sendSystemEmail, sendNotificationEmail, isEmailServiceConfigured, normalizeEmailFrom, roleForEmail, syncUserRoleFromAllowlist, isSuperAdmin, mongoose, randomBytes, randomInt, createHash, timingSafeEqual, startOfUtcDay, formatUtcDay, parsePaymentAmountCents, escapeRegex, adminUserSummary, getPublicBillingPlans, planDisplayName, getPlanPrice, adminPaymentSummary, SUPPORT_TICKET_STATUSES, SUPPORT_TICKET_TYPES, SUPPORT_TICKET_PRIORITIES, sanitizeContactMessage, adminSupportTicketSummary, emailGreetingName, getCvCreationQuota, incrementCvCreationQuota, documentDetails, requireVerifiedEmail, resolveRequestedTemplate, titleFromCvData, requirePaidPlan, MAX_BASE64_LENGTH, quoteCheckout, getPayHereMerchantConfig, verifyPayHereMd5Signature, resolvePayHerePaymentContext, PAYHERE_PLAN_PRICES, payHereAmountToCents, generateTransactionId, getPayHereCheckoutUrl, buildPayHereCheckoutHash } = bindDeps(deps);

    router.post('/api/auth/signup', async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (mongoose.connection.readyState !== 1) {
                return res.status(503).json({ error: 'Database is not connected. Check MongoDB settings and try again.' });
            }
    
            const email = normalizeEmail(req.body.email);
            const displayName = sanitizeDisplayName(req.body.displayName);
            const password = typeof req.body.password === 'string' ? req.body.password : '';
    
            if (!isValidEmail(email)) {
                return res.status(400).json({ error: 'Enter a valid email address.' });
            }
    
            if (!displayName) {
                return res.status(400).json({ error: 'Enter your name.' });
            }
    
            if (!validatePasswordStrength(password)) {
                return res.status(400).json({ error: passwordPolicyMessage });
            }
    
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(409).json({ error: 'An account already exists for this email.' });
            }
    
            const verification = generateEmailVerificationOtp();
            const user = await User.create({
                email,
                displayName,
                passwordHash: hashPassword(password),
                role: roleForEmail(email),
                emailVerified: false,
                emailVerificationToken: verification.codeHash,
                emailVerificationExpires: verification.expires,
                authProvider: 'email',
            });
    
            const verificationEmailSent = await sendEmailVerificationWithRetry(user, verification.code);
            void sendNewAccountNotification(user);
    
            req.login(user, (err) => {
                if (err) return next(err);
                return res.status(201).json({
                    user: publicUser(user),
                    message: verificationEmailSent
                        ? 'Account created. Enter the OTP sent to your email to verify your account.'
                        : 'Account created, but verification OTP could not be sent. Try resend verification.',
                });
            });
        } catch (error) {
            if (isMongoDuplicateKeyError(error)) {
                return res.status(409).json({ error: 'An account already exists for this email.' });
            }
    
            if (isMongoValidationError(error)) {
                return res.status(400).json({ error: 'Please check your signup details and try again.' });
            }
    
            return sendError(res, 500, 'Could not create your account.', error);
        }
    });


    router.post('/api/auth/login', async (req: Request, res: Response, next: NextFunction) => {
        try {
            const email = normalizeEmail(req.body.email);
            const password = typeof req.body.password === 'string' ? req.body.password : '';
    
            if (!isValidEmail(email) || !password) {
                return res.status(400).json({ error: 'Enter your email and password.' });
            }
    
            const user = await User.findOne({ email });
            if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
                return res.status(401).json({ error: 'Email or password is incorrect.' });
            }
    
            await syncUserRoleFromAllowlist(user);
    
            req.login(user, (err) => {
                if (err) return next(err);
                return res.json({ user: publicUser(user) });
            });
        } catch (error) {
            return sendError(res, 500, 'Could not sign you in.', error);
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
            await user.save();
    
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


    router.post('/api/auth/forgot-password', passwordResetLimiter, async (req: Request, res: Response) => {
        try {
            const email = normalizeEmail(req.body.email);
            if (!isValidEmail(email)) {
                return res.status(400).json({ error: 'Enter a valid email address.' });
            }
    
            const user = await User.findOne({ email });
            if (!user) {
                return res.status(404).json({ error: 'No account found for this email address.' });
            }
    
            const hasGmailApi = Boolean(
                (process.env.GMAIL_CLIENT_ID?.trim() || process.env.GOOGLE_CLIENT_ID?.trim()) &&
                (process.env.GMAIL_CLIENT_SECRET?.trim() || process.env.GOOGLE_CLIENT_SECRET?.trim()) &&
                process.env.GMAIL_REFRESH_TOKEN?.trim()
            );
            const resendApiKey = process.env.RESEND_API_KEY?.trim();
            const emailUser = process.env.EMAIL_USER?.trim();
            const emailPass = process.env.EMAIL_PASS?.trim();
            const senderEmail = process.env.GMAIL_SENDER_EMAIL?.trim() || emailUser || 'onboarding@resend.dev';
            const emailFromFallback = hasGmailApi
                ? `NexCV <${senderEmail}>`
                : resendApiKey
                    ? 'NexCV <onboarding@resend.dev>'
                    : emailUser || '';
            const emailFrom = normalizeEmailFrom(process.env.EMAIL_FROM, emailFromFallback);
            if (!emailFrom || (!hasGmailApi && !resendApiKey && (!emailUser || !emailPass))) {
                return res.status(500).json({ error: 'Email service is not configured.' });
            }
    
            // Generate token
            const token = randomBytes(20).toString('hex');
            user.resetPasswordToken = hashToken(token);
            user.resetPasswordExpires = new Date(Date.now() + PASSWORD_RESET_EXPIRES_MS);
            await user.save();
    
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
    
            const templates = (req as any).appSettings?.emailTemplates;
            const passwordResetTemplate = deps.renderEmailTemplate(
                deps.mergeEmailTemplates(templates).passwordReset,
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
                user.resetPasswordToken = undefined;
                user.resetPasswordExpires = undefined;
                await user.save();
                throw emailError;
            }
    
            res.json({ message: 'Reset link sent! Please check your email inbox.' });
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
                return res.redirect('/?auth=failed&reason=denied');
            }
            req.login(user, (loginErr) => {
                if (loginErr) {
                    console.error('Google Auth session error:', loginErr?.message || loginErr);
                    return res.redirect('/?auth=failed&reason=session_error');
                }
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

