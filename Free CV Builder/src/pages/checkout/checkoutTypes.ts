import type { AuthUser } from '../../utils/api';

export type CheckoutPlanKey = 'payg' | 'monthly' | 'quarterly';

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
  status: 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled';
  plan: CheckoutPlanKey;
  planActive: boolean;
  user?: AuthUser;
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
  currency: 'LKR' | 'USD';
  provider?: 'payhere' | 'lemonsqueezy';
  market?: 'local' | 'global';
}

export interface CheckoutQuote {
  plan: CheckoutPlanKey;
  currency: 'LKR' | 'USD';
  provider?: 'payhere' | 'lemonsqueezy';
  market?: 'local' | 'global';
  country?: string;
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
