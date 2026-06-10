import type { FormEvent, RefObject } from 'react';
import { ChevronDown, Lock, Loader2, Mail, User } from 'lucide-react';
import type { AuthUser } from '../../utils/api';
import { COUNTRIES } from '../../utils/countries';
import { PaymentMethodLogos } from './PaymentMethodLogos';
import type { CheckoutCustomerFormData } from './checkoutTypes';

interface CheckoutCustomerFormProps {
  form: CheckoutCustomerFormData;
  selectedCountry: {
    code: string;
    name: string;
    flag?: string;
  };
  resolvedCountry: string;
  billingMarket: 'local' | 'global';
  submitting: boolean;
  loadingUser: boolean;
  user: AuthUser | null;
  checkoutProviderLabel: string;
  countryMenuOpen: boolean;
  countrySearchIndex: number | null;
  countryDropdownRef: RefObject<HTMLSpanElement>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFieldChange: (field: keyof CheckoutCustomerFormData, value: string) => void;
  onCountryChange: (countryCode: string) => void;
  onCountryMenuOpenChange: (updater: (open: boolean) => boolean) => void;
}

export function CheckoutCustomerForm({
  form,
  selectedCountry,
  resolvedCountry,
  billingMarket,
  submitting,
  loadingUser,
  user,
  checkoutProviderLabel,
  countryMenuOpen,
  countrySearchIndex,
  countryDropdownRef,
  onSubmit,
  onFieldChange,
  onCountryChange,
  onCountryMenuOpenChange,
}: CheckoutCustomerFormProps) {
  return (
    <form onSubmit={onSubmit} className="order-2 lg:order-1 rounded-2xl border border-white/10 bg-slate-950/60 p-5 shadow-2xl shadow-black/20 sm:p-6">
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
              onChange={(event) => onFieldChange('firstName', event.target.value)}
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
            onChange={(event) => onFieldChange('lastName', event.target.value)}
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
              onChange={(event) => onFieldChange('email', event.target.value)}
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
            onChange={(event) => onFieldChange('phone', event.target.value)}
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
            onChange={(event) => onFieldChange('address', event.target.value)}
            className="h-12 w-full rounded-xl border border-white/10 bg-white/6 px-3 text-base font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400"
            placeholder="Street address"
            autoComplete="street-address"
          />
        </label>

        <label className="grid gap-2 text-sm font-black text-slate-200">
          City
          <input
            value={form.city}
            onChange={(event) => onFieldChange('city', event.target.value)}
            className="h-12 w-full rounded-xl border border-white/10 bg-white/6 px-3 text-base font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400"
            placeholder="Colombo"
            autoComplete="address-level2"
          />
        </label>

        <label className="grid gap-2 text-sm font-black text-slate-200">
          Country
          <span ref={countryDropdownRef} className="relative">
            <button
              type="button"
              onClick={() => onCountryMenuOpenChange((open) => !open)}
              className="flex h-12 w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-900 px-3 text-left text-base font-bold text-white outline-none transition focus:border-violet-400"
              aria-haspopup="listbox"
              aria-expanded={countryMenuOpen}
            >
              <span className="flex min-w-0 items-center gap-2">
                {selectedCountry.flag && <span className="shrink-0 text-lg leading-none">{selectedCountry.flag}</span>}
                <span className="truncate">{selectedCountry.name}</span>
              </span>
              <ChevronDown size={18} className={`shrink-0 text-slate-400 transition ${countryMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {countryMenuOpen && (
              <div
                role="listbox"
                className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 max-h-72 overflow-y-auto overscroll-contain rounded-xl border border-violet-300/40 bg-slate-950 py-2 shadow-2xl shadow-black/40"
              >
                {COUNTRIES.map((country) => {
                  const selected = country.code === (form.countryCode || resolvedCountry);
                  const searchMatch = countrySearchIndex !== null && COUNTRIES[countrySearchIndex]?.code === country.code;
                  return (
                    <button
                      key={country.code}
                      id={`country-option-${country.code}`}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => {
                        onCountryChange(country.code);
                        onCountryMenuOpenChange(() => false);
                      }}
                      className={`block w-full px-4 py-2 text-left text-sm font-bold transition ${
                        selected || searchMatch ? 'bg-violet-500/20 text-violet-100' : 'text-slate-100 hover:bg-white/8'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        {country.flag && <span className="w-6 shrink-0 text-lg leading-none">{country.flag}</span>}
                        <span>{country.name}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </span>
        </label>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/6 p-4">
        <p className="text-sm font-black text-white">
          {billingMarket === 'local' ? 'Sri Lanka checkout' : 'International checkout'}
        </p>
        <p className="mt-1 text-xs font-bold leading-5 text-slate-400">
          {billingMarket === 'local'
            ? 'Your price is shown in LKR and payment continues through PayHere.'
            : 'Your price is shown in USD and payment continues through Lemon Squeezy.'}
        </p>
      </div>

      <button
        type="submit"
        disabled={submitting || loadingUser}
        className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-violet-500 px-4 text-sm font-black text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-65"
      >
        {submitting ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Lock size={17} className="mr-2" />}
        {user ? `Continue to ${checkoutProviderLabel}` : 'Sign in to continue'}
      </button>

      <p className="mt-4 text-center text-xs font-bold leading-5 text-slate-500">
        Card details are handled by the payment gateway after redirect.
      </p>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-4">
        <PaymentMethodLogos />
      </div>
    </form>
  );
}
