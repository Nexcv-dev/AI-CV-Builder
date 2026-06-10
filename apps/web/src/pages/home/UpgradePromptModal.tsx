import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, CalendarDays, Check, Crown, Lock, Sparkles, Trophy, UserRound, X, Zap } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { detectClientBillingCountry } from '../../utils/countries';
import type { UpgradePlan, UpgradePrompt } from './homeTypes';

interface UpgradePromptModalProps {
  isDarkMode: boolean;
  prompt: UpgradePrompt | null;
  savedCvLimitLabel: string;
  savedCvRemainingLabel: string;
  savedCvUsed: number;
  selectedPlan: UpgradePlan | null;
  onClose: () => void;
  onSelectedPlanChange: (plan: UpgradePlan) => void;
}

type BillingMarket = 'local' | 'global';

type BillingPlanPrice = {
  plan: string;
  cents: number;
  baseAmountCents: number;
  promotionActive: boolean;
  promotionLabel?: string;
  discountBadge?: string;
  currency: string;
  provider?: string;
  market?: BillingMarket;
};

type PlanView = {
  key: UpgradePlan;
  name: string;
  accent: 'slate' | 'violet' | 'blue' | 'emerald';
  icon: typeof UserRound;
  access: string;
  note: string;
  features: string[];
  popular?: boolean;
};

const PLAN_VIEWS: PlanView[] = [
  {
    key: 'free',
    name: 'Free',
    accent: 'slate',
    icon: UserRound,
    access: 'Starter access',
    note: 'Free forever',
    features: ['1 saved CV', '1 watermarked download'],
  },
  {
    key: 'payg',
    name: 'Single CV Pass',
    accent: 'violet',
    icon: Zap,
    access: '7 days access',
    note: 'One-time payment',
    popular: true,
    features: ['1 extra CV', 'Any template', 'Unlimited edits', 'Faster PDF downloads for 7 days'],
  },
  {
    key: 'monthly',
    name: 'Monthly Pro',
    accent: 'blue',
    icon: CalendarDays,
    access: '30 days access',
    note: 'One-time payment',
    features: ['Unlimited CV creation', 'Saves & downloads', 'Faster PDF downloads', 'AI features'],
  },
  {
    key: 'quarterly',
    name: 'Pro Quarterly',
    accent: 'emerald',
    icon: Trophy,
    access: '90 days access',
    note: 'Most popular',
    features: ['Unlimited CV creation', 'Saves & downloads', 'AI tools', 'Priority support'],
  },
];

const ACCENT_STYLES = {
  slate: {
    card: 'border-slate-500/35 bg-slate-900/35 text-slate-100',
    icon: 'border-slate-500/25 bg-slate-500/10 text-slate-300',
    price: 'text-slate-100',
    meta: 'border-slate-500/25 bg-slate-500/10 text-slate-300',
    check: 'text-slate-300',
    ring: 'ring-slate-400/25',
  },
  violet: {
    card: 'border-violet-400/80 bg-violet-500/12 text-violet-50 shadow-violet-950/40',
    icon: 'border-violet-400/30 bg-violet-400/15 text-violet-300',
    price: 'text-violet-300',
    meta: 'border-violet-400/35 bg-violet-500/10 text-violet-200',
    check: 'text-violet-300',
    ring: 'ring-violet-400/45',
  },
  blue: {
    card: 'border-blue-400/35 bg-blue-500/8 text-blue-50',
    icon: 'border-blue-400/25 bg-blue-500/10 text-blue-300',
    price: 'text-blue-300',
    meta: 'border-blue-400/25 bg-blue-500/10 text-blue-200',
    check: 'text-blue-300',
    ring: 'ring-blue-400/35',
  },
  emerald: {
    card: 'border-emerald-400/35 bg-emerald-500/10 text-emerald-50',
    icon: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300',
    price: 'text-emerald-300',
    meta: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200',
    check: 'text-emerald-300',
    ring: 'ring-emerald-400/35',
  },
} as const;

const formatPrice = (cents: number, currency = 'USD') => {
  const amount = cents / 100;
  const fractionDigits = currency === 'USD' ? 2 : 0;
  const formattedAmount = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount);
  return currency === 'USD' ? `$${formattedAmount}` : `${currency} ${formattedAmount}`;
};

const splitPriceLabel = (price: string) => {
  const trimmedPrice = price.trim();
  if (!trimmedPrice || trimmedPrice === 'Loading...') return { currency: '', amount: trimmedPrice };
  if (trimmedPrice.startsWith('$')) return { currency: '$', amount: trimmedPrice.slice(1) };
  const currencyMatch = trimmedPrice.match(/^([A-Z]{3})\s+(.+)$/);
  return currencyMatch ? { currency: currencyMatch[1], amount: currencyMatch[2] } : { currency: '', amount: trimmedPrice };
};

function HeroGraphic() {
  return (
    <div className="pointer-events-none relative hidden h-32 w-56 shrink-0 lg:block" aria-hidden="true">
      <div className="absolute left-8 top-0 h-20 w-24 rotate-[-6deg] rounded-[1.5rem] bg-linear-to-br from-violet-300 via-violet-600 to-indigo-950 shadow-2xl shadow-violet-950/50">
        <div className="absolute left-4 top-4 h-13 w-17 rounded-b-2xl rounded-t-[2rem] bg-linear-to-b from-violet-100 to-violet-600 shadow-lg shadow-violet-950/40" />
        <div className="absolute left-6 top-[-0.35rem] h-5 w-5 rounded-full bg-violet-200 shadow-lg shadow-violet-300/40" />
        <div className="absolute left-15 top-[-0.9rem] h-6 w-6 rounded-full bg-violet-100 shadow-lg shadow-violet-300/50" />
        <div className="absolute right-4 top-1 h-5 w-5 rounded-full bg-violet-200 shadow-lg shadow-violet-300/40" />
        <div className="absolute bottom-3 left-6 h-2 w-18 rounded-full bg-violet-950/55" />
      </div>
      <div className="absolute right-2 top-9 h-24 w-34 rotate-[7deg] rounded-3xl border border-blue-300/20 bg-linear-to-br from-violet-600/95 to-slate-950 shadow-2xl shadow-blue-950/50">
        <Sparkles className="absolute left-8 top-5 h-7 w-7 text-blue-300" strokeWidth={2.4} />
        <div className="absolute bottom-12 left-7 h-2 w-20 rounded-full bg-blue-400/80" />
        <div className="absolute bottom-8 left-7 h-2 w-24 rounded-full bg-blue-400/60" />
        <div className="absolute bottom-5 left-7 h-2 w-16 rounded-full bg-violet-400/35" />
      </div>
    </div>
  );
}

function PriceLabel({ price, className = '' }: { price: string; className?: string }) {
  const parts = splitPriceLabel(price);
  return (
    <span className={`inline-flex items-baseline gap-2 font-black ${className}`}>
      {parts.currency && <span className="text-base uppercase opacity-90">{parts.currency}</span>}
      <span className="text-3xl leading-none tracking-normal lg:text-4xl">{parts.amount}</span>
    </span>
  );
}

function PlanCard({
  plan,
  price,
  selected,
  onSelect,
}: {
  plan: PlanView;
  price: string;
  selected: boolean;
  onSelect: (plan: UpgradePlan) => void;
}) {
  const styles = ACCENT_STYLES[plan.accent];
  const Icon = plan.icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(plan.key)}
      className={`relative flex min-h-[12.5rem] w-full flex-col overflow-visible rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-opacity-100 active:scale-[0.99] lg:min-h-[17.5rem] ${styles.card} ${selected ? `ring-2 ${styles.ring}` : ''}`}
    >
      {plan.popular && (
        <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-xl bg-violet-600 px-4 py-1.5 text-xs font-black text-violet-50 shadow-lg shadow-violet-950/40">
          Most Popular
        </span>
      )}
      <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border ${styles.icon}`}>
        <Icon size={20} />
      </div>
      <h4 className="text-base font-black tracking-normal">{plan.name}</h4>
      <PriceLabel price={price} className={`mt-5 ${styles.price}`} />
      <div className={`mt-3 rounded-xl border px-3 py-2 text-xs font-black leading-5 ${styles.meta}`}>
        {plan.access} <span className="opacity-70">&bull;</span> {plan.note}
      </div>
      <div className="mt-4 h-px w-full bg-white/10" />
      <ul className="mt-4 grid gap-2 text-xs font-semibold leading-5 text-slate-300 sm:grid-cols-2 lg:grid-cols-1">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-3">
            <Check className={`mt-0.5 h-4 w-4 shrink-0 ${styles.check}`} strokeWidth={3} />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </button>
  );
}

export function UpgradePromptModal({
  prompt,
  selectedPlan,
  onClose,
  onSelectedPlanChange,
}: UpgradePromptModalProps) {
  const [planPrices, setPlanPrices] = useState<Record<string, BillingPlanPrice> | null>(null);
  const [billingCurrency, setBillingCurrency] = useState('USD');
  const [resolvedCountry, setResolvedCountry] = useState('GLOBAL');

  useEffect(() => {
    if (!prompt) return;
    let ignore = false;
    const country = detectClientBillingCountry();
    const suffix = country ? `?country=${encodeURIComponent(country)}` : '';

    apiFetch<{ country: string; market: BillingMarket; plans: BillingPlanPrice[] }>(`/api/billing/plans${suffix}`, { cache: 'no-store' })
      .then((data) => {
        if (ignore) return;
        setResolvedCountry(data.country);
        setBillingCurrency(data.market === 'local' ? 'LKR' : 'USD');
        setPlanPrices(data.plans.reduce((acc, plan) => ({ ...acc, [plan.plan]: plan }), {} as Record<string, BillingPlanPrice>));
      })
      .catch(() => undefined);

    return () => {
      ignore = true;
    };
  }, [prompt]);

  const activePlan = selectedPlan || 'payg';
  const planPriceLabels = useMemo(() => {
    const labels: Record<UpgradePlan, string> = {
      free: formatPrice(0, billingCurrency),
      payg: 'Loading...',
      monthly: 'Loading...',
      quarterly: 'Loading...',
    };

    for (const plan of PLAN_VIEWS) {
      if (plan.key === 'free') continue;
      const price = planPrices?.[plan.key];
      if (price) labels[plan.key] = formatPrice(price.cents, price.currency);
    }

    return labels;
  }, [billingCurrency, planPrices]);

  const checkoutHref = `/checkout?${new URLSearchParams({ plan: activePlan, country: resolvedCountry }).toString()}`;

  return (
    <AnimatePresence>
      {prompt && (
        <motion.div
          className="fixed inset-0 z-110 flex items-end justify-center overflow-y-auto bg-slate-950/70 p-3 backdrop-blur-md sm:items-center sm:p-6"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <motion.div
            className="relative max-h-[calc(100svh-1.5rem)] w-full max-w-[78rem] overflow-y-auto rounded-[1.5rem] border border-slate-500/30 bg-[#071126]/95 text-slate-100 shadow-2xl shadow-black/50 lg:max-h-[calc(100svh-3rem)] lg:rounded-[1.75rem]"
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 18 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_14%,rgba(124,58,237,0.22),transparent_30%),radial-gradient(circle_at_35%_95%,rgba(59,130,246,0.14),transparent_35%)]" />
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-500/35 bg-slate-950/20 text-slate-200 transition hover:bg-white/10 active:scale-95"
              aria-label="Close upgrade prompt"
            >
              <X size={20} />
            </button>

            <div className="relative p-4 sm:p-6 lg:p-8">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                <div>
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-400/30 bg-violet-400/12 text-violet-300 shadow-lg shadow-violet-950/30">
                    <Crown size={27} strokeWidth={1.9} />
                  </div>
                  <div className="mb-4 inline-flex items-center gap-2 rounded-xl bg-violet-500/20 px-3 py-1.5 text-xs font-black text-violet-200">
                    <Zap size={15} />
                    Upgrade Required
                  </div>
                  <h3 className="max-w-3xl text-3xl font-black leading-tight tracking-normal text-white sm:text-4xl">
                    {prompt.title}
                  </h3>
                  <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-slate-300 sm:text-base">
                    {prompt.message}
                  </p>
                </div>
                <HeroGraphic />
              </div>

              <div className="mt-7 grid gap-3 lg:grid-cols-4 lg:gap-4">
                {PLAN_VIEWS.map((plan) => (
                  <PlanCard
                    key={plan.key}
                    plan={plan}
                    price={planPriceLabels[plan.key]}
                    selected={activePlan === plan.key}
                    onSelect={onSelectedPlanChange}
                  />
                ))}
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_1.45fr_1fr]">
                <Link
                  to="/pricing"
                  onClick={onClose}
                  className="inline-flex h-12 items-center justify-center gap-3 rounded-2xl border border-slate-500/35 bg-white/5 px-5 text-sm font-black text-slate-200 transition hover:bg-white/10 active:scale-[0.98]"
                >
                  <Sparkles size={21} />
                  Compare all features
                </Link>
                <Link
                  to={activePlan === 'free' ? '/pricing' : checkoutHref}
                  onClick={onClose}
                  className="inline-flex h-12 items-center justify-center gap-4 rounded-2xl bg-linear-to-r from-violet-500 to-violet-700 px-5 text-sm font-black text-white shadow-xl shadow-violet-950/35 transition hover:from-violet-400 hover:to-violet-600 active:scale-[0.98]"
                >
                  View upgrade options
                  <ArrowRight size={24} />
                </Link>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-500/45 bg-slate-950/15 px-5 text-sm font-black text-white transition hover:bg-white/8 active:scale-[0.98]"
                >
                  Continue editing
                </button>
              </div>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
                <Lock size={16} />
                Secure payment &bull; Cancel anytime
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
