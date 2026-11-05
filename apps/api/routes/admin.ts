import { Router } from 'express';
import { registerAdminAuditRoutes, type AdminAuditRouteDeps } from './admin/audit';
import { registerAdminBillingRoutes, type AdminBillingRouteDeps } from './admin/billing';
import { registerAdminSettingsRoutes, type AdminSettingsRouteDeps } from './admin/settings';
import { registerAdminSummaryRoutes, type AdminSummaryRouteDeps } from './admin/summary';
import { registerAdminSupportRoutes, type AdminSupportRouteDeps } from './admin/support';
import { registerAdminTemplateRoutes, type AdminTemplatesRouteDeps } from './admin/templates';
import { registerAdminUserRoutes, type AdminUsersRouteDeps } from './admin/users';

export type AdminRouteDeps = AdminAuditRouteDeps
    & AdminBillingRouteDeps
    & AdminSettingsRouteDeps
    & AdminSummaryRouteDeps
    & AdminSupportRouteDeps
    & AdminTemplatesRouteDeps
    & AdminUsersRouteDeps;

export function registerAdminRoutes(router: Router, deps: AdminRouteDeps) {
    registerAdminSummaryRoutes(router, deps);
    registerAdminUserRoutes(router, deps);
    registerAdminTemplateRoutes(router, deps);
    registerAdminBillingRoutes(router, deps);
    registerAdminSupportRoutes(router, deps);
    registerAdminSettingsRoutes(router, deps);
    registerAdminAuditRoutes(router, deps);
}
