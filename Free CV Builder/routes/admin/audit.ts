import { Router, Request, Response } from 'express';
import { bindDeps, type RouteDeps } from '../_shared';

export function registerAdminAuditRoutes(router: Router, deps: RouteDeps) {
    const { AdminAuditLog, requireAdminPermission, sendError, escapeRegex, adminAuditLogSummary } = bindDeps(deps);

    router.get('/api/admin/audit-logs', requireAdminPermission('audit.read'), async (req: Request, res: Response) => {
        try {
            const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
            const action = typeof req.query.action === 'string' ? req.query.action.trim() : '';
            const targetType = typeof req.query.targetType === 'string' ? req.query.targetType.trim() : '';
            const limit = Math.min(100, Math.max(10, Number.parseInt(String(req.query.limit || '50'), 10) || 50));
            const filter: any = {};

            if (action && action !== 'all') filter.action = action;
            if (targetType && targetType !== 'all') filter.targetType = targetType;
            if (search) {
                const pattern = new RegExp(escapeRegex(search), 'i');
                filter.$or = [
                    { action: pattern },
                    { targetType: pattern },
                    { targetId: pattern },
                    { targetLabel: pattern },
                ];
            }

            const logs = await AdminAuditLog.find(filter)
                .sort({ createdAt: -1 })
                .limit(limit)
                .populate('actorId', 'email displayName');

            const [actions, targetTypes] = await Promise.all([
                AdminAuditLog.distinct('action'),
                AdminAuditLog.distinct('targetType'),
            ]);

            return res.json({
                logs: logs.map(adminAuditLogSummary),
                filters: {
                    actions: actions.sort(),
                    targetTypes: targetTypes.sort(),
                },
            });
        } catch (error) {
            return sendError(res, 500, 'Could not load audit logs.', error);
        }
    });
}
