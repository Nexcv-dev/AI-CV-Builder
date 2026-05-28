import { Router, Request, Response } from 'express';
import { bindDeps, type RouteDeps } from '../_shared';
import { ADMIN_ROLE_ACCESS, ADMIN_ROLE_LABELS, ALL_USER_ROLES, isUserRole, type UserRole } from '../../src/adminAccess';
import { DEFAULT_APP_SETTINGS, getAppSettings } from '../../server-models/AppSetting';
import { DEFAULT_CMS_CONTENT, mergeCmsContent, type CmsContent, type CmsFaqItem, type CmsLegalPage, type CmsPlanCopy } from '../../src/contentDefaults';
import { DEFAULT_EMAIL_TEMPLATES, mergeEmailTemplates, type EmailTemplateMap, type EmailTemplateKey } from '../../src/emailTemplateDefaults';

const roleSummary = (role: UserRole) => ({
    role,
    label: role === 'user' ? 'User' : ADMIN_ROLE_LABELS[role],
    access: role === 'user' ? [] : ADMIN_ROLE_ACCESS[role],
});

const mongoReadyStateLabel = (state: number) => (
    ['disconnected', 'connected', 'connecting', 'disconnecting'][state] || 'unknown'
);

const serviceStatus = (
    status: 'ok' | 'warn' | 'error',
    label: string,
    detail: string,
    configured = status !== 'error',
) => ({
    key: label.toLowerCase().replace(/\s+/g, '_'),
    label,
    status,
    configured,
    detail,
});

export function registerAdminSettingsRoutes(router: Router, deps: RouteDeps) {
    const { User, AppSetting, CV_TEMPLATES, requireAdminPermission, sendError, currentUserId, isValidDocumentId, adminUserSummary, recordAdminAuditLog, normalizeEmail, sanitizeProfileField, isEmailServiceConfigured, getAppEmailFrom, sendSystemEmail, getPayHereMerchantConfig, getPayHereCheckoutUrl, S3_TEMPLATE_BUCKET, S3_TEMPLATE_PREFIX, mongoose } = bindDeps(deps);

    router.get('/api/admin/roles', requireAdminPermission('roles.read'), async (_req: Request, res: Response) => {
        try {
            const admins = await User.find({ role: { $ne: 'user' } })
                .sort({ createdAt: -1 })
                .select('email displayName role plan planExpiresAt emailVerified authProvider createdAt updatedAt');

            return res.json({
                roles: ALL_USER_ROLES.map(roleSummary),
                admins: admins.map((user: any) => adminUserSummary(user, 0)),
            });
        } catch (error) {
            return sendError(res, 500, 'Could not load admin roles.', error);
        }
    });

    router.patch('/api/admin/users/:id/role', requireAdminPermission('users.role.update'), async (req: Request, res: Response) => {
        try {
            if (!isValidDocumentId(req.params.id)) {
                return res.status(400).json({ error: 'Invalid user id.' });
            }

            const role = req.body.role;
            if (!isUserRole(role)) {
                return res.status(400).json({ error: 'Choose a valid role.' });
            }

            const user = await User.findById(req.params.id);
            if (!user) {
                return res.status(404).json({ error: 'User not found.' });
            }

            const requesterId = currentUserId(req)?.toString?.();
            if (role !== 'super_admin' && requesterId && user._id.toString() === requesterId && user.role === 'super_admin') {
                return res.status(400).json({ error: 'You cannot remove your own admin access.' });
            }

            const remainingAdmins = role !== 'super_admin' && user.role === 'super_admin'
                ? await User.countDocuments({ role: 'super_admin', _id: { $ne: user._id } })
                : 1;
            if (remainingAdmins < 1) {
                return res.status(400).json({ error: 'At least one super admin is required.' });
            }

            const previousRole = user.role;
            user.role = role;
            await user.save();
            await recordAdminAuditLog({
                actorId: currentUserId(req),
                action: 'user.role.updated',
                targetType: 'user',
                targetId: user._id.toString(),
                targetLabel: user.email,
                metadata: { previousRole, nextRole: role },
                ip: req.ip,
                userAgent: req.get('user-agent'),
            });

            return res.json({ user: adminUserSummary(user, 0) });
        } catch (error) {
            return sendError(res, 500, 'Could not update user role.', error);
        }
    });

    router.get('/api/admin/settings', requireAdminPermission('settings.read'), async (_req: Request, res: Response) => {
        try {
            const appSettings = await getAppSettings();
            const emailConfigured = isEmailServiceConfigured();
            const mongoConfigured = Boolean(process.env.MONGO_URI || process.env.MONGODB_URI);
            const mongoReadyState = mongoose?.connection?.readyState ?? 0;
            const payhereConfig = getPayHereMerchantConfig();
            const payhereConfigured = Boolean(payhereConfig.merchantId && payhereConfig.merchantSecret);
            const payhereNotifyConfigured = Boolean(process.env.PAYHERE_NOTIFY_URL?.trim());
            const pdfLambdaConfigured = Boolean(process.env.PDF_LAMBDA_URL?.trim());
            const sessionSecretConfigured = Boolean(process.env.SESSION_SECRET?.trim());
            return res.json({
                app: appSettingsSummary(appSettings),
                environment: process.env.NODE_ENV || 'development',
                port: String(process.env.PORT || 3002),
                origins: {
                    frontend: process.env.FRONTEND_ORIGIN || '',
                    api: process.env.API_ORIGIN || '',
                },
                services: [
                    serviceStatus(
                        !mongoConfigured ? 'warn' : mongoReadyState === 1 ? 'ok' : 'error',
                        'MongoDB',
                        !mongoConfigured ? 'URI not configured.' : `Connection is ${mongoReadyStateLabel(mongoReadyState)}.`,
                        mongoConfigured,
                    ),
                    serviceStatus(
                        sessionSecretConfigured || process.env.NODE_ENV !== 'production' ? 'ok' : 'error',
                        'Session Secret',
                        sessionSecretConfigured ? 'Configured.' : 'Missing in production.',
                        sessionSecretConfigured,
                    ),
                    serviceStatus(
                        emailConfigured ? 'ok' : 'error',
                        'Email',
                        emailConfigured ? `Configured via ${emailSettingsSummary(appSettings, { isEmailServiceConfigured, getAppEmailFrom }).provider}.` : 'No email provider is configured.',
                        emailConfigured,
                    ),
                    serviceStatus(
                        Boolean(S3_TEMPLATE_BUCKET) ? 'ok' : 'warn',
                        'S3 Templates',
                        S3_TEMPLATE_BUCKET ? `Bucket configured${S3_TEMPLATE_PREFIX ? ` with prefix ${S3_TEMPLATE_PREFIX}.` : '.'}` : 'Bucket not configured; custom templates will not be available.',
                        Boolean(S3_TEMPLATE_BUCKET),
                    ),
                    serviceStatus(
                        payhereConfigured && payhereNotifyConfigured ? 'ok' : payhereConfigured ? 'warn' : 'error',
                        'PayHere',
                        payhereConfigured
                            ? `Checkout configured. Notify URL ${payhereNotifyConfigured ? 'configured' : 'missing'}.`
                            : 'Merchant credentials are missing.',
                        payhereConfigured,
                    ),
                    serviceStatus(
                        pdfLambdaConfigured ? 'ok' : 'warn',
                        'PDF Lambda',
                        pdfLambdaConfigured ? 'Lambda renderer URL configured.' : 'Missing; built-in templates will use local fallback.',
                        pdfLambdaConfigured,
                    ),
                    serviceStatus(
                        process.env.GEMINI_API_KEY ? 'ok' : 'error',
                        'Gemini',
                        process.env.GEMINI_API_KEY ? 'Configured.' : 'Missing; AI features will fail.',
                        Boolean(process.env.GEMINI_API_KEY),
                    ),
                ],
                security: {
                    sessionSecretConfigured,
                    superAdminAllowlistCount: (process.env.SUPER_ADMIN_EMAILS || '')
                        .split(',')
                        .map((email) => email.trim())
                        .filter(Boolean).length,
                    adminIpAllowlistConfigured: Boolean(process.env.ADMIN_ALLOWED_IPS?.trim()),
                    payhereCheckoutUrl: getPayHereCheckoutUrl(),
                    payhereNotifyUrlConfigured: payhereNotifyConfigured,
                    pdfLambdaConfigured,
                },
                email: emailSettingsSummary(appSettings, { isEmailServiceConfigured, getAppEmailFrom }),
            });
        } catch (error) {
            return sendError(res, 500, 'Could not load admin settings.', error);
        }
    });

    router.patch('/api/admin/settings', requireAdminPermission('settings.write'), async (req: Request, res: Response) => {
        try {
            if (AppSetting.db.readyState !== 1) {
                return res.status(503).json({ error: 'Database is not connected. Settings cannot be saved.' });
            }

            const current = await getAppSettings();
            const patch = sanitizeSettingsPatch(req.body?.app || req.body, { CV_TEMPLATES, normalizeEmail, sanitizeProfileField });
            if ('error' in patch) {
                return res.status(400).json({ error: patch.error });
            }

            const nextSettings = await AppSetting.findOneAndUpdate(
                { singletonKey: 'global' },
                {
                    $set: {
                        ...patch.values,
                        updatedBy: currentUserId(req),
                    },
                },
                { new: true, runValidators: true }
            );

            await recordAdminAuditLog({
                actorId: currentUserId(req),
                action: 'settings.updated',
                targetType: 'app_settings',
                targetId: 'global',
                targetLabel: 'Global app settings',
                metadata: {
                    before: appSettingsSummary(current),
                    after: appSettingsSummary(nextSettings),
                },
                ip: req.ip,
                userAgent: req.get('user-agent'),
            });

            return res.json({ app: appSettingsSummary(nextSettings) });
        } catch (error) {
            return sendError(res, 500, 'Could not update admin settings.', error);
        }
    });

    router.post('/api/admin/settings/test-email', requireAdminPermission('email.write'), async (req: Request, res: Response) => {
        try {
            const recipient = normalizeEmail(req.body.to || (req.user as any)?.email || '');
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
                return res.status(400).json({ error: 'Enter a valid test email recipient.' });
            }
            if (!isEmailServiceConfigured()) {
                return res.status(400).json({ error: 'Email service is not configured.' });
            }

            await sendSystemEmail({
                to: recipient,
                subject: 'NexCV email service test',
                text: `This is a NexCV admin test email.\n\nSent at: ${new Date().toISOString()}\n`,
            });

            await recordAdminAuditLog({
                actorId: currentUserId(req),
                action: 'settings.updated',
                targetType: 'email_settings',
                targetId: 'test-email',
                targetLabel: recipient,
                metadata: { testEmailSent: true },
                ip: req.ip,
                userAgent: req.get('user-agent'),
            });

            return res.json({ message: `Test email sent to ${recipient}.` });
        } catch (error) {
            return sendError(res, 500, 'Could not send test email.', error);
        }
    });
}

function appSettingsSummary(settings: any) {
    return {
        maintenanceMode: Boolean(settings?.maintenanceMode),
        announcementEnabled: Boolean(settings?.announcementEnabled),
        announcementText: settings?.announcementText || '',
        supportEmail: settings?.supportEmail || DEFAULT_APP_SETTINGS.supportEmail,
        emailVerificationRequired: settings?.emailVerificationRequired !== false,
        payhereEnabled: settings?.payhereEnabled !== false,
        payhereModeLabel: settings?.payhereModeLabel === 'live' ? 'live' : 'sandbox',
        freeCvCreationLimit: Number.isFinite(Number(settings?.freeCvCreationLimit)) ? Number(settings.freeCvCreationLimit) : DEFAULT_APP_SETTINGS.freeCvCreationLimit,
        freePdfDownloadLimit: Number.isFinite(Number(settings?.freePdfDownloadLimit)) ? Number(settings.freePdfDownloadLimit) : DEFAULT_APP_SETTINGS.freePdfDownloadLimit,
        defaultTemplateKey: settings?.defaultTemplateKey || DEFAULT_APP_SETTINGS.defaultTemplateKey,
        cmsContent: mergeCmsContent(settings?.cmsContent),
        emailTemplates: mergeEmailTemplates(settings?.emailTemplates),
        updatedAt: settings?.updatedAt,
    };
}

function maskedValue(value: unknown) {
    return typeof value === 'string' && value.trim() ? 'Configured' : 'Missing';
}

function emailSettingsSummary(settings: any, deps: { isEmailServiceConfigured: () => boolean; getAppEmailFrom: () => string }) {
    const hasResend = Boolean(process.env.RESEND_API_KEY?.trim());
    const hasSmtp = Boolean(process.env.EMAIL_USER?.trim() && process.env.EMAIL_PASS?.trim());
    const provider = hasResend ? 'Resend' : hasSmtp ? 'SMTP' : 'Not configured';

    return {
        configured: deps.isEmailServiceConfigured(),
        provider,
        from: deps.getAppEmailFrom() || '',
        supportEmail: settings?.supportEmail || DEFAULT_APP_SETTINGS.supportEmail,
        adminNotificationEmail: process.env.ADMIN_NOTIFICATION_EMAIL?.trim() || '',
        smtpHost: process.env.SMTP_HOST?.trim() || (hasSmtp ? 'smtp.gmail.com' : ''),
        smtpPort: process.env.SMTP_PORT?.trim() || (hasSmtp ? '587' : ''),
        checks: [
            { key: 'resend', label: 'Resend API', configured: hasResend },
            { key: 'smtp_credentials', label: 'SMTP Credentials', configured: hasSmtp },
            { key: 'email_from', label: 'Sender From', configured: Boolean(deps.getAppEmailFrom()) },
            { key: 'admin_notification', label: 'Admin Notification Email', configured: Boolean(process.env.ADMIN_NOTIFICATION_EMAIL?.trim()) },
        ],
        secrets: {
            emailUser: maskedValue(process.env.EMAIL_USER),
            emailPass: maskedValue(process.env.EMAIL_PASS),
            resendApiKey: maskedValue(process.env.RESEND_API_KEY),
        },
    };
}

function sanitizeSettingsPatch(input: any, deps: { CV_TEMPLATES: Array<{ key: string }>; normalizeEmail: (value: unknown) => string; sanitizeProfileField: (value: unknown, maxLength?: number) => string }) {
    const values: Record<string, unknown> = {};
    const booleanFields = ['maintenanceMode', 'announcementEnabled', 'emailVerificationRequired', 'payhereEnabled'];

    for (const field of booleanFields) {
        if (field in input) values[field] = input[field] === true;
    }

    if ('announcementText' in input) {
        values.announcementText = deps.sanitizeProfileField(input.announcementText, 180);
    }

    if ('supportEmail' in input) {
        const email = deps.normalizeEmail(input.supportEmail);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return { error: 'Enter a valid support email.' };
        }
        values.supportEmail = email;
    }

    if ('payhereModeLabel' in input) {
        if (input.payhereModeLabel !== 'sandbox' && input.payhereModeLabel !== 'live') {
            return { error: 'Choose a valid PayHere mode.' };
        }
        values.payhereModeLabel = input.payhereModeLabel;
    }

    for (const field of ['freeCvCreationLimit', 'freePdfDownloadLimit']) {
        if (field in input) {
            const value = Number(input[field]);
            if (!Number.isFinite(value) || value < 0 || value > 100) {
                return { error: 'Free limits must be between 0 and 100.' };
            }
            values[field] = Math.floor(value);
        }
    }

    if ('defaultTemplateKey' in input) {
        const key = deps.sanitizeProfileField(input.defaultTemplateKey, 80);
        if (!deps.CV_TEMPLATES.some((template) => template.key === key)) {
            return { error: 'Choose a valid default template.' };
        }
        values.defaultTemplateKey = key;
    }

    if ('cmsContent' in input) {
        values.cmsContent = sanitizeCmsContent(input.cmsContent, deps.sanitizeProfileField);
    }

    if ('emailTemplates' in input) {
        values.emailTemplates = sanitizeEmailTemplates(input.emailTemplates, deps.sanitizeProfileField);
    }

    return { values };
}

function sanitizeEmailTemplates(input: unknown, sanitizeProfileField: (value: unknown, maxLength?: number) => string): EmailTemplateMap {
    const merged = mergeEmailTemplates(input);
    const cleanSubject = (value: unknown) => sanitizeProfileField(value, 180);
    const cleanBody = (value: unknown) => sanitizeProfileField(value, 5000);
    return (Object.keys(DEFAULT_EMAIL_TEMPLATES) as EmailTemplateKey[]).reduce((templates, key) => {
        templates[key] = {
            ...DEFAULT_EMAIL_TEMPLATES[key],
            subject: cleanSubject(merged[key].subject) || DEFAULT_EMAIL_TEMPLATES[key].subject,
            body: cleanBody(merged[key].body) || DEFAULT_EMAIL_TEMPLATES[key].body,
        };
        return templates;
    }, {} as EmailTemplateMap);
}

function sanitizeCmsContent(input: unknown, sanitizeProfileField: (value: unknown, maxLength?: number) => string): CmsContent {
    const merged = mergeCmsContent(input);
    const cleanText = (value: unknown, max = 260) => sanitizeProfileField(value, max);
    const cleanParagraph = (value: unknown, max = 1600) => sanitizeProfileField(value, max);

    return {
        announcement: {
            enabled: merged.announcement.enabled === true,
            text: cleanText(merged.announcement.text, 180) || DEFAULT_CMS_CONTENT.announcement.text,
            linkLabel: cleanText(merged.announcement.linkLabel, 40),
            linkHref: sanitizeLink(merged.announcement.linkHref),
        },
        landing: {
            heroEyebrow: cleanText(merged.landing.heroEyebrow, 80) || DEFAULT_CMS_CONTENT.landing.heroEyebrow,
            heroTitle: cleanText(merged.landing.heroTitle, 90) || DEFAULT_CMS_CONTENT.landing.heroTitle,
            heroAccent: cleanText(merged.landing.heroAccent, 70),
            heroDescription: cleanParagraph(merged.landing.heroDescription, 300) || DEFAULT_CMS_CONTENT.landing.heroDescription,
            primaryCta: cleanText(merged.landing.primaryCta, 40) || DEFAULT_CMS_CONTENT.landing.primaryCta,
            secondaryCta: cleanText(merged.landing.secondaryCta, 40) || DEFAULT_CMS_CONTENT.landing.secondaryCta,
            statsEyebrow: cleanText(merged.landing.statsEyebrow, 70),
            statsTitle: cleanText(merged.landing.statsTitle, 120),
            featuresEyebrow: cleanText(merged.landing.featuresEyebrow, 70),
            featuresTitle: cleanText(merged.landing.featuresTitle, 140),
            featuresBadge: cleanText(merged.landing.featuresBadge, 120),
            templatesEyebrow: cleanText(merged.landing.templatesEyebrow, 70),
            templatesTitle: cleanText(merged.landing.templatesTitle, 140),
            templatesDescription: cleanParagraph(merged.landing.templatesDescription, 260),
            pricingEyebrow: cleanText(merged.landing.pricingEyebrow, 70),
            pricingTitle: cleanText(merged.landing.pricingTitle, 140),
            faqEyebrow: cleanText(merged.landing.faqEyebrow, 70),
            faqTitle: cleanText(merged.landing.faqTitle, 140),
            faqDescription: cleanParagraph(merged.landing.faqDescription, 260),
            testimonialsEyebrow: cleanText(merged.landing.testimonialsEyebrow, 70),
            testimonialsTitle: cleanText(merged.landing.testimonialsTitle, 140),
        },
        featureTiles: merged.featureTiles.slice(0, 8).map((tile) => ({
            title: cleanText(tile.title, 70) || DEFAULT_CMS_CONTENT.featureTiles[0].title,
            text: cleanParagraph(tile.text, 180) || DEFAULT_CMS_CONTENT.featureTiles[0].text,
        })),
        pricingPlans: merged.pricingPlans.map((plan): CmsPlanCopy => ({
            key: plan.key,
            name: cleanText(plan.name, 60) || plan.key,
            price: cleanText(plan.price, 40),
            duration: cleanText(plan.duration, 80),
            description: cleanParagraph(plan.description, 240),
            cta: cleanText(plan.cta, 40),
            badge: cleanText(plan.badge, 40),
            features: sanitizeList(plan.features, cleanText, 10, 120),
        })),
        faqs: merged.faqs.slice(0, 12).map((faq): CmsFaqItem => ({
            question: cleanText(faq.question, 160),
            answer: cleanParagraph(faq.answer, 700),
        })).filter((faq) => faq.question && faq.answer),
        legal: {
            privacy: sanitizeLegalPage(merged.legal.privacy, cleanText, cleanParagraph),
            terms: sanitizeLegalPage(merged.legal.terms, cleanText, cleanParagraph),
            refund: sanitizeLegalPage(merged.legal.refund, cleanText, cleanParagraph),
        },
    };
}

function sanitizeLegalPage(page: CmsLegalPage, cleanText: (value: unknown, max?: number) => string, cleanParagraph: (value: unknown, max?: number) => string): CmsLegalPage {
    return {
        title: cleanText(page.title, 100),
        lastUpdated: cleanText(page.lastUpdated, 40),
        sections: page.sections.slice(0, 12).map((section) => ({
            heading: cleanText(section.heading, 120),
            body: cleanParagraph(section.body, 1800),
            bullets: sanitizeList(section.bullets || [], cleanText, 8, 180),
        })).filter((section) => section.heading && section.body),
    };
}

function sanitizeList(values: unknown[], cleanText: (value: unknown, max?: number) => string, maxItems: number, maxLength: number) {
    return values
        .slice(0, maxItems)
        .map((value) => cleanText(value, maxLength))
        .filter(Boolean);
}

function sanitizeLink(value: unknown) {
    const link = typeof value === 'string' ? value.trim() : '';
    if (!link) return '';
    if (link.startsWith('/') || link.startsWith('#')) return link.slice(0, 200);
    if (/^https?:\/\//i.test(link)) return link.slice(0, 200);
    return '';
}
