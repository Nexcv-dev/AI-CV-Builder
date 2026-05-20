import React, { useState } from 'react';
import {
  Check,
  CreditCard,
  Crown,
  Eye,
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
  onSearchChange,
  onPlanFilterChange,
  onStatusFilterChange,
  onOpenPayment,
  onCloseDetail,
}: {
  payments: AdminPaymentItem[];
  summary: AdminPaymentSummary | null;
  loading: boolean;
  search: string;
  planFilter: string;
  statusFilter: string;
  selectedPayment: AdminPaymentItem | null;
  onSearchChange: (value: string) => void;
  onPlanFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onOpenPayment: (payment: AdminPaymentItem) => void;
  onCloseDetail: () => void;
}) {
  return (
    <section className="mt-6">
      <div className="grid gap-4 md:grid-cols-3">
        <AdminStat icon={<CreditCard size={19} />} label="Total Revenue" value={summary ? formatCurrency(summary.totalRevenueCents, summary.currency) : 'LKR 0'} />
        <AdminStat icon={<Check size={19} />} label="Processed Payments" value={String(summary?.processedCount || 0)} />
        <AdminStat icon={<Crown size={19} />} label="Monthly Revenue" value={formatCurrency(summary?.revenueByPlan.monthly || 0, summary?.currency || 'LKR')} />
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
              <PaymentStatusBadge processed={payment.processed} statusCode={payment.statusCode} />
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
                <p className="text-xs font-black uppercase text-violet-300">Payment Details</p>
                <h2 className="mt-1 truncate font-montserrat text-2xl font-black">{selectedPayment.paymentId}</h2>
                <p className="mt-1 truncate text-sm font-semibold text-slate-400">{selectedPayment.orderId}</p>
              </div>
              <button type="button" onClick={onCloseDetail} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/6 text-slate-300 transition hover:bg-white/10 hover:text-white" aria-label="Close payment details">
                <X size={17} />
              </button>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <DetailTile label="Provider" value={selectedPayment.provider} />
              <DetailTile label="Status" value={selectedPayment.processed ? 'Processed' : `Code ${selectedPayment.statusCode}`} />
              <DetailTile label="Plan" value={selectedPayment.plan || 'Unknown'} />
              <DetailTile label="Amount" value={`${selectedPayment.currency} ${selectedPayment.amount}`} />
              <DetailTile label="User" value={selectedPayment.user?.email || 'No linked user'} />
              <DetailTile label="Date" value={formatDate(selectedPayment.createdAt)} />
            </div>
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
