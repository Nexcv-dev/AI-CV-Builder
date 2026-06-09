import type { UserRole } from '@nexcv/shared/admin';

export type CheckoutPlanKey = 'payg' | 'monthly' | 'quarterly';
export type BillingCurrency = 'LKR' | 'USD';
export type BillingMarket = 'local' | 'global';
export type BillingProvider = 'payhere' | 'lemonsqueezy';
export type CheckoutStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled';

export interface PublicAuthUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  plan: 'free' | CheckoutPlanKey | 'unlimited';
  planExpiresAt?: string;
  emailVerified: boolean;
  hasPassword?: boolean;
  profileImage?: string;
  phone?: string;
  address?: string;
  dob?: string;
  gender?: string;
  nationality?: string;
  authProvider: 'google' | 'github' | 'linkedin' | 'email';
}

export interface BillingPlanPrice {
  plan: CheckoutPlanKey;
  amount: string;
  cents: number;
  baseAmountCents: number;
  promotionDiscountCents: number;
  promotionActive: boolean;
  promotionLabel?: string;
  discountBadge?: string;
  currency: BillingCurrency;
  provider?: BillingProvider;
  market?: BillingMarket;
}

export interface BillingPlansResponse {
  country: string;
  detectedCountry?: string;
  source?: string;
  market: BillingMarket;
  provider: BillingProvider;
  plans: BillingPlanPrice[];
}

export interface FeaturedCoupon {
  code: string;
  label: string;
  discountType: 'fixed' | 'percent';
  discountValue: number;
  appliesTo: CheckoutPlanKey[];
  redeemedCount: number;
  maxRedemptions: number | null;
}

export interface FeaturedCouponResponse {
  coupon: FeaturedCoupon | null;
}

export interface CheckoutQuote {
  plan: CheckoutPlanKey;
  currency: BillingCurrency;
  provider?: BillingProvider;
  market?: BillingMarket;
  country?: string;
  countrySource?: string;
  baseAmountCents: number;
  discountCents: number;
  promotionDiscountCents?: number;
  couponDiscountCents?: number;
  finalAmountCents: number;
  amount: string;
  couponCode?: string;
  couponLabel?: string;
  promotionLabel?: string;
  discountBadge?: string;
}

export interface CheckoutQuoteResponse {
  quote: CheckoutQuote;
}

export interface PayHereCheckoutResponse {
  actionUrl: string;
  orderId: string;
  fields: Record<string, string>;
  quote: CheckoutQuote;
}

export interface LemonSqueezyCheckoutResponse {
  checkoutId: string;
  checkoutUrl: string;
  orderId: string;
  quote: CheckoutQuote;
}

export interface CheckoutStatusResponse {
  status: CheckoutStatus;
  plan: CheckoutPlanKey;
  planActive: boolean;
  user?: PublicAuthUser;
}

export interface CheckoutCancelResponse {
  status: CheckoutStatus | 'ignored';
}

export interface CheckoutCustomerFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  countryCode: string;
  country: string;
}
