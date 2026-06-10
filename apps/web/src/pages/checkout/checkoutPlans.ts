import { Crown, Zap, type LucideIcon } from 'lucide-react';
import type { CheckoutPlanKey } from './checkoutTypes';

export const checkoutPlans: Record<CheckoutPlanKey, {
  key: CheckoutPlanKey;
  name: string;
  duration: string;
  summary: string;
  icon: LucideIcon;
  features: string[];
}> = {
  payg: {
    key: 'payg',
    name: 'Single CV Pass',
    duration: '7 days (One-time payment)',
    summary: 'One polished CV with unlimited edits and downloads for a focused application window.',
    icon: Zap,
    features: [
      '1 extra saved CV per purchase',
      'Any CV template',
      'Unlimited edits for 7 days',
      'Unlimited PDF downloads for 7 days',
      'Faster warm PDF downloads',
      'AI import, summary, and refine tools',
    ],
  },
  monthly: {
    key: 'monthly',
    name: 'Monthly Pro',
    duration: '30 days (One-time payment)',
    summary: 'Best for active job searches with multiple CV versions and repeated exports.',
    icon: Crown,
    features: [
      'Unlimited CV creation',
      'Unlimited saved CVs',
      'Any CV template',
      'Unlimited downloads for 30 days',
      'Faster warm PDF downloads',
      'AI import, summary, and refine tools',
    ],
  },
  quarterly: {
    key: 'quarterly',
    name: 'Pro Quarterly',
    duration: '90 days (One-time payment)',
    summary: 'Everything you need for a focused 3-month job search.',
    icon: Crown,
    features: [
      'Unlimited CV creation',
      'Unlimited saved CVs',
      'Any CV template',
      'Unlimited downloads for 90 days',
      'Faster warm PDF downloads',
      'AI import, summary, and refine tools',
    ],
  },
};

export function getPlanFromQuery(value: string | null): CheckoutPlanKey {
  return value === 'monthly' || value === 'quarterly' ? value : 'payg';
}
