import type { UserRole } from '@nexcv/shared/admin';

export type AdminPlanKey = 'free' | 'payg' | 'monthly' | 'quarterly' | 'unlimited';
export type BillingPlanKey = 'payg' | 'monthly' | 'quarterly';
export type BillingCurrency = 'LKR' | 'USD';
export type BillingMarket = 'local' | 'global';
export type BillingProvider = 'payhere' | 'lemonsqueezy';
export type TemplateAccess = 'free' | 'paid';
export type TemplateSource = 'built_in' | 'custom';
export type TemplateStatus = 'draft' | 'active' | 'archived';
export type TemplateSurfaceColorRole = 'none' | 'sidebar' | 'header';
export type SupportTicketStatus = 'open' | 'pending' | 'resolved' | 'closed';
export type SupportTicketType = 'complaint' | 'bug' | 'feature_request' | 'payment_issue' | 'general';
export type SupportTicketPriority = 'low' | 'normal' | 'high' | 'urgent';

export type PlanKey = 'free' | 'payg' | 'monthly' | 'quarterly';

export interface CmsPlanCopy {
  key: PlanKey;
  name: string;
  price: string;
  duration: string;
  description: string;
  cta: string;
  badge: string;
  features: string[];
}

export interface CmsFaqItem {
  question: string;
  answer: string;
}

export interface CmsLegalSection {
  heading: string;
  body: string;
  bullets?: string[];
}

export interface CmsLegalPage {
  title: string;
  lastUpdated: string;
  sections: CmsLegalSection[];
}

export interface CmsContent {
  announcement: {
    enabled: boolean;
    text: string;
    linkLabel: string;
    linkHref: string;
  };
  landing: {
    heroEyebrow: string;
    heroTitle: string;
    heroAccent: string;
    heroDescription: string;
    primaryCta: string;
    secondaryCta: string;
    statsEyebrow: string;
    statsTitle: string;
    featuresEyebrow: string;
    featuresTitle: string;
    featuresBadge: string;
    templatesEyebrow: string;
    templatesTitle: string;
    templatesDescription: string;
    pricingEyebrow: string;
    pricingTitle: string;
    faqEyebrow: string;
    faqTitle: string;
    faqDescription: string;
    testimonialsEyebrow: string;
    testimonialsTitle: string;
  };
  featureTiles: Array<{
    title: string;
    text: string;
  }>;
  pricingPlans: CmsPlanCopy[];
  faqs: CmsFaqItem[];
  legal: {
    privacy: CmsLegalPage;
    terms: CmsLegalPage;
    refund: CmsLegalPage;
  };
}

export type EmailTemplateKey =
  | 'verification'
  | 'passwordReset'
  | 'supportReply'
  | 'paymentReceipt'
  | 'maintenanceNotice';

export interface EmailTemplate {
  key: EmailTemplateKey;
  label: string;
  description: string;
  subject: string;
  body: string;
  variables: string[];
}

export type EmailTemplateMap = Record<EmailTemplateKey, EmailTemplate>;

export interface AdminSummary {
  widgets: {
    totalUsers: number;
    activeUsersToday: number;
    premiumSubscribers: number;
    totalCvsCreated: number;
    revenue: { cents: number; currency: string };
    revenueByCurrency?: Record<string, { cents: number; count: number }>;
    supportTickets: Record<SupportTicketStatus, number>;
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
    cvSavesPerDay: Array<{ day: string; count: number }>;
    subscriptionRevenue: Array<{ day: string; cents: number }>;
    subscriptionRevenueByCurrency?: Array<{ day: string; currencies: Record<string, number> }>;
    cvDownloadsPerDay: Array<{ day: string; count: number }>;
    checkoutConversion: Array<{ day: string; started: number; paid: number }>;
    templateUsage: Array<{ template: string; count: number }>;
  };
  analytics: {
    signups: number;
    cvSaves: number;
    downloads: number;
    checkoutStarted: number;
    checkoutPaid: number;
    checkoutConversionRate: number;
  };
}

export interface AdminUserListItem {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  plan: AdminPlanKey;
  rawPlan: PlanKey;
  planExpiresAt?: string;
  emailVerified: boolean;
  authProvider: 'email' | 'google' | 'github' | 'linkedin';
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
  access: TemplateAccess;
  thumbnail: string;
  builtInThumbnail: string;
  surfaceColorRole: TemplateSurfaceColorRole;
  surfaceColorLabel?: string | null;
  defaultThemeColor: string;
  source: TemplateSource;
  status: TemplateStatus;
  usageCount: number;
  updatedAt?: string;
}

export interface AdminTemplateValidationIssue {
  severity: 'error' | 'warn';
  fileName: string;
  message: string;
}

export interface AdminTemplateValidationResult {
  errors: AdminTemplateValidationIssue[];
  warnings: AdminTemplateValidationIssue[];
}

export interface AdminPaymentItem {
  id: string;
  provider: string;
  paymentId: string;
  orderId: string;
  reviewType?: 'payment' | 'checkout';
  reviewStatus?: 'processed' | 'unprocessed' | 'expired' | 'pending' | 'failed' | 'cancelled';
  billingReviewStatus?: 'open' | 'resolved';
  reviewedAt?: string;
  reviewNote?: string;
  user: { id: string; email: string; displayName: string } | null;
  plan: BillingPlanKey | null;
  amount: string;
  amountCents: number;
  baseAmountCents?: number;
  discountCents?: number;
  finalAmountCents?: number;
  couponCode?: string;
  currency: string;
  statusCode: string;
  processed: boolean;
  processingStartedAt?: string;
  processedAt?: string;
  rawPayload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AdminBillingPlan {
  plan: BillingPlanKey;
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
  currency: BillingCurrency;
  market: BillingMarket;
  provider: BillingProvider;
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
  appliesTo: BillingPlanKey[];
  expiresAt?: string;
  maxRedemptions?: number | null;
  redeemedCount: number;
  lemonSqueezyDiscountId?: string;
  lemonSqueezySyncStatus?: 'synced' | 'not_synced' | 'deleted';
  lemonSqueezySyncError?: string;
  lemonSqueezyLastSyncedAt?: string;
  updatedAt?: string;
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
  pendingCheckoutCount: number;
  checkoutReviewCount: number;
  failedPaymentCount: number;
  revenueByPlan: Record<string, number>;
  dailyRevenue: Array<{ day: string; cents: number }>;
  revenueByCurrency?: Record<string, { cents: number; count: number }>;
  revenueByProvider?: Record<string, {
    count: number;
    byCurrency: Record<string, { cents: number; count: number }>;
  }>;
  revenueByPlanCurrency?: Record<string, Record<string, number>>;
  dailyRevenueByCurrency?: Array<{ day: string; currencies: Record<string, number> }>;
}

export interface AdminSupportTicket {
  id: string;
  user: { id: string; email: string; displayName: string } | null;
  fullName: string;
  email: string;
  type: SupportTicketType;
  subject: string;
  message: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
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
    cmsContent: CmsContent;
    emailTemplates: EmailTemplateMap;
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
    status: 'ok' | 'warn' | 'error';
    configured: boolean;
    detail: string;
  }>;
  security: {
    sessionSecretConfigured: boolean;
    superAdminAllowlistCount: number;
    adminIpAllowlistConfigured: boolean;
    payhereCheckoutUrl: string;
    payhereNotifyUrlConfigured: boolean;
    pdfLambdaConfigured: boolean;
  };
  email: {
    configured: boolean;
    provider: string;
    from: string;
    supportEmail: string;
    adminNotificationEmail: string;
    smtpHost: string;
    smtpPort: string;
    checks: Array<{
      key: string;
      label: string;
      configured: boolean;
    }>;
    secrets: Record<string, string>;
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
