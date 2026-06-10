import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Crown, Download, FileText, Sparkles, Zap, type LucideIcon } from 'lucide-react';
import { SiteHeader } from '../components/SiteHeader';
import { usePublicContent } from '../hooks/usePublicContent';
import { AuthUser, apiFetch, getCurrentUser } from '../utils/api';
import { detectClientBillingCountry } from '../utils/countries';

type PlanKey = 'free' | 'payg' | 'monthly' | 'quarterly';

type FeaturedCoupon = {
  code: string;
  label: string;
  discountType: 'fixed' | 'percent';
  discountValue: number;
  appliesTo: Array<'payg' | 'monthly' | 'quarterly'>;
  redeemedCount: number;
  maxRedemptions: number | null;
};

const splitPriceLabel = (price: string) => {
  const trimmedPrice = price.trim();
  if (trimmedPrice.startsWith('$')) {
    return { currency: '$', amount: trimmedPrice.slice(1) };
  }

  const currencyMatch = trimmedPrice.match(/^(LKR|USD)\s+(.+)$/);
  return currencyMatch ? { currency: currencyMatch[1], amount: currencyMatch[2] } : null;
};

const PriceAmount = ({ price, compact = false, className = '' }: { price: string; compact?: boolean; className?: string }) => {
  const parts = splitPriceLabel(price);
  if (!parts) return <span className={className}>{price}</span>;

  return (
    <span className={`inline-flex items-start gap-1 ${className}`}>
      <span className={`${compact ? 'text-[10px]' : 'text-xs'} font-black leading-none opacity-80 translate-y-1`}>
        {parts.currency}
      </span>
      <span className={`${compact ? 'text-lg' : 'text-4xl'} font-black leading-none`}>
        {parts.amount}
      </span>
    </span>
  );
};

const plans: Array<{
  key: PlanKey;
  name: string;
  duration: string;
  description: string;
  cta?: string;
  badge?: string;
  features: string[];
  icon: LucideIcon;
  highlighted?: boolean;
}> = [
  {
    key: 'free',
    name: 'Free',
    duration: 'starter access',
    description: 'Try the builder with a single saved CV and one watermarked export.',
    icon: FileText,
    features: [
      '1 saved CV',
      'Classic template',
      '1 watermarked PDF download',
      'Manual editing tools',
    ],
  },
  {
    key: 'payg',
    name: 'Single CV Pass',
    duration: '7 days (One-time payment)',
    description: 'Perfect when you need one polished CV ready for applications this week.',
    icon: Zap,
    features: [
      '1 extra saved CV per purchase',
      'Any template',
      'Unlimited edits for 7 days',
      'Unlimited downloads for 7 days',
      'Faster warm PDF downloads',
      'AI import, summary, and refine tools',
    ],
  },
  {
    key: 'monthly',
    name: 'Monthly Pro',
    duration: '30 days (One-time payment)',
    description: 'For active job searches with multiple CV versions and unlimited exports.',
    icon: Crown,
    features: [
      'Unlimited CV creation',
      'Unlimited saved CVs',
      'Any template',
      'Unlimited downloads for 30 days',
      'Faster warm PDF downloads',
      'AI import, summary, and refine tools',
    ],
  },
  {
    key: 'quarterly',
    name: 'Pro Quarterly',
    duration: '90 days (One-time payment)',
    description: 'Everything you need for a focused 3-month job search.',
    icon: Crown,
    highlighted: true,
    features: [
      'Unlimited CV creation',
      'Unlimited saved CVs',
      'Any template',
      'Unlimited downloads for 90 days',
      'Faster warm PDF downloads',
      'AI import, summary, and refine tools',
    ],
  },
];

export default function PricingPage() {
  const cmsContent = usePublicContent();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [planPrices, setPlanPrices] = useState<Record<string, {
    cents: number;
    baseAmountCents: number;
    promotionActive: boolean;
    promotionLabel?: string;
    discountBadge?: string;
    currency: string;
    provider?: string;
    market?: 'local' | 'global';
  }> | null>(null);
  const [resolvedCountry, setResolvedCountry] = useState('GLOBAL');
  const [billingCurrency, setBillingCurrency] = useState('USD');
  const [featuredCoupon, setFeaturedCoupon] = useState<FeaturedCoupon | null>(null);

  useEffect(() => {
    let ignore = false;
    getCurrentUser()
      .then((currentUser) => {
        if (!ignore) setUser(currentUser);
      })
      .catch(() => {
        if (!ignore) setUser(null);
      })
      .finally(() => {
        if (!ignore) setLoadingUser(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    const country = detectClientBillingCountry();
    const suffix = country ? `?country=${encodeURIComponent(country)}` : '';
    apiFetch<{ country: string; market: 'local' | 'global'; plans: Array<{ plan: string; cents: number; baseAmountCents: number; promotionActive: boolean; promotionLabel?: string; discountBadge?: string; currency: string; provider?: string; market?: 'local' | 'global' }> }>(`/api/billing/plans${suffix}`, { cache: 'no-store' })
      .then((data) => {
        if (!ignore) {
          setResolvedCountry(data.country);
          setBillingCurrency(data.market === 'local' ? 'LKR' : 'USD');
          setPlanPrices(data.plans.reduce((acc, plan) => ({ ...acc, [plan.plan]: plan }), {} as Record<string, {
            cents: number;
            baseAmountCents: number;
            promotionActive: boolean;
            promotionLabel?: string;
            discountBadge?: string;
            currency: string;
            provider?: string;
            market?: 'local' | 'global';
          }>));
        }
      })
      .catch(() => undefined);
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    apiFetch<{ coupon: FeaturedCoupon | null }>('/api/billing/featured-coupon', { cache: 'no-store' })
      .then((data) => {
        if (!ignore) setFeaturedCoupon(data.coupon);
      })
      .catch(() => undefined);
    return () => {
      ignore = true;
    };
  }, []);

  const activePlanLabel = useMemo(() => {
    if (!user) return '';
    if (user.plan === 'payg') return 'Single CV Pass';
    if (user.plan === 'monthly') return 'Monthly Pro';
    if (user.plan === 'quarterly') return 'Pro Quarterly';
    if (user.plan === 'unlimited') return 'Admin';
    return 'Free';
  }, [user]);
  const cmsPlans = useMemo(() => plans.map((plan) => {
    const copy = cmsContent.pricingPlans.find((item) => item.key === plan.key);
    return copy ? { ...plan, ...copy } : plan;
  }), [cmsContent.pricingPlans]);

  const formatPrice = (cents: number, currency = 'LKR') => {
    const amount = cents / 100;
    const fractionDigits = currency === 'USD' ? 2 : 0;
    const formattedAmount = new Intl.NumberFormat(undefined, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }).format(amount);
    return currency === 'USD' ? `$${formattedAmount}` : `${currency} ${formattedAmount}`;
  };

  const displayPlanPrice = (plan: { key: PlanKey }) => {
    if (plan.key === 'free') return formatPrice(0, billingCurrency);
    return planPrices?.[plan.key] ? formatPrice(planPrices[plan.key].cents, planPrices[plan.key].currency) : 'Loading...';
  };

  const featuredCouponText = featuredCoupon
    ? featuredCoupon.discountType === 'percent'
      ? `${featuredCoupon.discountValue}% off`
      : `${formatPrice(featuredCoupon.discountValue, 'LKR')} off`
    : '';
  const checkoutHrefFor = (plan: PlanKey) => {
    const params = new URLSearchParams({
      plan,
      country: resolvedCountry,
    });
    if (featuredCoupon?.appliesTo.includes(plan as 'payg' | 'monthly' | 'quarterly')) {
      params.set('coupon', featuredCoupon.code);
    }
    return `/checkout?${params.toString()}`;
  };

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-slate-950 pt-16 text-white">
        <section className="border-b border-white/10 bg-slate-950">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-black text-emerald-200">
                  <Sparkles size={15} />
                  {cmsContent.landing.pricingEyebrow} Plans
                </div>
                <h1 className="max-w-3xl font-montserrat text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
                  {cmsContent.landing.pricingTitle}
                </h1>
                <p className="mt-5 max-w-2xl text-base font-semibold leading-8 text-slate-300 sm:text-lg">
                  Start free, unlock one CV for a short application push, or choose Pro Quarterly for a focused job search.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/6 p-4 text-sm font-bold text-slate-300">
                {loadingUser ? 'Checking your plan...' : user ? `Current plan: ${activePlanLabel}` : 'Sign in to activate a paid plan'}
                {user?.planExpiresAt && user.plan !== 'free' && (
                  <div className="mt-1 text-xs text-slate-400">
                    Active until {new Date(user.planExpiresAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-slate-900 py-10 sm:py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {featuredCoupon && (
              <div className="mb-6 rounded-2xl border border-emerald-300/25 bg-emerald-300/10 px-4 py-4 shadow-xl shadow-emerald-950/20 sm:flex sm:items-center sm:justify-between sm:gap-4">
                <div>
                  <p className="text-xs font-black uppercase text-emerald-200">{featuredCoupon.maxRedemptions ? `First ${featuredCoupon.maxRedemptions} users` : 'Limited offer'}</p>
                  <p className="mt-1 text-sm font-bold text-white">
                    Use code <span className="font-black text-emerald-200">{featuredCoupon.code}</span> for {featuredCouponText} on Monthly Pro or Pro Quarterly.
                  </p>
                </div>
                {featuredCoupon.maxRedemptions && (
                  <p className="mt-3 shrink-0 rounded-full bg-emerald-300 px-3 py-1 text-xs font-black text-slate-950 sm:mt-0">
                    {Math.max(featuredCoupon.maxRedemptions - featuredCoupon.redeemedCount, 0)} left
                  </p>
                )}
              </div>
            )}
            <div className="grid gap-4 lg:grid-cols-4">
            {cmsPlans.map((plan) => {
              const Icon = plan.icon;
              const isCurrentPlan = user?.plan === plan.key || (plan.key === 'free' && (!user || user.plan === 'free'));
              const planPromotion = planPrices?.[plan.key]?.promotionActive ? planPrices[plan.key] : null;
              return (
                <article
                  key={plan.key}
                  className={`relative flex min-h-[520px] flex-col rounded-2xl border p-5 shadow-2xl sm:p-6 ${
                    plan.highlighted
                      ? 'border-violet-300/35 bg-violet-500/10 shadow-violet-950/30 ring-2 ring-violet-400/30'
                      : 'border-white/10 bg-slate-950/55 shadow-black/20'
                  }`}
                >
                  {planPromotion && (
                    <div className="absolute right-5 top-5 flex max-w-[8rem] flex-col items-end gap-1 sm:right-6 sm:top-6">
                      {planPromotion.promotionLabel && (
                        <span className="text-right text-[10px] font-black uppercase leading-tight text-emerald-200">
                          {planPromotion.promotionLabel}
                        </span>
                      )}
                      <span className="rounded-full bg-emerald-300 px-2.5 py-1 text-[10px] font-black uppercase text-slate-950">
                        {planPromotion.discountBadge}
                      </span>
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${plan.highlighted ? 'border-violet-300/30 bg-violet-400/15' : 'border-white/10 bg-white/6'}`}>
                      <Icon size={22} className={plan.highlighted ? 'text-violet-200' : 'text-emerald-300'} />
                    </div>
                    {plan.highlighted && !planPromotion && (
                      <span className="rounded-full bg-violet-400 px-3 py-1 text-[11px] font-black uppercase text-slate-950">
                        {plan.badge || 'Best for one CV'}
                      </span>
                    )}
                  </div>

                  <h2 className="mt-5 font-montserrat text-2xl font-black">{plan.name}</h2>
                  <p className="mt-2 min-h-14 text-sm font-semibold leading-6 text-slate-400">{plan.description}</p>

                  <div className="mt-6">
                    <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                      {planPromotion && (
                        <PriceAmount price={formatPrice(planPromotion.baseAmountCents, planPromotion.currency)} compact className="text-slate-500 line-through" />
                      )}
                      <div>
                        <PriceAmount price={displayPlanPrice(plan)} className={planPromotion ? 'text-emerald-300' : ''} />
                      </div>
                    </div>
                    <div className="mt-1 text-sm font-bold text-slate-400">{plan.duration}</div>
                  </div>

                  <div className="mt-6 grid gap-3">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-3 text-sm font-bold text-slate-200">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
                          <Check size={13} />
                        </span>
                        {feature}
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto pt-7">
                    {plan.key === 'free' ? (
                      <Link
                        to="/builder?import=1"
                        className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-white/10 bg-white/6 px-4 text-sm font-black text-white transition hover:bg-white/10 active:scale-[0.98]"
                      >
                        {plan.cta || 'Start free'}
                        <ArrowRight size={17} className="ml-2" />
                      </Link>
                    ) : (
                      <Link
                        to={checkoutHrefFor(plan.key)}
                        className={`inline-flex h-12 w-full items-center justify-center rounded-xl px-4 text-sm font-black transition active:scale-[0.98] ${
                          plan.highlighted ? 'bg-violet-500 text-white hover:bg-violet-400' : 'bg-white text-slate-950 hover:bg-slate-200'
                        }`}
                      >
                        <Download size={17} className="mr-2" />
                        {isCurrentPlan ? 'Active plan' : user ? (plan.cta || 'Go to checkout') : 'Sign in to checkout'}
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
