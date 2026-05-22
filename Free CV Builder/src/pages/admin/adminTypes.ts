import type { UserRole } from '../../adminAccess';

export interface AdminSummary {
  widgets: {
    totalUsers: number;
    activeUsersToday: number;
    premiumSubscribers: number;
    totalCvsCreated: number;
    revenue: { cents: number; currency: string };
    supportTickets: Record<'open' | 'pending' | 'resolved' | 'closed', number>;
  };
  recentRegistrations: Array<{
    id: string;
    email: string;
    displayName: string;
    role: string;
    plan: string;
    createdAt: string;
  }>;
  templateUsage: Array<{ template: string; count: number }>;
  charts: {
    userGrowth: Array<{ day: string; count: number }>;
    subscriptionRevenue: Array<{ day: string; cents: number }>;
    cvDownloadsPerDay: Array<{ day: string; count: number }>;
    templateUsage: Array<{ template: string; count: number }>;
  };
  modules: Array<{ key: string; label: string; status: string }>;
}

export interface AdminUserListItem {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  plan: 'free' | 'payg' | 'monthly' | 'unlimited';
  rawPlan: 'free' | 'payg' | 'monthly';
  planExpiresAt?: string;
  emailVerified: boolean;
  authProvider: 'email' | 'google';
  cvCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserDetail extends AdminUserListItem {
  phone?: string;
  address?: string;
  planStartedAt?: string;
  paygCvSaveCredits: number;
}

export interface AdminUserDocument {
  id: string;
  title: string;
  template: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminTemplateItem {
  key: string;
  label: string;
  category: string;
  access: 'free' | 'paid';
  thumbnail: string;
  builtInThumbnail: string;
  surfaceColorRole: 'none' | 'sidebar' | 'header';
  surfaceColorLabel?: string | null;
  source: 'built_in' | 'custom';
  status: 'draft' | 'active' | 'archived';
  usageCount: number;
  updatedAt?: string;
}

export interface AdminPaymentItem {
  id: string;
  provider: string;
  paymentId: string;
  orderId: string;
  user: { id: string; email: string; displayName: string } | null;
  plan: 'payg' | 'monthly' | null;
  amount: string;
  amountCents: number;
  baseAmountCents?: number;
  discountCents?: number;
  finalAmountCents?: number;
  couponCode?: string;
  currency: string;
  statusCode: string;
  processed: boolean;
  rawPayload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AdminBillingPlan {
  plan: 'payg' | 'monthly';
  label: string;
  amount: string;
  cents: number;
  baseAmountCents: number;
  promotionDiscountCents: number;
  promotionActive: boolean;
  promotionLabel?: string;
  promotionDiscountType?: 'fixed' | 'percent';
  promotionDiscountValue?: number;
  discountBadge?: string;
  currency: 'LKR';
  source: string;
  updatedAt?: string;
}

export interface AdminCoupon {
  id: string;
  code: string;
  label: string;
  discountType: 'fixed' | 'percent';
  discountValue: number;
  active: boolean;
  appliesTo: Array<'payg' | 'monthly'>;
  expiresAt?: string;
  maxRedemptions?: number | null;
  redeemedCount: number;
}

export interface AdminBillingPlanDraft {
  label: string;
  amount: string;
  promotionActive: boolean;
  promotionLabel: string;
  promotionDiscountType: 'fixed' | 'percent';
  promotionDiscountValue: string;
}

export interface AdminPaymentSummary {
  totalRevenueCents: number;
  currency: string;
  processedCount: number;
  revenueByPlan: Record<string, number>;
  dailyRevenue: Array<{ day: string; cents: number }>;
}

export interface AdminSupportTicket {
  id: string;
  user: { id: string; email: string; displayName: string } | null;
  fullName: string;
  email: string;
  type: 'complaint' | 'bug' | 'feature_request' | 'payment_issue' | 'general';
  subject: string;
  message: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  adminNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminRoleConfig {
  role: UserRole;
  label: string;
  access: string[];
}

export interface AdminSettingsSummary {
  app: {
    maintenanceMode: boolean;
    announcementEnabled: boolean;
    announcementText: string;
    supportEmail: string;
    emailVerificationRequired: boolean;
    payhereEnabled: boolean;
    payhereModeLabel: 'sandbox' | 'live';
    freeCvCreationLimit: number;
    freePdfDownloadLimit: number;
    defaultTemplateKey: string;
    updatedAt?: string;
  };
  environment: string;
  port: string;
  origins: {
    frontend: string;
    api: string;
  };
  services: Array<{
    key: string;
    label: string;
    configured: boolean;
  }>;
  security: {
    sessionSecretConfigured: boolean;
    superAdminAllowlistCount: number;
  };
}

export interface AdminAuditLogItem {
  id: string;
  actor: { id: string; email: string; displayName: string } | null;
  action: string;
  targetType: string;
  targetId: string;
  targetLabel: string;
  metadata: Record<string, unknown>;
  ip: string;
  userAgent: string;
  createdAt: string;
}
