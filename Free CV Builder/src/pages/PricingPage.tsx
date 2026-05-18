import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Crown, Download, FileText, Sparkles, Zap, type LucideIcon } from 'lucide-react';
import { SiteHeader } from '../components/SiteHeader';
import { AuthUser, getCurrentUser } from '../utils/api';

type PlanKey = 'free' | 'payg' | 'monthly';

const plans: Array<{
  key: PlanKey;
  name: string;
  price: string;
  duration: string;
  description: string;
  features: string[];
  icon: LucideIcon;
  highlighted?: boolean;
}> = [
  {
    key: 'free',
    name: 'Free',
    price: 'LKR 0',
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
    name: 'Pay As You Go',
    price: 'LKR 499',
    duration: '7 days (One-time payment)',
    description: 'Perfect when you need one polished CV ready for applications this week.',
    icon: Zap,
    highlighted: true,
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
    name: 'Monthly',
    price: 'LKR 2199',
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
];

export default function PricingPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

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

  const activePlanLabel = useMemo(() => {
    if (!user) return '';
    if (user.plan === 'payg') return 'Pay As You Go';
    if (user.plan === 'monthly') return 'Monthly';
    if (user.plan === 'unlimited') return 'Admin';
    return 'Free';
  }, [user]);

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
                  Pricing Plans
                </div>
                <h1 className="max-w-3xl font-montserrat text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
                  Choose the CV access that fits your job hunt.
                </h1>
                <p className="mt-5 max-w-2xl text-base font-semibold leading-8 text-slate-300 sm:text-lg">
                  Start free, unlock one CV for 7 days, or go monthly when you need multiple versions and AI help.
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
          <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
            {plans.map((plan) => {
              const Icon = plan.icon;
              const isCurrentPlan = user?.plan === plan.key || (plan.key === 'free' && (!user || user.plan === 'free'));
              return (
                <article
                  key={plan.key}
                  className={`flex min-h-[520px] flex-col rounded-2xl border p-5 shadow-2xl sm:p-6 ${
                    plan.highlighted
                      ? 'border-violet-300/35 bg-violet-500/10 shadow-violet-950/30 ring-2 ring-violet-400/30'
                      : 'border-white/10 bg-slate-950/55 shadow-black/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${plan.highlighted ? 'border-violet-300/30 bg-violet-400/15' : 'border-white/10 bg-white/6'}`}>
                      <Icon size={22} className={plan.highlighted ? 'text-violet-200' : 'text-emerald-300'} />
                    </div>
                    {plan.highlighted && (
                      <span className="rounded-full bg-violet-400 px-3 py-1 text-[11px] font-black uppercase text-slate-950">
                        Best for one CV
                      </span>
                    )}
                  </div>

                  <h2 className="mt-5 font-montserrat text-2xl font-black">{plan.name}</h2>
                  <p className="mt-2 min-h-14 text-sm font-semibold leading-6 text-slate-400">{plan.description}</p>

                  <div className="mt-6">
                    <div className="text-4xl font-black">{plan.price}</div>
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
                        Start free
                        <ArrowRight size={17} className="ml-2" />
                      </Link>
                    ) : (
                      <Link
                        to={`/checkout?plan=${plan.key}`}
                        className={`inline-flex h-12 w-full items-center justify-center rounded-xl px-4 text-sm font-black transition active:scale-[0.98] ${
                          plan.highlighted ? 'bg-violet-500 text-white hover:bg-violet-400' : 'bg-white text-slate-950 hover:bg-slate-200'
                        }`}
                      >
                        <Download size={17} className="mr-2" />
                        {isCurrentPlan ? 'Active plan' : user ? 'Go to checkout' : 'Sign in to checkout'}
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}
