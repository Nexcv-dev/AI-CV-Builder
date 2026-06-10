import { Router, Request, Response } from 'express';
import { bindDeps, type RouteDeps } from '../_shared';
import type { BillingPlan } from '../../server-models/userPlan';
import type { AdminUserDetail, AdminUserDocument, AdminUserListItem } from '@nexcv/api-contracts/admin';


export function registerAdminUserRoutes(router: Router, deps: RouteDeps) {
    const { User, CVDocument, requireAdminPermission, sendError, currentUserId, isValidDocumentId, createPlanExpiry, documentSummary, escapeRegex, adminUserSummary, recordAdminAuditLog, isUserRole, isPaidBillingPlan } = bindDeps(deps);

    router.get('/api/admin/users', requireAdminPermission('users.read'), async (req: Request, res: Response) => {
        try {
            const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
            const plan = typeof req.query.plan === 'string' ? req.query.plan.trim() : '';
            const role = typeof req.query.role === 'string' ? req.query.role.trim() : '';
            const page = Math.max(1, Number.parseInt(String(req.query.page || '1'), 10) || 1);
            const limit = Math.min(50, Math.max(5, Number.parseInt(String(req.query.limit || '20'), 10) || 20));
            const filter: any = {};
    
            if (search) {
                const pattern = new RegExp(escapeRegex(search), 'i');
                filter.$or = [{ email: pattern }, { displayName: pattern }];
            }
            if (plan === 'free' || isPaidBillingPlan(plan)) {
                filter.plan = plan;
            }
            if (isUserRole(role)) {
                filter.role = role;
            }
    
            const [users, total] = await Promise.all([
                User.find(filter)
                    .sort({ createdAt: -1 })
                    .skip((page - 1) * limit)
                    .limit(limit)
                    .select('email displayName role plan planExpiresAt emailVerified authProvider createdAt updatedAt'),
                User.countDocuments(filter),
            ]);
    
            const userIds = users.map((user) => user._id);
            const cvCounts = await CVDocument.aggregate([
                { $match: { userId: { $in: userIds } } },
                { $group: { _id: '$userId', count: { $sum: 1 } } },
            ]);
            const cvCountMap = new Map(cvCounts.map((item: any) => [item._id.toString(), item.count]));
    
            const response = {
                users: users.map((user) => adminUserSummary(user, cvCountMap.get(user._id.toString()) || 0)),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.max(1, Math.ceil(total / limit)),
                },
            } satisfies {
                users: AdminUserListItem[];
                pagination: { page: number; limit: number; total: number; totalPages: number };
            };
            return res.json(response);
        } catch (error) {
            return sendError(res, 500, 'Could not load admin users.', error);
        }
    });


    router.get('/api/admin/users/:id', requireAdminPermission('users.read'), async (req: Request, res: Response) => {
        try {
            if (!isValidDocumentId(req.params.id)) {
                return res.status(400).json({ error: 'Invalid user id.' });
            }
    
            const user = await User.findById(req.params.id).select('email displayName role plan planStartedAt planExpiresAt paygCvSaveCredits emailVerified authProvider phone address createdAt updatedAt');
            if (!user) {
                return res.status(404).json({ error: 'User not found.' });
            }
    
            const [documents, cvCount] = await Promise.all([
                CVDocument.find({ userId: user._id })
                    .sort({ updatedAt: -1 })
                    .limit(10)
                    .select('title template status createdAt updatedAt'),
                CVDocument.countDocuments({ userId: user._id }),
            ]);
    
            const response = {
                user: {
                    ...adminUserSummary(user, cvCount),
                    phone: user.phone,
                    address: user.address,
                    planStartedAt: user.planStartedAt,
                    paygCvSaveCredits: user.paygCvSaveCredits || 0,
                },
                documents: documents.map(documentSummary),
            } satisfies { user: AdminUserDetail; documents: AdminUserDocument[] };
            return res.json(response);
        } catch (error) {
            return sendError(res, 500, 'Could not load admin user.', error);
        }
    });


    router.patch('/api/admin/users/:id/plan', requireAdminPermission('users.plan.update'), async (req: Request, res: Response) => {
        try {
            if (!isValidDocumentId(req.params.id)) {
                return res.status(400).json({ error: 'Invalid user id.' });
            }
    
            const plan = req.body.plan as BillingPlan;
            if (plan !== 'free' && !isPaidBillingPlan(plan)) {
                return res.status(400).json({ error: 'Choose a valid plan.' });
            }
    
            const user = await User.findById(req.params.id);
            if (!user) {
                return res.status(404).json({ error: 'User not found.' });
            }
    
            const previousPlan = user.plan;
            user.plan = plan;
            if (plan === 'free') {
                user.planStartedAt = undefined;
                user.planExpiresAt = undefined;
            } else {
                user.planStartedAt = new Date();
                user.planExpiresAt = createPlanExpiry(plan);
                if (plan === 'payg') {
                    user.paygCvSaveCredits = Math.max(1, user.paygCvSaveCredits || 0);
                }
            }
    
            await user.save();
            await recordAdminAuditLog({
                actorId: currentUserId(req),
                action: 'user.plan.updated',
                targetType: 'user',
                targetId: user._id.toString(),
                targetLabel: user.email,
                metadata: { previousPlan, nextPlan: plan },
                ip: req.ip,
                userAgent: req.get('user-agent'),
            });
            const cvCount = await CVDocument.countDocuments({ userId: user._id });
            return res.json({ user: adminUserSummary(user, cvCount) });
        } catch (error) {
            return sendError(res, 500, 'Could not update user plan.', error);
        }
    });

}

