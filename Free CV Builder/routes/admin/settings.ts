import { Router, Request, Response } from 'express';
import { bindDeps, type RouteDeps } from '../_shared';
import { ADMIN_ROLE_ACCESS, ADMIN_ROLE_LABELS, ALL_USER_ROLES, isUserRole, type UserRole } from '../../src/adminAccess';
import { DEFAULT_APP_SETTINGS, getAppSettings } from '../../server-models/AppSetting';

const roleSummary = (role: UserRole) => ({
    role,
    label: role === 'user' ? 'User' : ADMIN_ROLE_LABELS[role],
    access: role === 'user' ? [] : ADMIN_ROLE_ACCESS[role],
});

const serviceStatus = (configured: boolean, label: string) => ({
    key: label.toLowerCase().replace(/\s+/g, '_'),
    label,
    configured,
});

export function registerAdminSettingsRoutes(router: Router, deps: RouteDeps) {
    const { User, AppSetting, CV_TEMPLATES, requireAdminPermission, sendError, currentUserId, isValidDocumentId, adminUserSummary, recordAdminAuditLog, normalizeEmail, sanitizeProfileField, isEmailServiceConfigured, getAppEmailFrom, sendSystemEmail } = bindDeps(deps);

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
            return res.json({
                app: appSettingsSummary(appSettings),
                environment: process.env.NODE_ENV || 'development',
                port: String(process.env.PORT || 3002),
                origins: {
                    frontend: process.env.FRONTEND_ORIGIN || '',
                    api: process.env.API_ORIGIN || '',
                },
                services: [
                    serviceStatus(Boolean(process.env.MONGO_URI || process.env.MONGODB_URI), 'MongoDB'),
                    serviceStatus(emailConfigured, 'Email'),
                    serviceStatus(Boolean(process.env.S3_TEMPLATE_BUCKET_NAME || process.env.TEMPLATE_BUCKET_NAME), 'S3 Templates'),
                    serviceStatus(Boolean(
                        (process.env.PAYHERE_MERCHANT_ID && process.env.PAYHERE_MERCHANT_SECRET) ||
                        (process.env.PAYHERE_SANDBOX_MERCHANT_ID && process.env.PAYHERE_SANDBOX_MERCHANT_SECRET)
                    ), 'PayHere'),
                    serviceStatus(Boolean(process.env.GEMINI_API_KEY), 'Gemini'),
                ],
                security: {
                    sessionSecretConfigured: Boolean(process.env.SESSION_SECRET),
                    superAdminAllowlistCount: (process.env.SUPER_ADMIN_EMAILS || '')
                        .split(',')
                        .map((email) => email.trim())
                        .filter(Boolean).length,
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

    router.post('/api/admin/settings/test-email', requireAdminPermission('settings.write'), async (req: Request, res: Response) => {
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
        updatedAt: settings?.updatedAt,
    };
}

function maskedValue(value: unknown) {
    return typeof value === 'string' && value.trim() ? 'Configured' : 'Missing';
}

function emailSettingsSummary(settings: any, deps: { isEmailServiceConfigured: () => boolean; getAppEmailFrom: () => string }) {
    const hasGmailApi = Boolean(
        (process.env.GMAIL_CLIENT_ID?.trim() || process.env.GOOGLE_CLIENT_ID?.trim()) &&
        (process.env.GMAIL_CLIENT_SECRET?.trim() || process.env.GOOGLE_CLIENT_SECRET?.trim()) &&
        process.env.GMAIL_REFRESH_TOKEN?.trim()
    );
    const hasResend = Boolean(process.env.RESEND_API_KEY?.trim());
    const hasSmtp = Boolean(process.env.EMAIL_USER?.trim() && process.env.EMAIL_PASS?.trim());
    const provider = hasGmailApi ? 'Gmail API' : hasResend ? 'Resend' : hasSmtp ? 'SMTP' : 'Not configured';

    return {
        configured: deps.isEmailServiceConfigured(),
        provider,
        from: deps.getAppEmailFrom() || '',
        supportEmail: settings?.supportEmail || DEFAULT_APP_SETTINGS.supportEmail,
        adminNotificationEmail: process.env.ADMIN_NOTIFICATION_EMAIL?.trim() || '',
        smtpHost: process.env.SMTP_HOST?.trim() || (hasSmtp ? 'smtp.gmail.com' : ''),
        smtpPort: process.env.SMTP_PORT?.trim() || (hasSmtp ? '587' : ''),
        checks: [
            { key: 'gmail_api', label: 'Gmail API', configured: hasGmailApi },
            { key: 'resend', label: 'Resend API', configured: hasResend },
            { key: 'smtp_credentials', label: 'SMTP Credentials', configured: hasSmtp },
            { key: 'email_from', label: 'Sender From', configured: Boolean(deps.getAppEmailFrom()) },
            { key: 'admin_notification', label: 'Admin Notification Email', configured: Boolean(process.env.ADMIN_NOTIFICATION_EMAIL?.trim()) },
        ],
        secrets: {
            emailUser: maskedValue(process.env.EMAIL_USER),
            emailPass: maskedValue(process.env.EMAIL_PASS),
            resendApiKey: maskedValue(process.env.RESEND_API_KEY),
            gmailRefreshToken: maskedValue(process.env.GMAIL_REFRESH_TOKEN),
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

    return { values };
}
