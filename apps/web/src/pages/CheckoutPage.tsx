import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
import { SiteHeader } from '../components/SiteHeader';
import { AuthModal } from '../components/AuthModal';
import { AuthUser, apiFetch, getCurrentUser } from '../utils/api';
import { COUNTRIES, countryFromCode, countryNameFromCode, detectClientBillingCountry } from '../utils/countries';
import { CheckoutCustomerForm } from './checkout/CheckoutCustomerForm';
import { CheckoutFooter } from './checkout/CheckoutFooter';
import { CheckoutSummaryPanel } from './checkout/CheckoutSummaryPanel';
import { checkoutPlans, getPlanFromQuery } from './checkout/checkoutPlans';
import { submitPayHereForm } from './checkout/checkoutUtils';
import { useCheckoutPricing } from './checkout/useCheckoutPricing';
import { useCheckoutReturnHandler } from './checkout/useCheckoutReturnHandler';
import type {
  CheckoutPlanKey,
  CheckoutCustomerFormData,
  LemonSqueezyCheckoutResponse,
  PayHereCheckoutResponse,
} from './checkout/checkoutTypes';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedPlanKey = getPlanFromQuery(searchParams.get('plan'));
  const initialCountry = searchParams.get('country') || detectClientBillingCountry();
  const selectedPlan = checkoutPlans[selectedPlanKey];

  const [user, setUser] = useState<AuthUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [couponCode, setCouponCode] = useState(searchParams.get('coupon') || '');
  const [showCouponInput, setShowCouponInput] = useState(Boolean(searchParams.get('coupon')));
  const [form, setForm] = useState<CheckoutCustomerFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    countryCode: initialCountry,
    country: initialCountry ? countryNameFromCode(initialCountry) : 'Sri Lanka',
  });
  const [countryMenuOpen, setCountryMenuOpen] = useState(false);
  const [countrySearchIndex, setCountrySearchIndex] = useState<number | null>(null);
  const countryDropdownRef = useRef<HTMLSpanElement>(null);
  const countrySearchRef = useRef('');
  const countrySearchTimerRef = useRef<number | null>(null);
  const checkoutInFlightRef = useRef(false);
  const confirmingReturnRef = useRef<string | null>(null);
  const handledCancelRef = useRef<string | null>(null);
  const {
    billingMarket,
    planPrices,
    quote,
    quoteLoading,
    refreshQuote,
    resetQuote,
    resolvedCountry,
  } = useCheckoutPricing({
    countryCode: form.countryCode,
    selectedPlanKey: selectedPlan.key,
    couponCode,
    initialCountry,
    setForm,
  });

  useEffect(() => {
    const resetCheckoutLoadingState = () => {
      checkoutInFlightRef.current = false;
      setSubmitting(false);
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) resetCheckoutLoadingState();
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

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

  useEffect(() => {
    if (!countryMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && countryDropdownRef.current?.contains(target)) return;
      setCountryMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCountryMenuOpen(false);
        return;
      }

      if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return;
      const nextSearch = `${countrySearchRef.current}${event.key}`.toLowerCase();
      const matchIndex = COUNTRIES.findIndex((country) => country.name.toLowerCase().startsWith(nextSearch));
      const fallbackIndex = COUNTRIES.findIndex((country) => country.name.toLowerCase().startsWith(event.key.toLowerCase()));
      const nextIndex = matchIndex >= 0 ? matchIndex : fallbackIndex;
      if (nextIndex < 0) return;

      event.preventDefault();
      countrySearchRef.current = matchIndex >= 0 ? nextSearch : event.key.toLowerCase();
      setCountrySearchIndex(nextIndex);
      document.getElementById(`country-option-${COUNTRIES[nextIndex].code}`)?.scrollIntoView({ block: 'nearest' });

      if (countrySearchTimerRef.current) window.clearTimeout(countrySearchTimerRef.current);
      countrySearchTimerRef.current = window.setTimeout(() => {
        countrySearchRef.current = '';
      }, 900);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      if (countrySearchTimerRef.current) window.clearTimeout(countrySearchTimerRef.current);
      countrySearchRef.current = '';
      countrySearchTimerRef.current = null;
      setCountrySearchIndex(null);
    };
  }, [countryMenuOpen]);

  useCheckoutReturnHandler({
    navigate,
    searchParams,
    setSearchParams,
    selectedPlanKey: selectedPlan.key,
    couponCode,
    checkoutInFlightRef,
    confirmingReturnRef,
    handledCancelRef,
    setSubmitting,
    setUser,
  });

  const planOptions = useMemo(() => Object.values(checkoutPlans), []);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateCountry = (countryCode: string) => {
    const country = countryNameFromCode(countryCode);
    setForm((current) => ({ ...current, countryCode, country }));
    resetQuote();
    const nextParams: Record<string, string> = { plan: selectedPlan.key, country: countryCode };
    if (couponCode.trim()) nextParams.coupon = couponCode.trim();
    setSearchParams(nextParams, { replace: true });
  };

  const selectedCountry = countryFromCode(form.countryCode || (resolvedCountry === 'GLOBAL' ? 'OTHER' : resolvedCountry));
  const checkoutProviderLabel = billingMarket === 'local' ? 'PayHere' : 'Lemon Squeezy';

  const selectPlan = (plan: CheckoutPlanKey) => {
    const nextParams: Record<string, string> = { plan };
    if (form.countryCode) nextParams.country = form.countryCode;
    if (couponCode.trim()) nextParams.coupon = couponCode.trim();
    setSearchParams(nextParams);
    resetQuote();
  };

  const completeCheckout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (checkoutInFlightRef.current || submitting) return;

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
      couponCode: couponCode.trim(),
      customer: {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
        countryCode: form.countryCode,
      },
      country: form.countryCode,
    };

    checkoutInFlightRef.current = true;
    setSubmitting(true);
    try {
      if (billingMarket === 'global') {
        const checkout = await apiFetch<LemonSqueezyCheckoutResponse>('/api/billing/lemonsqueezy-checkout', {
          method: 'POST',
          body: JSON.stringify(checkoutPayload),
        });
        sessionStorage.setItem('nexcv-pending-checkout', JSON.stringify({
          ...checkoutPayload,
          orderId: checkout.orderId,
          provider: 'lemonsqueezy',
          checkoutId: checkout.checkoutId,
        }));
        window.location.assign(checkout.checkoutUrl);
        return;
      }

      const checkout = await apiFetch<PayHereCheckoutResponse>('/api/billing/payhere-checkout', {
        method: 'POST',
        body: JSON.stringify(checkoutPayload),
      });
      sessionStorage.setItem('nexcv-pending-checkout', JSON.stringify({
        ...checkoutPayload,
        orderId: checkout.orderId,
        provider: 'payhere',
      }));
      submitPayHereForm(checkout.actionUrl, checkout.fields);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not open checkout.');
      checkoutInFlightRef.current = false;
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
            <CheckoutCustomerForm
              form={form}
              selectedCountry={selectedCountry}
              resolvedCountry={resolvedCountry}
              billingMarket={billingMarket}
              submitting={submitting}
              loadingUser={loadingUser}
              user={user}
              checkoutProviderLabel={checkoutProviderLabel}
              countryMenuOpen={countryMenuOpen}
              countrySearchIndex={countrySearchIndex}
              countryDropdownRef={countryDropdownRef}
              onSubmit={completeCheckout}
              onFieldChange={updateField}
              onCountryChange={updateCountry}
              onCountryMenuOpenChange={setCountryMenuOpen}
            />

            <CheckoutSummaryPanel
              selectedPlan={selectedPlan}
              planOptions={planOptions}
              planPrices={planPrices}
              quote={quote}
              quoteLoading={quoteLoading}
              couponCode={couponCode}
              showCouponInput={showCouponInput}
              billingMarket={billingMarket}
              resolvedCountry={resolvedCountry}
              onCouponCodeChange={setCouponCode}
              onShowCouponInput={() => setShowCouponInput(true)}
              onSelectPlan={selectPlan}
            />
          </div>
        </section>
      </main>
      <CheckoutFooter />

      <AuthModal
        isOpen={authModalOpen}
        initialMode="login"
        redirectTo={`/checkout?plan=${selectedPlan.key}${couponCode.trim() ? `&coupon=${encodeURIComponent(couponCode.trim())}` : ''}`}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={(currentUser) => {
          setUser(currentUser);
          resetQuote();
          refreshQuote();
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
