export type {
  AdminAuditLogItem,
  AdminBillingPlan,
  AdminBillingPlanDraft,
  AdminCoupon,
  AdminPaymentItem,
  AdminPaymentSummary,
  AdminRoleConfig,
  AdminSettingsSummary,
  AdminSummary,
  AdminSupportTicket,
  AdminTemplateItem,
  AdminTemplateValidationIssue,
  AdminTemplateValidationResult,
  AdminUserDetail,
  AdminUserDocument,
  AdminUserListItem,
  BillingPlanKey,
  CmsContent,
  CmsFaqItem,
  CmsLegalPage,
  CmsPlanCopy,
  EmailTemplate,
  EmailTemplateKey,
  EmailTemplateMap,
} from '@nexcv/api-contracts/admin';

import type { AdminSupportTicket } from '@nexcv/api-contracts/admin';

// Frontend-only form and summary shapes shared by the admin hooks and sections.

export interface AdminCouponForm {
  code: string;
  label: string;
  discountType: 'fixed' | 'percent';
  discountValue: string;
  /** A plan key, or 'pro' (monthly + quarterly) or 'both' (every paid plan). */
  appliesTo: string;
  maxRedemptions: string;
  active: boolean;
}

export interface AdminTicketForm {
  status: AdminSupportTicket['status'];
  priority: AdminSupportTicket['priority'];
  adminNotes: string;
}

export type AdminSupportSummary = Record<'open' | 'pending' | 'resolved' | 'closed', number>;
