import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import type {
  AdminBillingPlan,
  AdminBillingPlanDraft,
  AdminCoupon,
} from './adminTypes';
import { billingPlanDraftFromPlan, formatCurrency } from './adminUtils';

export default function PromotionManagementSection({
  billingPlans,
  coupons,
  couponForm,
  onUpdatePlanPrice,
  onCouponFormChange,
  onSaveCoupon,
  onToggleCoupon,
}: {
  billingPlans: AdminBillingPlan[];
  coupons: AdminCoupon[];
  couponForm: { code: string; label: string; discountType: 'fixed' | 'percent'; discountValue: string; appliesTo: string; active: boolean };
  savingBilling: boolean;
  onUpdatePlanPrice: (plan: AdminBillingPlan, draft: AdminBillingPlanDraft) => Promise<void>;
  onCouponFormChange: (value: { code: string; label: string; discountType: 'fixed' | 'percent'; discountValue: string; appliesTo: string; active: boolean }) => void;
  onSaveCoupon: () => Promise<void>;
  onToggleCoupon: (coupon: AdminCoupon) => Promise<void>;
}) {
  const [planDrafts, setPlanDrafts] = useState<Record<string, AdminBillingPlanDraft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [couponSearch, setCouponSearch] = useState('');

  const draftKeyForPlan = (plan: AdminBillingPlan) => `${plan.plan}:${plan.market}`;

  const setPlanDraftField = (plan: AdminBillingPlan, field: keyof AdminBillingPlanDraft, value: string | boolean) => {
    const draftKey = draftKeyForPlan(plan);
    setPlanDrafts((current) => ({
      ...current,
      [draftKey]: {
        ...(current[draftKey] || billingPlanDraftFromPlan(plan)),
        [field]: value,
      },
    }));
  };

  const handleUpdatePlanPrice = async (plan: AdminBillingPlan) => {
    const draftKey = draftKeyForPlan(plan);
    const draft = planDrafts[draftKey] || billingPlanDraftFromPlan(plan);
    setSavingId(draftKey);
    await onUpdatePlanPrice(plan, draft).finally(() => setSavingId(null));
  };

  const handleSaveCoupon = async () => {
    setSavingId('new_coupon');
    await onSaveCoupon().finally(() => setSavingId(null));
  };

  const handleToggleCoupon = async (coupon: AdminCoupon) => {
    setSavingId(coupon.code);
    await onToggleCoupon(coupon).finally(() => setSavingId(null));
  };

  const visibleCoupons = useMemo(() => {
    const query = couponSearch.trim().toLowerCase();
    if (!query) return coupons;
    return coupons.filter((c) => c.code.toLowerCase().includes(query) || c.label.toLowerCase().includes(query));
  }, [coupons, couponSearch]);

  const isAnySaving = savingId !== null;

  return (
    <section className="mt-6 grid gap-6">
      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 sm:p-5">
        <h2 className="font-montserrat text-lg font-black">Package Prices</h2>
        <div className="mt-4 grid gap-4">
          {billingPlans.map((plan) => {
            const draftKey = draftKeyForPlan(plan);
            const draft = planDrafts[draftKey] || billingPlanDraftFromPlan(plan);
            return (
              <div key={draftKey} className="grid gap-4 rounded-xl border border-white/10 bg-slate-950/50 p-4">
                <div>
                  <p className="text-sm font-black text-slate-100">{plan.label} <span className="text-slate-500">({plan.market === 'local' ? 'Sri Lanka' : 'Global'})</span></p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{plan.plan} · {plan.source}</p>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="grid min-w-[120px] flex-1 gap-1 text-xs font-black text-slate-400">
                    Badge label
                    <input value={draft.promotionLabel} onChange={(event) => setPlanDraftField(plan, 'promotionLabel', event.target.value)} placeholder="Limited offer" className="h-10 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-violet-400" />
                  </label>
                  <label className="grid min-w-[120px] flex-1 gap-1 text-xs font-black text-slate-400">
                    Price {plan.currency}
                    <input value={draft.amount} onChange={(event) => setPlanDraftField(plan, 'amount', event.target.value)} className="h-10 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-violet-400" />
                  </label>
                  <label className="grid min-w-[120px] flex-1 gap-1 text-xs font-black text-slate-400">
                    Promo type
                    <select value={draft.promotionDiscountType} onChange={(event) => setPlanDraftField(plan, 'promotionDiscountType', event.target.value as 'fixed' | 'percent')} className="h-10 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-violet-400">
                      <option value="fixed">{plan.currency} off</option>
                      <option value="percent">% off</option>
                    </select>
                  </label>
                  <label className="grid min-w-[120px] flex-1 gap-1 text-xs font-black text-slate-400">
                    Promo value
                    <input value={draft.promotionDiscountValue} onChange={(event) => setPlanDraftField(plan, 'promotionDiscountValue', event.target.value)} placeholder={draft.promotionDiscountType === 'fixed' ? '250' : '15'} className="h-10 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-violet-400" />
                  </label>
                  <button
                    type="button"
                    disabled={isAnySaving}
                    onClick={() => handleUpdatePlanPrice(plan)}
                    className={`h-10 min-w-[100px] shrink-0 rounded-xl bg-violet-600 px-4 text-sm font-black text-white transition hover:bg-violet-500 disabled:cursor-not-allowed ${savingId === draftKey ? 'opacity-50' : ''}`}
                  >
                    {savingId === draftKey ? 'Saving...' : 'Save'}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <label className="inline-flex w-fit items-center gap-2 text-xs font-black text-slate-300">
                    <input type="checkbox" checked={draft.promotionActive} onChange={(event) => setPlanDraftField(plan, 'promotionActive', event.target.checked)} className="rounded border-white/20 bg-slate-900" />
                    Show promotion with strike-through original price
                  </label>
                  {plan.promotionActive && (
                    <p className="text-xs font-black text-emerald-300">{plan.discountBadge} active: {formatCurrency(plan.baseAmountCents, plan.currency)} - {formatCurrency(plan.cents, plan.currency)}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-montserrat text-lg font-black">Coupons</h2>
          <div className="relative w-full sm:max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={couponSearch}
              onChange={(e) => setCouponSearch(e.target.value)}
              className="h-10 w-full rounded-xl border border-white/10 bg-slate-950 pl-10 pr-3 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400"
              placeholder="Search coupons..."
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <input value={couponForm.code} onChange={(event) => onCouponFormChange({ ...couponForm, code: event.target.value.toUpperCase() })} placeholder="CODE" className="h-10 min-w-[120px] flex-1 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-violet-400" />
          <input value={couponForm.label} onChange={(event) => onCouponFormChange({ ...couponForm, label: event.target.value })} placeholder="Label" className="h-10 min-w-[120px] flex-1 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-violet-400" />
          <select value={couponForm.discountType} onChange={(event) => onCouponFormChange({ ...couponForm, discountType: event.target.value as 'fixed' | 'percent' })} className="h-10 min-w-[100px] shrink-0 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-violet-400">
            <option value="fixed">LKR off</option>
            <option value="percent">% off</option>
          </select>
          <input value={couponForm.discountValue} onChange={(event) => onCouponFormChange({ ...couponForm, discountValue: event.target.value })} placeholder={couponForm.discountType === 'fixed' ? '250' : '15'} className="h-10 min-w-[100px] flex-1 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-violet-400" />
          <select value={couponForm.appliesTo} onChange={(event) => onCouponFormChange({ ...couponForm, appliesTo: event.target.value })} className="h-10 min-w-[120px] flex-1 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-violet-400">
            <option value="both">Both plans</option>
            <option value="payg">Pay As You Go</option>
            <option value="monthly">Monthly</option>
          </select>
          <button
            type="button"
            disabled={isAnySaving}
            onClick={handleSaveCoupon}
            className={`h-10 min-w-[100px] shrink-0 rounded-xl bg-emerald-600 px-4 text-sm font-black text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed ${savingId === 'new_coupon' ? 'opacity-50' : ''}`}
          >
            {savingId === 'new_coupon' ? 'Saving...' : 'Save'}
          </button>
        </div>

        <div className="mt-6 grid gap-2">
          {visibleCoupons.length === 0 && (
            <p className="text-center text-sm font-semibold text-slate-500 py-4">No coupons found.</p>
          )}
          {visibleCoupons.map((coupon) => (
            <div key={coupon.code} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/50 p-4">
              <div>
                <p className="text-sm font-black text-slate-100">{coupon.code} <span className="text-slate-500">· {coupon.label}</span></p>
                <p className="mt-1 text-xs font-bold text-slate-500">{coupon.discountType === 'percent' ? `${coupon.discountValue}%` : formatCurrency(coupon.discountValue, 'LKR')} off · used {coupon.redeemedCount}</p>
              </div>
              <button
                type="button"
                disabled={isAnySaving}
                onClick={() => handleToggleCoupon(coupon)}
                className={`h-9 min-w-[90px] rounded-xl px-3 text-xs font-black transition disabled:cursor-not-allowed ${savingId === coupon.code ? 'opacity-50' : ''} ${coupon.active ? 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-300/20 hover:bg-amber-500/25' : 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-300/20 hover:bg-emerald-500/25'}`}
              >
                {savingId === coupon.code ? '...' : (coupon.active ? 'Pause' : 'Activate')}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
