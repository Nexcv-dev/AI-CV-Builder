import React from 'react';
import { Eye, Loader2 } from 'lucide-react';
import type { AdminPaymentItem } from '../adminTypes';
import { formatDate } from '../adminUtils';
import { PaymentStatusBadge } from '../AdminSharedComponents';
import { providerLabel, providerTone } from './billingDisplay';

export function BillingPaymentsTable({
  payments,
  loading,
  onOpenPayment,
}: {
  payments: AdminPaymentItem[];
  loading: boolean;
  onOpenPayment: (payment: AdminPaymentItem) => void;
}) {
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] shadow-2xl shadow-black/15">
      <div className="grid grid-cols-[1.2fr_130px_150px_110px_120px_100px] gap-3 border-b border-white/10 px-5 py-3 text-xs font-black uppercase text-slate-500 max-lg:hidden">
        <span>Transaction</span>
        <span>Provider</span>
        <span>User</span>
        <span>Plan</span>
        <span>Amount</span>
        <span>Action</span>
      </div>
      {loading && (
        <div className="flex items-center gap-3 px-5 py-5 text-sm font-bold text-slate-400">
          <Loader2 className="animate-spin text-violet-300" size={17} />
          Loading payments...
        </div>
      )}
      {!loading && payments.length === 0 && (
        <div className="px-5 py-8 text-center text-sm font-bold text-slate-500">No payments match these filters.</div>
      )}
      {!loading && payments.map((payment) => (
        <article key={payment.id} className="grid gap-3 border-b border-white/10 px-4 py-4 last:border-b-0 lg:grid-cols-[1.2fr_130px_150px_110px_120px_100px] lg:items-center lg:px-5">
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-100">{payment.paymentId}</p>
            <p className="mt-1 truncate text-xs font-semibold text-slate-500">{payment.orderId}</p>
            <p className="mt-1 text-xs font-bold text-slate-600">{formatDate(payment.createdAt)}</p>
          </div>
          <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ring-1 ${providerTone(payment.provider)}`}>
            {providerLabel(payment.provider)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-200">{payment.user?.displayName || 'Unknown'}</p>
            <p className="mt-1 truncate text-xs font-semibold text-slate-500">{payment.user?.email || 'No linked user'}</p>
          </div>
          <span className="w-fit rounded-full bg-violet-400/10 px-3 py-1 text-xs font-black text-violet-300 ring-1 ring-violet-300/20">{payment.plan || 'Unknown'}</span>
          <div>
            <p className="text-sm font-black text-slate-100">{payment.currency} {payment.amount}</p>
            {payment.reviewStatus === 'expired' ? (
              <span className="mt-1 inline-flex rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-black uppercase text-amber-300 ring-1 ring-amber-300/20">Expired</span>
            ) : payment.reviewStatus === 'failed' ? (
              <span className="mt-1 inline-flex rounded-full bg-red-400/10 px-2 py-0.5 text-[10px] font-black uppercase text-red-300 ring-1 ring-red-300/20">Failed</span>
            ) : (
              <PaymentStatusBadge processed={payment.processed} statusCode={payment.statusCode} />
            )}
          </div>
          <button type="button" onClick={() => onOpenPayment(payment)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/6 px-3 text-xs font-black text-slate-100 transition hover:bg-white/10 active:scale-[0.98]">
            <Eye size={14} />
            View
          </button>
        </article>
      ))}
    </div>
  );
}
