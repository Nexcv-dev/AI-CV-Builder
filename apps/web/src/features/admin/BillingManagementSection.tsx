import React from 'react';
import type {
  AdminPaymentItem,
  AdminPaymentSummary,
} from './adminTypes';
import { BillingFilters } from './billing/BillingFilters';
import { BillingGatewayRevenue } from './billing/BillingGatewayRevenue';
import { BillingPaymentsTable } from './billing/BillingPaymentsTable';
import { BillingReviewDrawer } from './billing/BillingReviewDrawer';
import { BillingStatsGrid } from './billing/BillingStatsGrid';
import { DailyRevenueStrip } from './billing/DailyRevenueStrip';

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
  return (
    <section className="mt-6">
      <BillingStatsGrid
        summary={summary}
        reviewFilterActive={statusFilter === 'review'}
        onToggleReviewFilter={() => onStatusFilterChange(statusFilter === 'review' ? 'all' : 'review')}
      />
      <BillingGatewayRevenue summary={summary} />
      <BillingFilters
        search={search}
        planFilter={planFilter}
        statusFilter={statusFilter}
        onSearchChange={onSearchChange}
        onPlanFilterChange={onPlanFilterChange}
        onStatusFilterChange={onStatusFilterChange}
      />
      <BillingPaymentsTable payments={payments} loading={loading} onOpenPayment={onOpenPayment} />
      {summary && <DailyRevenueStrip summary={summary} />}
      {selectedPayment && (
        <BillingReviewDrawer
          payment={selectedPayment}
          reviewNote={reviewNote}
          reviewing={reviewingPaymentId === selectedPayment.id}
          canReview={canReviewPayments}
          onClose={onCloseDetail}
          onReviewNoteChange={onReviewNoteChange}
          onMarkReviewed={onMarkReviewed}
        />
      )}
    </section>
  );
}
