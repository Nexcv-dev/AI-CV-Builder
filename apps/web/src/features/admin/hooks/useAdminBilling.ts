import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiFetch } from '../../../utils/api';
import type { AdminPaymentItem, AdminPaymentSummary } from '../adminTypes';

export function useAdminBilling({ enabled }: { enabled: boolean }) {
  const [payments, setPayments] = useState<AdminPaymentItem[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<AdminPaymentSummary | null>(null);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentPlanFilter, setPaymentPlanFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState<AdminPaymentItem | null>(null);
  const [billingReviewNote, setBillingReviewNote] = useState('');
  const [reviewingPaymentId, setReviewingPaymentId] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let ignore = false;
    const timer = window.setTimeout(async () => {
      setPaymentsLoading(true);
      try {
        const params = new URLSearchParams();
        if (paymentSearch.trim()) params.set('search', paymentSearch.trim());
        if (paymentPlanFilter !== 'all') params.set('plan', paymentPlanFilter);
        if (paymentStatusFilter !== 'all') params.set('status', paymentStatusFilter);
        const data = await apiFetch<{ payments: AdminPaymentItem[]; summary: AdminPaymentSummary }>(`/api/admin/payments?${params.toString()}`);
        if (ignore) return;
        setPayments(data.payments);
        setPaymentSummary(data.summary);
      } catch (error) {
        if (!ignore) toast.error(error instanceof Error ? error.message : 'Could not load payments.');
      } finally {
        if (!ignore) setPaymentsLoading(false);
      }
    }, 250);

    return () => {
      ignore = true;
      window.clearTimeout(timer);
    };
  }, [enabled, paymentPlanFilter, paymentSearch, paymentStatusFilter]);

  const openPaymentDetail = (payment: AdminPaymentItem) => {
    setSelectedPayment(payment);
    setBillingReviewNote(payment.reviewNote || '');
  };

  const closePaymentDetail = () => {
    setSelectedPayment(null);
    setBillingReviewNote('');
  };

  const markBillingReviewResolved = async (payment: AdminPaymentItem) => {
    if (!payment.reviewType) return;
    setReviewingPaymentId(payment.id);
    try {
      const data = await apiFetch<{ payment: AdminPaymentItem }>(`/api/admin/billing/review/${payment.reviewType}/${payment.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ note: billingReviewNote }),
      });
      // The review queue only lists open items, so a resolved one leaves it.
      setPayments((items) => paymentStatusFilter === 'review'
        ? items.filter((item) => item.id !== data.payment.id)
        : items.map((item) => item.id === data.payment.id ? data.payment : item));
      setPaymentSummary((current) => {
        if (!current || payment.billingReviewStatus === 'resolved') return current;
        const isCheckoutReview = payment.reviewType === 'checkout';
        return {
          ...current,
          checkoutReviewCount: isCheckoutReview ? Math.max(0, current.checkoutReviewCount - 1) : current.checkoutReviewCount,
          failedPaymentCount: isCheckoutReview ? current.failedPaymentCount : Math.max(0, current.failedPaymentCount - 1),
        };
      });
      setSelectedPayment(data.payment);
      setBillingReviewNote(data.payment.reviewNote || '');
      toast.success('Billing review resolved.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not resolve billing review.');
    } finally {
      setReviewingPaymentId(null);
    }
  };

  return {
    billingReviewNote,
    closePaymentDetail,
    markBillingReviewResolved,
    openPaymentDetail,
    paymentPlanFilter,
    payments,
    paymentSearch,
    paymentsLoading,
    paymentStatusFilter,
    paymentSummary,
    reviewingPaymentId,
    selectedPayment,
    setBillingReviewNote,
    setPaymentPlanFilter,
    setPaymentSearch,
    setPaymentStatusFilter,
  };
}
