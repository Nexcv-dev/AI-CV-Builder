import { Router } from 'express';
import { registerAdminBillingRoutes } from './admin/billing';
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
}
