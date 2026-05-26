import React, { useState } from 'react';
import {
  Check,
  AlertCircle,
  CreditCard,
  Crown,
  Eye,
  Clock3,
  Loader2,
  Search,
  X,
} from 'lucide-react';
import type {
  AdminPaymentItem,
  AdminPaymentSummary,
} from './adminTypes';
import { formatCurrency, formatDate } from './adminUtils';
import { AdminStat, DetailTile, MiniRow, PaymentStatusBadge } from './AdminSharedComponents';

export default function BillingManagementSection({
  payments,
  summary,
  loading,
  search,
  planFilter,
  statusFilter,
  selectedPayment,
  reviewNote,
  reviewingPaymentId,
  canReviewPayments,
  onSearchChange,
  onPlanFilterChange,
  onStatusFilterChange,
  onOpenPayment,
  onCloseDetail,
  onReviewNoteChange,
  onMarkReviewed,
}: {
  payments: AdminPaymentItem[];
  summary: AdminPaymentSummary | null;
  loading: boolean;
  search: string;
  planFilter: string;
  statusFilter: string;
  selectedPayment: AdminPaymentItem | null;
  reviewNote: string;
  reviewingPaymentId: string | null;
  canReviewPayments: boolean;
  onSearchChange: (value: string) => void;
  onPlanFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onOpenPayment: (payment: AdminPaymentItem) => void;
  onCloseDetail: () => void;
  onReviewNoteChange: (value: string) => void;
  onMarkReviewed: (payment: AdminPaymentItem) => void;
}) {
  const needsReviewCount = (summary?.checkoutReviewCount || 0) + (summary?.failedPaymentCount || 0);

  return (
    <section className="mt-6">
      <div className="grid gap-4 md:grid-cols-5">
        <AdminStat icon={<CreditCard size={19} />} label="Total Revenue" value={summary ? formatCurrency(summary.totalRevenueCents, summary.currency) : 'LKR 0'} />
        <AdminStat icon={<Check size={19} />} label="Processed Payments" value={String(summary?.processedCount || 0)} />
        <AdminStat icon={<Crown size={19} />} label="Monthly Revenue" value={formatCurrency(summary?.revenueByPlan.monthly || 0, summary?.currency || 'LKR')} />
        <AdminStat icon={<Clock3 size={19} />} label="Pending Checkouts" value={String(summary?.pendingCheckoutCount || 0)} />
        <button
          type="button"
          onClick={() => onStatusFilterChange(statusFilter === 'review' ? 'all' : 'review')}
          className={`rounded-2xl text-left transition active:scale-[0.99] ${statusFilter === 'review' ? 'ring-2 ring-amber-300/50' : 'hover:ring-1 hover:ring-amber-300/30'}`}
          aria-pressed={statusFilter === 'review'}
        >
          <AdminStat icon={<AlertCircle size={19} />} label="Needs Review" value={String(needsReviewCount)} />
        </button>
      </div>


      <div className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 md:grid-cols-[1fr_180px_180px]">
        <label className="relative block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="h-11 w-full rounded-xl border border-white/10 bg-slate-950 pl-10 pr-3 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400"
            placeholder="Search payment, order, or user"
          />
        </label>
        <select value={planFilter} onChange={(event) => onPlanFilterChange(event.target.value)} className="h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-violet-400">
          <option value="all">All plans</option>
          <option value="payg">Pay As You Go</option>
          <option value="monthly">Monthly</option>
        </select>
        <select value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value)} className="h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-violet-400">
          <option value="all">All statuses</option>
          <option value="processed">Processed</option>
          <option value="unprocessed">Unprocessed</option>
          <option value="review">Needs Review</option>
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] shadow-2xl shadow-black/15">
        <div className="grid grid-cols-[1.2fr_150px_110px_120px_100px] gap-3 border-b border-white/10 px-5 py-3 text-xs font-black uppercase text-slate-500 max-lg:hidden">
          <span>Transaction</span>
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
          <article key={payment.id} className="grid gap-3 border-b border-white/10 px-4 py-4 last:border-b-0 lg:grid-cols-[1.2fr_150px_110px_120px_100px] lg:items-center lg:px-5">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-100">{payment.paymentId}</p>
              <p className="mt-1 truncate text-xs font-semibold text-slate-500">{payment.orderId}</p>
              <p className="mt-1 text-xs font-bold text-slate-600">{formatDate(payment.createdAt)}</p>
            </div>
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

      {summary && (
        <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10">
          <h2 className="font-montserrat text-lg font-black">Daily Revenue</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-7">
            {summary.dailyRevenue.map((item) => (
              <MiniRow key={item.day} label={item.day.slice(5)} value={formatCurrency(item.cents, summary.currency)} />
            ))}
          </div>
        </section>
      )}

      {selectedPayment && (
        <div className="fixed inset-0 z-80 flex justify-end bg-slate-950/70 backdrop-blur-sm" role="dialog" aria-modal="true">
          <aside className="h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-slate-950 p-5 text-white shadow-2xl shadow-black/40">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase text-violet-300">{selectedPayment.reviewType === 'checkout' ? 'Checkout Review' : 'Payment Details'}</p>
                <h2 className="mt-1 truncate font-montserrat text-2xl font-black">{selectedPayment.paymentId}</h2>
                <p className="mt-1 truncate text-sm font-semibold text-slate-400">{selectedPayment.orderId}</p>
              </div>
              <button type="button" onClick={onCloseDetail} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/6 text-slate-300 transition hover:bg-white/10 hover:text-white" aria-label="Close payment details">
                <X size={17} />
              </button>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <DetailTile label="Provider" value={selectedPayment.provider} />
              <DetailTile label="Status" value={selectedPayment.reviewStatus === 'expired' ? 'Expired checkout' : selectedPayment.reviewStatus === 'failed' ? 'Failed checkout' : selectedPayment.processed ? 'Processed' : `Code ${selectedPayment.statusCode}`} />
              <DetailTile label="Review Type" value={selectedPayment.reviewType === 'checkout' ? 'Checkout session' : 'Payment notification'} />
              <DetailTile label="Plan" value={selectedPayment.plan || 'Unknown'} />
              <DetailTile label="Amount" value={`${selectedPayment.currency} ${selectedPayment.amount}`} />
              <DetailTile label="User" value={selectedPayment.user?.email || 'No linked user'} />
              <DetailTile label="Date" value={formatDate(selectedPayment.createdAt)} />
              <DetailTile label="Processed At" value={selectedPayment.processedAt ? formatDate(selectedPayment.processedAt) : 'Not processed'} />
              <DetailTile label="Processing Lock" value={selectedPayment.processingStartedAt ? formatDate(selectedPayment.processingStartedAt) : 'None'} />
              <DetailTile label="Review State" value={selectedPayment.billingReviewStatus === 'resolved' ? 'Resolved' : 'Open'} />
              {selectedPayment.reviewedAt && <DetailTile label="Reviewed At" value={formatDate(selectedPayment.reviewedAt)} />}
            </div>
            {selectedPayment.reviewType && (
              <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <h3 className="font-montserrat text-lg font-black">Review Action</h3>
                {selectedPayment.billingReviewStatus === 'resolved' ? (
                  <p className="mt-3 rounded-xl border border-emerald-300/20 bg-emerald-400/10 p-3 text-sm font-bold text-emerald-200">
                    Resolved{selectedPayment.reviewNote ? `: ${selectedPayment.reviewNote}` : '.'}
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
                      onClick={() => onMarkReviewed(selectedPayment)}
                      disabled={!canReviewPayments || reviewingPaymentId === selectedPayment.id}
                      className="mt-3 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 text-sm font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {reviewingPaymentId === selectedPayment.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                      Mark Reviewed
                    </button>
                    {!canReviewPayments && <p className="mt-2 text-xs font-bold text-slate-500">Billing write permission required.</p>}
                  </>
                )}
              </section>
            )}
            <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <h3 className="font-montserrat text-lg font-black">Payload Summary</h3>
              <pre className="mt-4 max-h-80 overflow-auto rounded-xl bg-slate-900 p-3 text-xs font-semibold text-slate-300">
                {JSON.stringify(selectedPayment.rawPayload, null, 2)}
              </pre>
            </section>
          </aside>
        </div>
      )}
    </section>
  );
}
