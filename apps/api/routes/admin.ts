import { Router } from 'express';
import { registerAdminAuditRoutes } from './admin/audit';
import { registerAdminBillingRoutes } from './admin/billing';
import { registerAdminSettingsRoutes } from './admin/settings';
import { registerAdminSummaryRoutes } from './admin/summary';
import { registerAdminSupportRoutes } from './admin/support';
import { registerAdminTemplateRoutes } from './admin/templates';
import { registerAdminUserRoutes } from './admin/users';

type RouteDeps = Record<string, any>;

export function registerAdminRoutes(router: Router, deps: RouteDeps) {
    registerAdminSummaryRoutes(router, deps);
    registerAdminUserRoutes(router, deps);
    registerAdminTemplateRoutes(router, deps);
    registerAdminBillingRoutes(router, deps);
    registerAdminSupportRoutes(router, deps);
    registerAdminSettingsRoutes(router, deps);
    registerAdminAuditRoutes(router, deps);
}
