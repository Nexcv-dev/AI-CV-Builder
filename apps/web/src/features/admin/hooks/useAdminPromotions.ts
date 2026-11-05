import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiFetch } from '../../../utils/api';
import type { AdminBillingPlan, AdminBillingPlanDraft, AdminCoupon, AdminCouponForm } from '../adminTypes';

export const emptyCouponForm: AdminCouponForm = {
  code: '',
  label: '',
  discountType: 'fixed',
  discountValue: '',
  appliesTo: 'pro',
  maxRedemptions: '25',
  active: true,
};

export function couponPlanKeys(appliesTo: string) {
  if (appliesTo === 'both') return ['payg', 'monthly', 'quarterly'];
  if (appliesTo === 'pro') return ['monthly', 'quarterly'];
  return [appliesTo];
}

/** Fixed amounts are entered in whole currency units and stored in cents; percentages are stored as-is. */
function discountValueForApi(discountType: 'fixed' | 'percent', value: string) {
  return discountType === 'fixed' ? Math.round(Number(value) * 100) : Number(value);
}

export function useAdminPromotions({ enabled }: { enabled: boolean }) {
  const [billingPlans, setBillingPlans] = useState<AdminBillingPlan[]>([]);
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [couponForm, setCouponForm] = useState<AdminCouponForm>(emptyCouponForm);
  const [savingBilling, setSavingBilling] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let ignore = false;
    apiFetch<{ plans: AdminBillingPlan[]; coupons: AdminCoupon[] }>('/api/admin/billing/config')
      .then((data) => {
        if (ignore) return;
        setBillingPlans(data.plans);
        setCoupons(data.coupons);
      })
      .catch((error) => {
        if (!ignore) toast.error(error instanceof Error ? error.message : 'Could not load billing settings.');
      });
    return () => {
      ignore = true;
    };
  }, [enabled]);

  const updateBillingPlanPrice = async (plan: AdminBillingPlan, draft: AdminBillingPlanDraft) => {
    setSavingBilling(true);
    try {
      const data = await apiFetch<{ plan: AdminBillingPlan }>(`/api/admin/billing/plans/${plan.plan}`, {
        method: 'PATCH',
        body: JSON.stringify({
          label: draft.label,
          market: plan.market,
          amountCents: Math.round(Number(draft.amount) * 100),
          promotionActive: draft.promotionActive,
          promotionLabel: draft.promotionLabel,
          promotionDiscountType: draft.promotionDiscountType,
          promotionDiscountValue: discountValueForApi(draft.promotionDiscountType, draft.promotionDiscountValue),
        }),
      });
      setBillingPlans((items) => items.map((item) => item.plan === data.plan.plan && item.market === data.plan.market ? data.plan : item));
      toast.success('Plan price updated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update plan price.');
    } finally {
      setSavingBilling(false);
    }
  };

  const saveCoupon = async () => {
    setSavingBilling(true);
    try {
      const data = await apiFetch<{ coupon: AdminCoupon }>('/api/admin/billing/coupons', {
        method: 'POST',
        body: JSON.stringify({
          ...couponForm,
          discountValue: discountValueForApi(couponForm.discountType, couponForm.discountValue),
          appliesTo: couponPlanKeys(couponForm.appliesTo),
          maxRedemptions: couponForm.maxRedemptions,
        }),
      });
      setCoupons((items) => [data.coupon, ...items.filter((item) => item.code !== data.coupon.code)]);
      setCouponForm(emptyCouponForm);
      toast.success('Coupon saved.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save coupon.');
    } finally {
      setSavingBilling(false);
    }
  };

  const toggleCoupon = async (coupon: AdminCoupon) => {
    setSavingBilling(true);
    try {
      const data = await apiFetch<{ coupon: AdminCoupon }>(`/api/admin/billing/coupons/${coupon.code}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...coupon, active: !coupon.active }),
      });
      setCoupons((items) => items.map((item) => item.code === data.coupon.code ? data.coupon : item));
      toast.success(data.coupon.active ? 'Coupon activated.' : 'Coupon paused.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update coupon.');
    } finally {
      setSavingBilling(false);
    }
  };

  const deleteCoupon = async (coupon: AdminCoupon) => {
    setSavingBilling(true);
    try {
      await apiFetch(`/api/admin/billing/coupons/${coupon.code}`, {
        method: 'DELETE',
      });
      setCoupons((items) => items.filter((item) => item.code !== coupon.code));
      toast.success('Coupon deleted.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete coupon.');
    } finally {
      setSavingBilling(false);
    }
  };

  return {
    billingPlans,
    couponForm,
    coupons,
    deleteCoupon,
    saveCoupon,
    savingBilling,
    setCouponForm,
    toggleCoupon,
    updateBillingPlanPrice,
  };
}
