import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import toast from 'react-hot-toast';
import { apiFetch } from '../../utils/api';
import { countryNameFromCode } from '../../utils/countries';
import type { BillingPlansResponse, CheckoutQuoteResponse } from '@nexcv/api-contracts/billing';
import type { BillingPlanPrice, CheckoutCustomerFormData, CheckoutPlanKey, CheckoutQuote } from './checkoutTypes';

interface UseCheckoutPricingParams {
  countryCode: string;
  selectedPlanKey: CheckoutPlanKey;
  couponCode: string;
  initialCountry: string;
  setForm: Dispatch<SetStateAction<CheckoutCustomerFormData>>;
}

export function useCheckoutPricing({
  countryCode,
  selectedPlanKey,
  couponCode,
  initialCountry,
  setForm,
}: UseCheckoutPricingParams) {
  const [planPrices, setPlanPrices] = useState<Record<CheckoutPlanKey, BillingPlanPrice> | null>(null);
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteRefreshKey, setQuoteRefreshKey] = useState(0);
  const [resolvedCountry, setResolvedCountry] = useState(initialCountry || 'LK');
  const [billingMarket, setBillingMarket] = useState<'local' | 'global'>('local');

  const resetQuote = useCallback(() => setQuote(null), []);
  const refreshQuote = useCallback(() => setQuoteRefreshKey((key) => key + 1), []);

  useEffect(() => {
    let ignore = false;
    const suffix = countryCode ? `?country=${encodeURIComponent(countryCode)}` : '';
    apiFetch<BillingPlansResponse>(`/api/billing/plans${suffix}`, { cache: 'no-store' })
      .then((data) => {
        if (ignore) return;
        setResolvedCountry(data.country);
        setBillingMarket(data.market);
        if (!countryCode && data.country && data.country !== 'GLOBAL') {
          setForm((current) => ({
            ...current,
            countryCode: data.country,
            country: countryNameFromCode(data.country),
          }));
        }
        const next = data.plans.reduce((acc, plan) => ({ ...acc, [plan.plan]: plan }), {} as Record<CheckoutPlanKey, BillingPlanPrice>);
        setPlanPrices(next);
      })
      .catch(() => undefined);
    return () => {
      ignore = true;
    };
  }, [countryCode, setForm]);

  useEffect(() => {
    let ignore = false;
    const timer = window.setTimeout(() => {
      setQuoteLoading(true);
      apiFetch<CheckoutQuoteResponse>('/api/billing/quote', {
        method: 'POST',
        body: JSON.stringify({ plan: selectedPlanKey, couponCode: couponCode.trim(), country: countryCode }),
      })
        .then((data) => {
          if (!ignore) setQuote(data.quote);
        })
        .catch((error) => {
          if (!ignore) {
            setQuote(null);
            if (couponCode.trim()) toast.error(error instanceof Error ? error.message : 'Coupon is not valid.');
          }
        })
        .finally(() => {
          if (!ignore) setQuoteLoading(false);
        });
    }, 250);
    return () => {
      ignore = true;
      window.clearTimeout(timer);
    };
  }, [countryCode, couponCode, quoteRefreshKey, selectedPlanKey]);

  return {
    billingMarket,
    planPrices,
    quote,
    quoteLoading,
    refreshQuote,
    resetQuote,
    resolvedCountry,
  };
}
