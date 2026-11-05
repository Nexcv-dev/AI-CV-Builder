import React from 'react';
import { Check, Loader2, X } from 'lucide-react';
import type { AdminPaymentItem } from '../adminTypes';
import { formatDate } from '../adminUtils';
import { DetailTile } from '../AdminSharedComponents';
import { paymentStatusLabel } from './billingDisplay';

export function BillingReviewDrawer({
  payment,
  reviewNote,
  reviewing,
  canReview,
  onClose,
  onReviewNoteChange,
  onMarkReviewed,
}: {
  payment: AdminPaymentItem;
  reviewNote: string;
  reviewing: boolean;
  canReview: boolean;
  onClose: () => void;
  onReviewNoteChange: (value: string) => void;
  onMarkReviewed: (payment: AdminPaymentItem) => void;
}) {
  return (
    <div className="fixed inset-0 z-80 flex justify-end bg-slate-950/70 backdrop-blur-sm" role="dialog" aria-modal="true">
      <aside className="h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-slate-950 p-5 text-white shadow-2xl shadow-black/40">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-violet-300">{payment.reviewType === 'checkout' ? 'Checkout Review' : 'Payment Details'}</p>
            <h2 className="mt-1 truncate font-montserrat text-2xl font-black">{payment.paymentId}</h2>
            <p className="mt-1 truncate text-sm font-semibold text-slate-400">{payment.orderId}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/6 text-slate-300 transition hover:bg-white/10 hover:text-white" aria-label="Close payment details">
            <X size={17} />
          </button>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <DetailTile label="Provider" value={payment.provider} />
          <DetailTile label="Status" value={paymentStatusLabel(payment)} />
          <DetailTile label="Review Type" value={payment.reviewType === 'checkout' ? 'Checkout session' : 'Payment notification'} />
          <DetailTile label="Plan" value={payment.plan || 'Unknown'} />
          <DetailTile label="Amount" value={`${payment.currency} ${payment.amount}`} />
          <DetailTile label="User" value={payment.user?.email || 'No linked user'} />
          <DetailTile label="Date" value={formatDate(payment.createdAt)} />
          <DetailTile label="Processed At" value={payment.processedAt ? formatDate(payment.processedAt) : 'Not processed'} />
          <DetailTile label="Processing Lock" value={payment.processingStartedAt ? formatDate(payment.processingStartedAt) : 'None'} />
          <DetailTile label="Review State" value={payment.billingReviewStatus === 'resolved' ? 'Resolved' : 'Open'} />
          {payment.reviewedAt && <DetailTile label="Reviewed At" value={formatDate(payment.reviewedAt)} />}
        </div>
        {payment.reviewType && (
          <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <h3 className="font-montserrat text-lg font-black">Review Action</h3>
            {payment.billingReviewStatus === 'resolved' ? (
              <p className="mt-3 rounded-xl border border-emerald-300/20 bg-emerald-400/10 p-3 text-sm font-bold text-emerald-200">
                Resolved{payment.reviewNote ? `: ${payment.reviewNote}` : '.'}
              </p>
            ) : (
              <>
                <textarea
                  value={reviewNote}
                  onChange={(event) => onReviewNoteChange(event.target.value)}
                  className="mt-4 min-h-24 w-full resize-y rounded-xl border border-white/10 bg-slate-900 p-3 text-sm font-semibold text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400"
                  placeholder="Add what you checked before resolving"
                  maxLength={500}
                />
                <button
                  type="button"
                  onClick={() => onMarkReviewed(payment)}
                  disabled={!canReview || reviewing}
                  className="mt-3 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 text-sm font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {reviewing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Mark Reviewed
                </button>
                {!canReview && <p className="mt-2 text-xs font-bold text-slate-500">Billing write permission required.</p>}
              </>
            )}
          </section>
        )}
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
          <h3 className="font-montserrat text-lg font-black">Payload Summary</h3>
          <pre className="mt-4 max-h-80 overflow-auto rounded-xl bg-slate-900 p-3 text-xs font-semibold text-slate-300">
            {JSON.stringify(payment.rawPayload, null, 2)}
          </pre>
        </section>
      </aside>
    </div>
  );
}
