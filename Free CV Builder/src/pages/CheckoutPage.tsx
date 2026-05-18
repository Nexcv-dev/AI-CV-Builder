import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Check,
  Crown,
  Lock,
  Loader2,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  User,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { SiteHeader } from '../components/SiteHeader';
import { AuthModal } from '../components/AuthModal';
import { AuthUser, apiFetch, getCurrentUser } from '../utils/api';

type CheckoutPlanKey = 'payg' | 'monthly';

interface PayHereCheckoutResponse {
  actionUrl: string;
  orderId: string;
  fields: Record<string, string>;
}

const checkoutPlans: Record<CheckoutPlanKey, {
  key: CheckoutPlanKey;
  name: string;
  price: string;
  duration: string;
  summary: string;
  icon: LucideIcon;
  features: string[];
}> = {
  payg: {
    key: 'payg',
    name: 'Pay As You Go',
    price: 'LKR 499',
    duration: '7 days (One-time payment)',
    summary: 'One polished CV with unlimited edits and downloads for a focused application window.',
    icon: Zap,
    features: [
      'Any CV template',
      'Unlimited edits for 7 days',
      'Unlimited PDF downloads for 7 days',
      'AI import, summary, and refine tools',
    ],
  },
  monthly: {
    key: 'monthly',
    name: 'Monthly',
    price: 'LKR 2199',
    duration: '30 days (One-time payment)',
    summary: 'Best for active job searches with multiple CV versions and repeated exports.',
    icon: Crown,
    features: [
      'Unlimited CV creation',
      'Unlimited saved CVs',
      'Any CV template',
      'Unlimited downloads for 30 days',
      'AI import, summary, and refine tools',
    ],
  },
};

function getPlanFromQuery(value: string | null): CheckoutPlanKey {
  return value === 'monthly' ? 'monthly' : 'payg';
}

function submitPayHereForm(actionUrl: string, fields: Record<string, string>) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = actionUrl;
  form.style.display = 'none';

  Object.entries(fields).forEach(([name, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
}

export default function CheckoutPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedPlanKey = getPlanFromQuery(searchParams.get('plan'));
  const selectedPlan = checkoutPlans[selectedPlanKey];
  const PlanIcon = selectedPlan.icon;

  const [user, setUser] = useState<AuthUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: 'Sri Lanka',
  });

  useEffect(() => {
    let ignore = false;

    getCurrentUser()
      .then((currentUser) => {
        if (ignore) return;
        setUser(currentUser);
        const [firstName, ...restName] = (currentUser.displayName || '').trim().split(' ').filter(Boolean);
        setForm((current) => ({
          ...current,
          firstName: firstName || current.firstName,
          lastName: restName.join(' ') || current.lastName,
          email: currentUser.email || current.email,
          phone: currentUser.phone || current.phone,
          address: currentUser.address || current.address,
        }));
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

  const planOptions = useMemo(() => Object.values(checkoutPlans), []);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const selectPlan = (plan: CheckoutPlanKey) => {
    setSearchParams({ plan });
  };

  const completeCheckout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    if (!user.emailVerified) {
      toast.error('Verify your email before completing checkout.');
      return;
    }

    const requiredFields: Array<keyof typeof form> = [
      'firstName',
      'lastName',
      'email',
      'phone',
      'address',
      'city',
      'country',
    ];
    const missingField = requiredFields.find((field) => !form[field].trim());
    if (missingField) {
      toast.error('Please complete your customer details.');
      return;
    }

    const checkoutPayload = {
      plan: selectedPlan.key,
      customer: {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
      },
    };

    setSubmitting(true);
    try {
      const checkout = await apiFetch<PayHereCheckoutResponse>('/api/billing/payhere-checkout', {
        method: 'POST',
        body: JSON.stringify(checkoutPayload),
      });
      sessionStorage.setItem('nexcv-pending-checkout', JSON.stringify({
        ...checkoutPayload,
        orderId: checkout.orderId,
      }));
      submitPayHereForm(checkout.actionUrl, checkout.fields);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not open PayHere checkout.');
      setSubmitting(false);
    }
  };

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-slate-950 pt-16 text-white">
        <section className="border-b border-white/10 bg-slate-950">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 text-sm font-black text-slate-400 transition hover:text-white"
            >
              <ArrowLeft size={17} />
              Back to pricing
            </Link>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px] lg:items-end">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-black text-emerald-200">
                  <ShieldCheck size={15} />
                  Secure Checkout
                </div>
                <h1 className="max-w-3xl font-montserrat text-4xl font-black leading-tight sm:text-5xl">
                  Finish your NexCV upgrade.
                </h1>
                <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-slate-300">
                  Confirm your plan, add payment details, and unlock premium CV exports in a few seconds.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/6 p-4 text-sm font-bold text-slate-300">
                {loadingUser ? 'Checking your account...' : user ? `Signed in as ${user.email}` : 'Sign in required before payment'}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-slate-900 py-8 sm:py-12">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8">
            <form onSubmit={completeCheckout} className="order-2 lg:order-1 rounded-2xl border border-white/10 bg-slate-950/60 p-5 shadow-2xl shadow-black/20 sm:p-6">
              <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <h2 className="font-montserrat text-2xl font-black">Customer details</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-400">
                    These details are ready to pass into your payment gateway later.
                  </p>
                </div>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300">
                  <Lock size={21} />
                </span>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-black text-slate-200">
                  First name
                  <span className="relative">
                    <User size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      value={form.firstName}
                      onChange={(event) => updateField('firstName', event.target.value)}
                      className="h-12 w-full rounded-xl border border-white/10 bg-white/6 pl-10 pr-3 text-base font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400"
                      placeholder="First name"
                      autoComplete="given-name"
                    />
                  </span>
                </label>

                <label className="grid gap-2 text-sm font-black text-slate-200">
                  Last name
                  <input
                    value={form.lastName}
                    onChange={(event) => updateField('lastName', event.target.value)}
                    className="h-12 w-full rounded-xl border border-white/10 bg-white/6 px-3 text-base font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400"
                    placeholder="Last name"
                    autoComplete="family-name"
                  />
                </label>

                <label className="grid gap-2 text-sm font-black text-slate-200">
                  Email address
                  <span className="relative">
                    <Mail size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      value={form.email}
                      onChange={(event) => updateField('email', event.target.value)}
                      className="h-12 w-full rounded-xl border border-white/10 bg-white/6 pl-10 pr-3 text-base font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400"
                      placeholder="you@example.com"
                      type="email"
                      autoComplete="email"
                    />
                  </span>
                </label>

                <label className="grid gap-2 text-sm font-black text-slate-200">
                  Contact number
                  <input
                    value={form.phone}
                    onChange={(event) => updateField('phone', event.target.value)}
                    className="h-12 w-full rounded-xl border border-white/10 bg-white/6 px-3 text-base font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400"
                    placeholder="+94 77 123 4567"
                    type="tel"
                    autoComplete="tel"
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-black text-slate-200 sm:col-span-2">
                  Billing address
                  <input
                    value={form.address}
                    onChange={(event) => updateField('address', event.target.value)}
                    className="h-12 w-full rounded-xl border border-white/10 bg-white/6 px-3 text-base font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400"
                    placeholder="Street address"
                    autoComplete="street-address"
                  />
                </label>

                <label className="grid gap-2 text-sm font-black text-slate-200">
                  City
                  <input
                    value={form.city}
                    onChange={(event) => updateField('city', event.target.value)}
                    className="h-12 w-full rounded-xl border border-white/10 bg-white/6 px-3 text-base font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400"
                    placeholder="Colombo"
                    autoComplete="address-level2"
                  />
                </label>

                <label className="grid gap-2 text-sm font-black text-slate-200">
                  Country
                  <select
                    value={form.country}
                    onChange={(event) => updateField('country', event.target.value)}
                    className="h-12 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-base font-bold text-white outline-none transition focus:border-violet-400"
                    autoComplete="country-name"
                  >
                    <option>Sri Lanka</option>
                    <option>India</option>
                    <option>United Arab Emirates</option>
                    <option>United Kingdom</option>
                    <option>United States</option>
                    <option>Australia</option>
                    <option>Canada</option>
                    <option>Other</option>
                  </select>
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting || loadingUser}
                className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-violet-500 px-4 text-sm font-black text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-65"
              >
                {submitting ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Lock size={17} className="mr-2" />}
                {user ? 'Purchase plan' : 'Sign in to continue'}
              </button>

              <p className="mt-4 text-center text-xs font-bold leading-5 text-slate-500">
                Card details are handled by the payment gateway after redirect.
              </p>
              
              <div className="mt-8 flex justify-center">
                <a href="https://www.payhere.lk" target="_blank" rel="noopener noreferrer" className="block transition hover:scale-[1.01] w-full max-w-[500px]">
                  <img 
                    src="https://www.payhere.lk/downloads/images/payhere_long_banner_dark.png" 
                    alt="PayHere" 
                    width="500"
                    className="h-auto w-full" 
                  />
                </a>
              </div>
            </form>

            <aside className="order-1 lg:order-2 space-y-4">
              <div className="rounded-2xl border border-violet-300/25 bg-violet-500/10 p-5 shadow-2xl shadow-violet-950/25 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-300/30 bg-violet-400/15 text-violet-200">
                    <PlanIcon size={23} />
                  </div>
                  <span className="rounded-full bg-emerald-300 px-3 py-1 text-[11px] font-black uppercase text-slate-950">
                    Selected
                  </span>
                </div>

                <h2 className="mt-5 font-montserrat text-2xl font-black">{selectedPlan.name}</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">{selectedPlan.summary}</p>

                <div className="mt-6 border-y border-white/10 py-5">
                  <div className="text-4xl font-black">{selectedPlan.price}</div>
                  <div className="mt-1 text-sm font-bold text-slate-400">{selectedPlan.duration}</div>
                </div>

                <div className="mt-5 grid gap-3">
                  {selectedPlan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3 text-sm font-bold text-slate-200">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
                        <Check size={13} />
                      </span>
                      {feature}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-200">
                  <Sparkles size={16} className="text-emerald-300" />
                  Change plan
                </div>
                <div className="grid gap-2">
                  {planOptions.map((plan) => {
                    const OptionIcon = plan.icon;
                    const isSelected = plan.key === selectedPlan.key;
                    return (
                      <button
                        key={plan.key}
                        type="button"
                        onClick={() => selectPlan(plan.key)}
                        className={`flex min-h-14 items-center justify-between gap-3 rounded-xl border px-3 text-left transition active:scale-[0.98] ${
                          isSelected
                            ? 'border-violet-300/40 bg-violet-500/15 text-white'
                            : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/8'
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <OptionIcon size={17} className={isSelected ? 'text-violet-200' : 'text-slate-500'} />
                          <span className="text-sm font-black">{plan.name}</span>
                        </span>
                        <span className="text-xs font-black text-slate-400">{plan.price}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>
          </div>
        </section>
      </main>
      
      <footer className="bg-slate-950 border-t border-white/10 py-12 pb-32 sm:pb-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 md:grid-cols-3 md:items-start md:justify-between">
            {/* Customer Support */}
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 opacity-50">Customer Support</h3>
              <p className="text-slate-400 text-sm font-semibold mb-6">Payment stuck or have questions? We're here to help you.</p>
              <div className="space-y-4">
                <a href="tel:+94701234567" className="flex items-center gap-3 text-slate-300 hover:text-white transition-colors group">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 group-hover:border-violet-500/50 group-hover:bg-violet-500/10 transition-all">
                    <Phone size={16} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase text-slate-500">Call Us</div>
                    <div className="text-sm font-bold">+94 70 123 4567</div>
                  </div>
                </a>
                <a href="mailto:support@nexcv.com" className="flex items-center gap-3 text-slate-300 hover:text-white transition-colors group">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 group-hover:border-emerald-500/50 group-hover:bg-emerald-500/10 transition-all">
                    <Mail size={16} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase text-slate-500">Email Support</div>
                    <div className="text-sm font-bold">support@nexcv.com</div>
                  </div>
                </a>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-col items-center md:items-center">
              <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 opacity-50">Secure Payments</h3>
              <div className="flex flex-wrap items-center justify-center gap-4">
                {/* SSL Badge */}
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5 text-emerald-400">
                  <ShieldCheck size={20} />
                  <div className="leading-none">
                    <div className="text-[9px] font-black uppercase tracking-widest">Secure SSL</div>
                    <div className="text-[11px] font-bold">Encrypted</div>
                  </div>
                </div>
                
                {/* Payment Methods */}
                <div className="flex flex-col items-center">
                  <a href="https://www.payhere.lk" target="_blank" rel="noopener noreferrer" className="block transition hover:scale-[1.02]">
                    <img 
                      src="https://www.payhere.lk/downloads/images/payhere_short_banner_dark.png" 
                      alt="PayHere" 
                      width="250"
                      className="h-auto"
                    />
                  </a>
                </div>
              </div>
              <p className="mt-6 text-center text-[11px] font-bold text-slate-500 max-w-[200px]">
                Your transactions are encrypted and processed securely.
              </p>
            </div>

            {/* Legal Links */}
            <div className="md:text-right">
              <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 opacity-50">Legal Policies</h3>
              <ul className="space-y-4">
                <li>
                  <Link to="/privacy-policy" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">Privacy Policy</Link>
                </li>
                <li>
                  <Link to="/refund-policy" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">Refund & Cancellation Policy</Link>
                </li>
                <li>
                  <Link to="/terms" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">Terms & Conditions</Link>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="mt-16 border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[11px] font-bold text-slate-600">
              &copy; {new Date().getFullYear()} NexCV. Built with security in mind.
            </p>
            <div className="flex items-center gap-2 text-[11px] font-black text-slate-700 uppercase tracking-widest">
              <ShieldCheck size={12} />
              PCI DSS Compliant
            </div>
          </div>
        </div>
      </footer>

      <AuthModal
        isOpen={authModalOpen}
        initialMode="login"
        redirectTo={`/checkout?plan=${selectedPlan.key}`}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={(currentUser) => {
          setUser(currentUser);
          const [firstName, ...restName] = (currentUser.displayName || '').trim().split(' ').filter(Boolean);
          setForm((current) => ({
            ...current,
            firstName: firstName || current.firstName,
            lastName: restName.join(' ') || current.lastName,
            email: currentUser.email || current.email,
            phone: currentUser.phone || current.phone,
            address: currentUser.address || current.address,
          }));
          setAuthModalOpen(false);
        }}
      />
    </>
  );
}
