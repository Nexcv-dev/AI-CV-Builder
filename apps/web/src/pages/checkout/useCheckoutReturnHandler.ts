import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import toast from 'react-hot-toast';
import type { AuthUser } from '../../utils/api';
import { apiFetch, getCurrentUser, notifyAuthUserChanged } from '../../utils/api';
import type { CheckoutPlanKey, CheckoutStatusResponse } from './checkoutTypes';

interface UseCheckoutReturnHandlerParams {
  navigate: (to: string, options?: { replace?: boolean }) => void;
  searchParams: URLSearchParams;
  setSearchParams: (nextInit: Record<string, string>, navigateOptions?: { replace?: boolean }) => void;
  selectedPlanKey: CheckoutPlanKey;
  couponCode: string;
  checkoutInFlightRef: MutableRefObject<boolean>;
  confirmingReturnRef: MutableRefObject<string | null>;
  handledCancelRef: MutableRefObject<string | null>;
  setSubmitting: Dispatch<SetStateAction<boolean>>;
  setUser: Dispatch<SetStateAction<AuthUser | null>>;
}

export function useCheckoutReturnHandler({
  navigate,
  searchParams,
  setSearchParams,
  selectedPlanKey,
  couponCode,
  checkoutInFlightRef,
  confirmingReturnRef,
  handledCancelRef,
  setSubmitting,
  setUser,
}: UseCheckoutReturnHandlerParams) {
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'cancel') {
      const orderId = searchParams.get('order');
      const cancelKey = `${selectedPlanKey}:${orderId || 'no-order'}`;
      if (handledCancelRef.current === cancelKey) return;
      handledCancelRef.current = cancelKey;
      if (orderId) {
        void apiFetch(`/api/billing/checkout/${encodeURIComponent(orderId)}/cancel`, { method: 'POST' }).catch(() => undefined);
      }
      sessionStorage.removeItem('nexcv-pending-checkout');
      checkoutInFlightRef.current = false;
      setSubmitting(false);
      toast.error('Payment cancelled. Your plan was not changed.', { id: 'payment-cancelled' });
      const nextParams: Record<string, string> = { plan: selectedPlanKey };
      if (couponCode.trim()) nextParams.coupon = couponCode.trim();
      setSearchParams(nextParams, { replace: true });
      return;
    }

    if (paymentStatus !== 'return') return;

    let ignore = false;
    const orderId = searchParams.get('order') || 'unknown-order';
    const confirmationKey = `${selectedPlanKey}:${orderId}`;
    if (confirmingReturnRef.current === confirmationKey) return;
    confirmingReturnRef.current = confirmationKey;
    const toastId = 'payment-confirmation';
    toast.loading('Confirming your payment...', { id: toastId });

    async function finishPaymentReturn() {
      let refreshedUser: AuthUser | null = null;
      let planActive = false;
      let checkoutStatus: CheckoutStatusResponse['status'] | null = null;

      for (let attempt = 0; attempt < 30; attempt += 1) {
        try {
          if (orderId && orderId !== 'unknown-order') {
            const status = await apiFetch<CheckoutStatusResponse>(
              `/api/billing/checkout/${encodeURIComponent(orderId)}/status`,
              { cache: 'no-store' }
            );
            checkoutStatus = status.status;
            if (status.user) {
              refreshedUser = status.user;
            }
            if (status.planActive || status.status === 'paid') {
              planActive = true;
              break;
            }
            if (status.status === 'failed' || status.status === 'expired' || status.status === 'cancelled') {
              break;
            }
          }

          refreshedUser = await getCurrentUser();
          if (refreshedUser.plan === selectedPlanKey || refreshedUser.plan === 'unlimited') {
            planActive = true;
            break;
          }
        } catch {
          // Keep retrying briefly; gateways can redirect before the webhook has refreshed the plan.
        }

        await new Promise((resolve) => window.setTimeout(resolve, 1500));
      }

      if (ignore) return;

      if (refreshedUser) {
        setUser(refreshedUser);
        notifyAuthUserChanged(refreshedUser);
      }

      sessionStorage.removeItem('nexcv-pending-checkout');
      toast.dismiss(toastId);
      if (planActive) {
        navigate('/builder?payment=success', { replace: true });
        return;
      }

      const pendingMessage = checkoutStatus === 'failed' || checkoutStatus === 'expired' || checkoutStatus === 'cancelled'
        ? 'Payment was not confirmed by the gateway. Please contact support if money was deducted.'
        : 'Payment is still being confirmed. Please refresh in a moment.';
      toast(pendingMessage, { id: 'payment-confirmation-pending' });
      const nextParams: Record<string, string> = { plan: selectedPlanKey };
      if (couponCode.trim()) nextParams.coupon = couponCode.trim();
      setSearchParams(nextParams, { replace: true });
    }

    void finishPaymentReturn();

    return () => {
      ignore = true;
      confirmingReturnRef.current = null;
    };
  }, [
    checkoutInFlightRef,
    confirmingReturnRef,
    couponCode,
    handledCancelRef,
    navigate,
    searchParams,
    selectedPlanKey,
    setSearchParams,
    setSubmitting,
    setUser,
  ]);
}
