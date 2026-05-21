import { Router, Request, Response } from 'express';
import { bindDeps, type RouteDeps } from '../_shared';
import { ADMIN_ROLE_ACCESS, ADMIN_ROLE_LABELS, ALL_USER_ROLES, isUserRole, type UserRole } from '../../src/adminAccess';

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
    const { User, requireAdminPermission, sendError, currentUserId, isValidDocumentId, adminUserSummary, recordAdminAuditLog } = bindDeps(deps);

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
            return res.json({
                environment: process.env.NODE_ENV || 'development',
                port: String(process.env.PORT || 3002),
                origins: {
                    frontend: process.env.FRONTEND_ORIGIN || '',
                    api: process.env.API_ORIGIN || '',
                },
                services: [
                    serviceStatus(Boolean(process.env.MONGO_URI || process.env.MONGODB_URI), 'MongoDB'),
                    serviceStatus(Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS), 'Email'),
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
            });
        } catch (error) {
            return sendError(res, 500, 'Could not load admin settings.', error);
        }
    });
}
