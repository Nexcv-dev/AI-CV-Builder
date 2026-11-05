import React, { Suspense, lazy, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ADMIN_ROLE_LABELS, getRoleAccess, hasAdminPermission, isAdminRole } from './adminPermissions';
import { apiFetch } from '../../utils/api';
import { adminNavItems } from './adminUtils';
import { ADMIN_PAGE_META, activeAdminNavItem, adminPageKey } from './adminPageMeta';
import { AdminMobileNav, AdminPageHeader, AdminSidebar } from './AdminShellComponents';
import { AdminErrorNotice, AdminLoadingState } from './AdminSharedComponents';
import { AdminOverviewSection, AnalyticsDashboardSection } from './AdminOverviewSections';
import { useAdminAudit } from './hooks/useAdminAudit';
import { useAdminBilling } from './hooks/useAdminBilling';
import { useAdminBootstrap } from './hooks/useAdminBootstrap';
import { useAdminPromotions } from './hooks/useAdminPromotions';
import { useAdminRoles } from './hooks/useAdminRoles';
import { useAdminSettings } from './hooks/useAdminSettings';
import { useAdminSupport } from './hooks/useAdminSupport';
import { useAdminTemplates } from './hooks/useAdminTemplates';
import { useAdminUsers } from './hooks/useAdminUsers';

const UserManagementSection = lazy(() => import('./UserManagementSection'));
const TemplateManagementSection = lazy(() => import('./TemplateManagementSection'));
const BillingManagementSection = lazy(() => import('./BillingManagementSection'));
const PromotionManagementSection = lazy(() => import('./PromotionManagementSection'));
const SupportManagementSection = lazy(() => import('./SupportManagementSection'));
const RoleManagementSection = lazy(() => import('./RoleManagementSection'));
const SettingsManagementSection = lazy(() => import('./SettingsManagementSection'));
const EmailManagementSection = lazy(() => import('./EmailManagementSection'));
const AuditLogSection = lazy(() => import('./AuditLogSection'));

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading, summary, user } = useAdminBootstrap();

  const activeNav = activeAdminNavItem(location.pathname);
  const page = adminPageKey(activeNav.key);
  const pageMeta = ADMIN_PAGE_META[page];

  // Each hook loads its data only while its page is open.
  const users = useAdminUsers({ enabled: page === 'users' });
  const templates = useAdminTemplates({ enabled: page === 'templates' || page === 'settings' });
  const billing = useAdminBilling({ enabled: page === 'billing' });
  const promotions = useAdminPromotions({ enabled: page === 'promotions' });
  const support = useAdminSupport({ enabled: page === 'support' });
  const roles = useAdminRoles({ enabled: page === 'roles' });
  const settings = useAdminSettings({ enabled: page === 'settings' || page === 'notifications' || page === 'cms' });
  const audit = useAdminAudit({ enabled: page === 'audit' });

  const signOut = async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    navigate('/');
  };

  const navAccess = getRoleAccess(user?.role);
  const userRoleLabel = isAdminRole(user?.role) ? ADMIN_ROLE_LABELS[user.role] : 'Admin';
  const canUpdateUserPlans = hasAdminPermission(user, 'users.plan.update');
  const canUpdateRoles = hasAdminPermission(user, 'users.role.update');
  const canUpdateSettings = hasAdminPermission(user, 'settings.write');
  const canUpdateEmail = hasAdminPermission(user, 'email.write');
  const canReviewBilling = hasAdminPermission(user, 'billing.write');
  const maxChartValue = useMemo(() => {
    const values = [
      ...(summary?.charts.userGrowth.map((item) => item.count) || []),
      ...(summary?.charts.cvSavesPerDay.map((item) => item.count) || []),
      ...(summary?.charts.cvDownloadsPerDay.map((item) => item.count) || []),
    ];
    return Math.max(1, ...values);
  }, [summary]);

  const renderSection = () => {
    switch (page) {
      case 'users':
        return (
          <UserManagementSection
            users={users.users}
            loading={users.usersLoading || users.detailLoading}
            search={users.userSearch}
            planFilter={users.planFilter}
            roleFilter={users.roleFilter}
            onSearchChange={users.setUserSearch}
            onPlanFilterChange={users.setPlanFilter}
            onRoleFilterChange={users.setRoleFilter}
            onOpenUser={users.openUserDetail}
            selectedUser={users.selectedUser}
            selectedUserDocuments={users.selectedUserDocuments}
            selectedPlan={users.selectedPlan}
            savingPlan={users.savingPlan}
            canUpdatePlan={canUpdateUserPlans}
            onSelectedPlanChange={users.setSelectedPlan}
            onSavePlan={users.updateSelectedUserPlan}
            onCloseDetail={() => users.setSelectedUser(null)}
          />
        );
      case 'analytics':
        if (isLoading) return <AdminLoadingState label="Loading analytics..." />;
        if (!summary) return <AdminErrorNotice message="Analytics could not be loaded." />;
        return <AnalyticsDashboardSection summary={summary} maxChartValue={maxChartValue} />;
      case 'templates':
        return (
          <TemplateManagementSection
            templates={templates.visibleTemplates}
            categories={templates.templateCategories}
            loading={templates.templatesLoading}
            search={templates.templateSearch}
            categoryFilter={templates.templateCategoryFilter}
            accessFilter={templates.templateAccessFilter}
            selectedTemplate={templates.selectedTemplate}
            templateForm={templates.templateForm}
            templateFileForm={templates.templateFileForm}
            templateValidation={templates.templateValidation}
            templateWarningConfirmationPending={templates.templateWarningConfirmationPending}
            savingTemplate={templates.savingTemplate}
            createTemplateOpen={templates.createTemplateOpen}
            customTemplateForm={templates.customTemplateForm}
            creatingTemplate={templates.creatingTemplate}
            onSearchChange={templates.setTemplateSearch}
            onCategoryFilterChange={templates.setTemplateCategoryFilter}
            onAccessFilterChange={templates.setTemplateAccessFilter}
            onOpenTemplate={templates.openTemplateDetail}
            onCloseDetail={() => templates.setSelectedTemplate(null)}
            onFormChange={templates.setTemplateForm}
            onTemplateFileFormChange={templates.setTemplateFileForm}
            onSelectedTemplateFileChange={templates.setSelectedTemplateFile}
            onSaveTemplate={templates.saveSelectedTemplate}
            onOpenCreate={() => templates.setCreateTemplateOpen(true)}
            onCloseCreate={() => templates.setCreateTemplateOpen(false)}
            onCustomFormChange={templates.setCustomTemplateForm}
            onCustomFileChange={templates.setCustomTemplateFile}
            onCreateTemplate={templates.createCustomTemplate}
            onChangeCustomStatus={templates.changeCustomTemplateStatus}
          />
        );
      case 'billing':
        return (
          <BillingManagementSection
            payments={billing.payments}
            summary={billing.paymentSummary}
            loading={billing.paymentsLoading}
            search={billing.paymentSearch}
            planFilter={billing.paymentPlanFilter}
            statusFilter={billing.paymentStatusFilter}
            selectedPayment={billing.selectedPayment}
            reviewNote={billing.billingReviewNote}
            reviewingPaymentId={billing.reviewingPaymentId}
            canReviewPayments={canReviewBilling}
            onSearchChange={billing.setPaymentSearch}
            onPlanFilterChange={billing.setPaymentPlanFilter}
            onStatusFilterChange={billing.setPaymentStatusFilter}
            onOpenPayment={billing.openPaymentDetail}
            onCloseDetail={billing.closePaymentDetail}
            onReviewNoteChange={billing.setBillingReviewNote}
            onMarkReviewed={billing.markBillingReviewResolved}
          />
        );
      case 'promotions':
        return (
          <PromotionManagementSection
            billingPlans={promotions.billingPlans}
            coupons={promotions.coupons}
            couponForm={promotions.couponForm}
            savingBilling={promotions.savingBilling}
            onUpdatePlanPrice={promotions.updateBillingPlanPrice}
            onCouponFormChange={promotions.setCouponForm}
            onSaveCoupon={promotions.saveCoupon}
            onToggleCoupon={promotions.toggleCoupon}
            onDeleteCoupon={promotions.deleteCoupon}
          />
        );
      case 'cms':
      case 'settings':
        return (
          <SettingsManagementSection
            settings={settings.settings}
            loading={settings.settingsLoading}
            saving={settings.savingSettings}
            canUpdateSettings={canUpdateSettings}
            templates={templates.templates}
            onSave={settings.saveSettings}
            mode={page === 'cms' ? 'cms' : undefined}
          />
        );
      case 'support':
        return (
          <SupportManagementSection
            tickets={support.supportTickets}
            summary={support.supportSummary}
            loading={support.supportLoading}
            search={support.supportSearch}
            statusFilter={support.supportStatusFilter}
            typeFilter={support.supportTypeFilter}
            selectedTicket={support.selectedTicket}
            ticketForm={support.ticketForm}
            replyMessage={support.supportReplyMessage}
            savingTicket={support.savingTicket}
            sendingReply={support.sendingSupportReply}
            onSearchChange={support.setSupportSearch}
            onStatusFilterChange={support.setSupportStatusFilter}
            onTypeFilterChange={support.setSupportTypeFilter}
            onOpenTicket={support.openTicketDetail}
            onCloseDetail={support.closeTicketDetail}
            onFormChange={support.setTicketForm}
            onSaveTicket={support.saveSelectedTicket}
            onReplyMessageChange={support.setSupportReplyMessage}
            onSendReply={support.sendSupportReply}
          />
        );
      case 'roles':
        return (
          <RoleManagementSection
            roles={roles.roles}
            admins={roles.adminUsers}
            users={roles.recentUsers}
            loading={roles.rolesLoading}
            savingUserId={roles.savingRoleUserId}
            canUpdateRoles={canUpdateRoles}
            onChangeRole={roles.changeUserRole}
          />
        );
      case 'notifications':
        return (
          <EmailManagementSection
            settings={settings.settings}
            loading={settings.settingsLoading}
            saving={settings.savingSettings}
            sendingTestEmail={settings.sendingTestEmail}
            canUpdateEmail={canUpdateEmail}
            onSave={settings.saveSettings}
            onSendTestEmail={settings.sendTestEmail}
          />
        );
      case 'audit':
        return (
          <AuditLogSection
            logs={audit.auditLogs}
            loading={audit.auditLoading}
            search={audit.auditSearch}
            actionFilter={audit.auditActionFilter}
            targetTypeFilter={audit.auditTargetTypeFilter}
            actions={audit.auditActions}
            targetTypes={audit.auditTargetTypes}
            onSearchChange={audit.setAuditSearch}
            onActionFilterChange={audit.setAuditActionFilter}
            onTargetTypeFilterChange={audit.setAuditTargetTypeFilter}
          />
        );
      case 'dashboard':
        if (isLoading) return <AdminLoadingState label="Loading admin panel..." />;
        if (!summary) return <AdminErrorNotice message="Admin summary could not be loaded." />;
        return <AdminOverviewSection summary={summary} maxChartValue={maxChartValue} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="lg:flex lg:h-dvh lg:overflow-hidden">
        <AdminSidebar
          items={adminNavItems}
          activeKey={activeNav.key}
          navAccess={navAccess}
          user={user}
          onSignOut={signOut}
        />

        <main className="scrollbar-hide mx-auto min-w-0 max-w-7xl flex-1 px-3 pb-10 pt-5 sm:px-6 lg:h-dvh lg:overflow-y-auto lg:px-8 lg:pt-8">
          <AdminMobileNav items={adminNavItems} activeKey={activeNav.key} navAccess={navAccess} />
          <AdminPageHeader
            title={pageMeta.title}
            description={pageMeta.description}
            userRoleLabel={userRoleLabel}
            showSearch={pageMeta.searchPlaceholder !== null}
            searchPlaceholder={pageMeta.searchPlaceholder ?? ''}
          />

          <Suspense fallback={<AdminLoadingState label="Loading admin section..." />}>
            {renderSection()}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
