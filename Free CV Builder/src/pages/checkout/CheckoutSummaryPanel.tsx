import { Check, Sparkles, type LucideIcon } from 'lucide-react';
import { countryNameFromCode } from '../../utils/countries';
import { formatCents } from './checkoutUtils';
import type { BillingPlanPrice, CheckoutPlanKey, CheckoutQuote } from './checkoutTypes';

interface CheckoutPlanOption {
  key: CheckoutPlanKey;
  name: string;
  duration: string;
  summary: string;
  icon: LucideIcon;
  features: string[];
}

interface CheckoutSummaryPanelProps {
  selectedPlan: CheckoutPlanOption;
  planOptions: CheckoutPlanOption[];
  planPrices: Record<CheckoutPlanKey, BillingPlanPrice> | null;
  quote: CheckoutQuote | null;
  quoteLoading: boolean;
  couponCode: string;
  showCouponInput: boolean;
  billingMarket: 'local' | 'global';
  resolvedCountry: string;
  onCouponCodeChange: (couponCode: string) => void;
  onShowCouponInput: () => void;
  onSelectPlan: (plan: CheckoutPlanKey) => void;
}

export function CheckoutSummaryPanel({
  selectedPlan,
  planOptions,
  planPrices,
  quote,
  quoteLoading,
  couponCode,
  showCouponInput,
  billingMarket,
  resolvedCountry,
  onCouponCodeChange,
  onShowCouponInput,
  onSelectPlan,
}: CheckoutSummaryPanelProps) {
  const PlanIcon = selectedPlan.icon;

  return (
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
          <div className={`text-4xl font-black ${planPrices?.[selectedPlan.key]?.promotionActive ? 'text-emerald-300' : ''}`}>
            {quote ? formatCents(quote.finalAmountCents, quote.currency) : planPrices?.[selectedPlan.key] ? formatCents(planPrices[selectedPlan.key].cents, planPrices[selectedPlan.key].currency) : 'Loading...'}
          </div>
          <div className="mt-2 text-xs font-black uppercase text-slate-500">
            {billingMarket === 'local' ? 'Local LKR price' : 'Global USD price'} - {countryNameFromCode(resolvedCountry)}
          </div>
          <div className="mt-1 text-sm font-bold text-slate-400">{selectedPlan.duration}</div>
          {planPrices?.[selectedPlan.key]?.promotionActive && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-sm font-black text-slate-500 line-through">{formatCents(planPrices[selectedPlan.key].baseAmountCents, planPrices[selectedPlan.key].currency)}</span>
              <span className="rounded-full bg-emerald-300 px-2.5 py-1 text-[10px] font-black uppercase text-slate-950">{planPrices[selectedPlan.key].discountBadge}</span>
            </div>
          )}
          {quote && (quote.couponDiscountCents || 0) > 0 && (
            <div className="mt-3 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-sm font-black text-emerald-200">
              Coupon {quote.couponCode}: -{formatCents(quote.couponDiscountCents || 0, quote.currency)}
            </div>
          )}
          {(quote?.promotionLabel || planPrices?.[selectedPlan.key]?.promotionLabel) && (
            <div className="mt-2 text-xs font-black uppercase text-emerald-200">{quote?.promotionLabel || planPrices?.[selectedPlan.key]?.promotionLabel}</div>
          )}
        </div>

        {!showCouponInput ? (
          <button
            type="button"
            onClick={onShowCouponInput}
            className="mt-5 w-full rounded-2xl border border-dashed border-violet-400/40 bg-violet-500/5 py-3 text-sm font-bold text-violet-300 transition hover:border-violet-400/60 hover:bg-violet-500/10 hover:text-violet-200"
          >
            Do you have a coupon?
          </button>
        ) : (
          <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <label className="grid gap-2 text-sm font-black text-slate-200">
              Coupon code
              <div className="relative mt-1">
                <input
                  value={couponCode}
                  onChange={(event) => onCouponCodeChange(event.target.value.toUpperCase())}
                  className="h-11 w-full rounded-xl border border-white/10 bg-white/6 px-3 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400"
                  placeholder="PROMO2026"
                />
              </div>
            </label>
            {quoteLoading && <p className="mt-2 text-xs font-bold text-slate-500">Checking coupon...</p>}
          </div>
        )}

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
                onClick={() => onSelectPlan(plan.key)}
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
                <span className="text-right text-xs font-black text-slate-400">
                  {planPrices?.[plan.key]?.promotionActive && <span className="mr-1 text-slate-600 line-through">{formatCents(planPrices[plan.key].baseAmountCents, planPrices[plan.key].currency)}</span>}
                  {planPrices?.[plan.key] ? formatCents(planPrices[plan.key].cents, planPrices[plan.key].currency) : 'Loading...'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
