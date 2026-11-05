import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  AdminAuditLogItem,
  AdminBillingPlan,
  AdminCoupon,
  AdminPaymentItem,
  AdminPaymentSummary,
  AdminSettingsSummary,
  AdminSupportTicket,
  AdminUserListItem,
} from '../src/features/admin/adminTypes';
import type { AuthUser } from '../src/utils/api';
import type { UserRole } from '../src/features/admin/adminPermissions';

// These tests drive AdminDashboard through its real sections (stubbing only the
// settings-shaped ones) against a fake API, so they check what the admin sees and
// what gets sent, not how the dashboard state is wired internally.

type ApiCall = { url: string; method: string; body: unknown };
type RouteHandler = (call: ApiCall) => unknown;

const apiState = vi.hoisted(() => ({
  calls: [] as Array<{ url: string; method: string; body: unknown }>,
  routes: new Map<string, (call: { url: string; method: string; body: unknown }) => unknown>(),
  currentUser: null as unknown,
}));

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock('react-hot-toast', () => ({ default: toastMock }));

vi.mock('../src/utils/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/utils/api')>();
  return {
    ...actual,
    getCurrentUser: vi.fn(async () => apiState.currentUser),
    apiFetch: vi.fn(async (url: string, options: RequestInit = {}) => {
      const method = (options.method || 'GET').toUpperCase();
      const body = typeof options.body === 'string' ? JSON.parse(options.body) : undefined;
      const call = { url, method, body };
      apiState.calls.push(call);
      const path = url.split('?')[0];
      const handler = apiState.routes.get(`${method} ${path}`);
      if (!handler) throw new Error(`No fake route for ${method} ${path}`);
      return handler(call);
    }),
  };
});

vi.mock('../src/features/admin/SettingsManagementSection', () => ({
  default: ({ settings, loading, saving, mode, onSave }: {
    settings: AdminSettingsSummary | null;
    loading: boolean;
    saving: boolean;
    mode?: string;
    onSave: (app: AdminSettingsSummary['app']) => void;
  }) => (
    <div data-testid="settings-stub">
      <p>mode: {mode || 'settings'}</p>
      <p>{loading ? 'settings loading' : 'settings loaded'}</p>
      <p>{saving ? 'settings saving' : 'settings idle'}</p>
      <p>support email: {settings?.app.supportEmail || 'none'}</p>
      <button type="button" onClick={() => settings && onSave({ ...settings.app, supportEmail: 'help@new.test' })}>
        Stub save settings
      </button>
    </div>
  ),
}));

vi.mock('../src/features/admin/EmailManagementSection', () => ({
  default: ({ settings, sendingTestEmail, onSendTestEmail }: {
    settings: AdminSettingsSummary | null;
    sendingTestEmail: boolean;
    onSendTestEmail: (recipient: string) => void;
  }) => (
    <div data-testid="email-stub">
      <p>support email: {settings?.app.supportEmail || 'none'}</p>
      <p>{sendingTestEmail ? 'test email sending' : 'test email idle'}</p>
      <button type="button" onClick={() => onSendTestEmail('ops@nexcv.test')}>Stub send test email</button>
    </div>
  ),
}));

import AdminDashboard from '../src/features/admin/AdminDashboard';

function route(method: string, path: string, handler: RouteHandler) {
  apiState.routes.set(`${method} ${path}`, handler);
}

function callsTo(method: string, path: string) {
  return apiState.calls.filter((call) => call.method === method && call.url.split('?')[0] === path);
}

function lastQuery(path: string) {
  const calls = callsTo('GET', path);
  const last = calls[calls.length - 1];
  return new URLSearchParams(last?.url.split('?')[1] || '');
}

function makeUser(role: UserRole): AuthUser {
  return {
    id: 'admin-1',
    email: 'admin@nexcv.test',
    displayName: 'Admin One',
    role,
    plan: 'free',
    emailVerified: true,
    authProvider: 'email',
  };
}

function renderDashboard(path: string, role: UserRole = 'super_admin') {
  apiState.currentUser = makeUser(role);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AdminDashboard />
    </MemoryRouter>,
  );
}

const adminSummary = {
  widgets: {},
  recentRegistrations: [],
  templateUsage: [],
  charts: { userGrowth: [], cvSavesPerDay: [], cvDownloadsPerDay: [] },
};

beforeEach(() => {
  apiState.calls.length = 0;
  apiState.routes.clear();
  toastMock.success.mockClear();
  toastMock.error.mockClear();
  route('GET', '/api/admin/summary', () => adminSummary);
  route('GET', '/api/admin/templates', () => ({ templates: [], categories: [] }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Billing
// ---------------------------------------------------------------------------

function makePayment(overrides: Partial<AdminPaymentItem>): AdminPaymentItem {
  return {
    id: 'pay-1',
    provider: 'payhere',
    paymentId: 'PAY-1',
    orderId: 'ORDER-1',
    reviewType: 'payment',
    reviewStatus: 'unprocessed',
    billingReviewStatus: 'open',
    user: { id: 'u1', email: 'buyer@nexcv.test', displayName: 'Buyer' },
    plan: 'monthly',
    amount: '1500.00',
    amountCents: 150000,
    currency: 'LKR',
    statusCode: '-2',
    processed: false,
    rawPayload: {},
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
    ...overrides,
  };
}

const failedCheckout = makePayment({
  id: 'chk-1',
  paymentId: 'CHK-1',
  orderId: 'ORDER-CHK-1',
  reviewType: 'checkout',
  reviewStatus: 'failed',
});
const unprocessedPayment = makePayment({});

function makePaymentSummary(overrides: Partial<AdminPaymentSummary> = {}): AdminPaymentSummary {
  return {
    totalRevenueCents: 0,
    currency: 'LKR',
    processedCount: 4,
    pendingCheckoutCount: 2,
    checkoutReviewCount: 1,
    failedPaymentCount: 1,
    revenueByPlan: {},
    dailyRevenue: [],
    ...overrides,
  };
}

function needsReviewValue() {
  const label = screen.getByText('Needs Review', { selector: 'p' });
  return label.closest('article')?.querySelector('div.truncate')?.textContent;
}

function paymentRow(paymentId: string) {
  return screen.getByText(paymentId, { selector: 'p' }).closest('article') as HTMLElement;
}

describe('AdminDashboard billing', () => {
  it('loads payments and refetches with the chosen filters', async () => {
    const user = userEvent.setup();
    route('GET', '/api/admin/payments', () => ({ payments: [failedCheckout, unprocessedPayment], summary: makePaymentSummary() }));
    renderDashboard('/admin/billing');

    expect(await screen.findByText('CHK-1')).toBeInTheDocument();
    expect(screen.getByText('PAY-1')).toBeInTheDocument();
    expect(needsReviewValue()).toBe('2');
    expect(lastQuery('/api/admin/payments').toString()).toBe('');

    await user.selectOptions(screen.getByDisplayValue('All statuses'), 'review');
    await user.selectOptions(screen.getByDisplayValue('All plans'), 'monthly');
    await user.type(screen.getByPlaceholderText('Search payment, order, or user'), 'buyer');

    await waitFor(() => {
      const query = lastQuery('/api/admin/payments');
      expect(query.get('status')).toBe('review');
      expect(query.get('plan')).toBe('monthly');
      expect(query.get('search')).toBe('buyer');
    });
  });

  it('toggles the Needs Review filter from the stat card', async () => {
    const user = userEvent.setup();
    route('GET', '/api/admin/payments', () => ({ payments: [failedCheckout], summary: makePaymentSummary() }));
    renderDashboard('/admin/billing');
    await screen.findByText('CHK-1');

    const reviewCard = screen.getByText('Needs Review', { selector: 'p' }).closest('button') as HTMLElement;
    await user.click(reviewCard);
    await waitFor(() => expect(lastQuery('/api/admin/payments').get('status')).toBe('review'));
    expect(reviewCard).toHaveAttribute('aria-pressed', 'true');

    await user.click(reviewCard);
    await waitFor(() => expect(lastQuery('/api/admin/payments').get('status')).toBeNull());
    expect(reviewCard).toHaveAttribute('aria-pressed', 'false');
  });

  it('resolves a checkout review from the review queue and drops it from the list', async () => {
    const user = userEvent.setup();
    route('GET', '/api/admin/payments', () => ({ payments: [failedCheckout, unprocessedPayment], summary: makePaymentSummary() }));
    route('PATCH', '/api/admin/billing/review/checkout/chk-1', (call) => ({
      payment: { ...failedCheckout, billingReviewStatus: 'resolved', reviewNote: (call.body as { note: string }).note, reviewedAt: '2026-11-02T10:00:00.000Z' },
    }));
    renderDashboard('/admin/billing');
    await screen.findByText('CHK-1');

    await user.selectOptions(screen.getByDisplayValue('All statuses'), 'review');
    await waitFor(() => expect(lastQuery('/api/admin/payments').get('status')).toBe('review'));
    await screen.findByText('CHK-1');

    await user.click(within(paymentRow('CHK-1')).getByRole('button', { name: /View/ }));
    const drawer = screen.getByRole('dialog');
    expect(within(drawer).getByText('Checkout Review')).toBeInTheDocument();
    await user.type(within(drawer).getByPlaceholderText('Add what you checked before resolving'), 'Gateway shows no charge');
    await user.click(within(drawer).getByRole('button', { name: /Mark Reviewed/ }));

    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Billing review resolved.'));
    expect(callsTo('PATCH', '/api/admin/billing/review/checkout/chk-1')[0].body).toEqual({ note: 'Gateway shows no charge' });
    expect(within(screen.getByRole('dialog')).getByText('Resolved: Gateway shows no charge')).toBeInTheDocument();
    expect(screen.queryByText('CHK-1', { selector: 'article p' })).not.toBeInTheDocument();
    expect(screen.getByText('PAY-1', { selector: 'article p' })).toBeInTheDocument();
    expect(needsReviewValue()).toBe('1');
  });

  it('resolves a payment review from the full list and keeps the updated row', async () => {
    const user = userEvent.setup();
    route('GET', '/api/admin/payments', () => ({ payments: [failedCheckout, unprocessedPayment], summary: makePaymentSummary({ failedPaymentCount: 3 }) }));
    route('PATCH', '/api/admin/billing/review/payment/pay-1', () => ({
      payment: { ...unprocessedPayment, billingReviewStatus: 'resolved', reviewNote: '' },
    }));
    renderDashboard('/admin/billing');
    await screen.findByText('PAY-1');
    expect(needsReviewValue()).toBe('4');

    await user.click(within(paymentRow('PAY-1')).getByRole('button', { name: /View/ }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Mark Reviewed/ }));

    await waitFor(() => expect(needsReviewValue()).toBe('3'));
    expect(callsTo('PATCH', '/api/admin/billing/review/payment/pay-1')[0].body).toEqual({ note: '' });
    expect(screen.getByText('PAY-1', { selector: 'article p' })).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByText('Resolved.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close payment details' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps the review counts and shows an error when resolving fails', async () => {
    const user = userEvent.setup();
    route('GET', '/api/admin/payments', () => ({ payments: [failedCheckout], summary: makePaymentSummary() }));
    route('PATCH', '/api/admin/billing/review/checkout/chk-1', () => {
      throw new Error('Review already resolved by another admin.');
    });
    renderDashboard('/admin/billing');
    await screen.findByText('CHK-1');

    await user.click(within(paymentRow('CHK-1')).getByRole('button', { name: /View/ }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Mark Reviewed/ }));

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Review already resolved by another admin.'));
    expect(needsReviewValue()).toBe('2');
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: /Mark Reviewed/ })).toBeEnabled();
  });

  it('blocks review actions for roles without billing write access', async () => {
    const user = userEvent.setup();
    route('GET', '/api/admin/payments', () => ({ payments: [failedCheckout], summary: makePaymentSummary() }));
    renderDashboard('/admin/billing', 'support_agent');
    await screen.findByText('CHK-1');

    await user.click(within(paymentRow('CHK-1')).getByRole('button', { name: /View/ }));
    const drawer = screen.getByRole('dialog');
    expect(within(drawer).getByRole('button', { name: /Mark Reviewed/ })).toBeDisabled();
    expect(within(drawer).getByText('Billing write permission required.')).toBeInTheDocument();
  });

  it('shows a toast when payments cannot be loaded', async () => {
    route('GET', '/api/admin/payments', () => {
      throw new Error('Payments are down.');
    });
    renderDashboard('/admin/billing');

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Payments are down.'));
    expect(await screen.findByText('No payments match these filters.')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Promotions
// ---------------------------------------------------------------------------

const localPassPlan: AdminBillingPlan = {
  plan: 'payg',
  label: 'Single CV Pass',
  amount: '990.00',
  cents: 99000,
  baseAmountCents: 99000,
  promotionDiscountCents: 0,
  promotionActive: false,
  currency: 'LKR',
  market: 'local',
  provider: 'payhere',
  source: 'database',
};

const save10Coupon: AdminCoupon = {
  id: 'coupon-1',
  code: 'SAVE10',
  label: 'Ten off',
  discountType: 'percent',
  discountValue: 10,
  active: true,
  appliesTo: ['monthly', 'quarterly'],
  maxRedemptions: 25,
  redeemedCount: 3,
  lemonSqueezySyncStatus: 'synced',
};

function couponFormRow() {
  return screen.getByPlaceholderText('CODE').parentElement as HTMLElement;
}

function couponRow(code: string) {
  return screen.getByText(code, { exact: false, selector: 'p' }).closest('div.flex-wrap') as HTMLElement;
}

describe('AdminDashboard promotions', () => {
  beforeEach(() => {
    route('GET', '/api/admin/billing/config', () => ({ plans: [localPassPlan], coupons: [save10Coupon] }));
  });

  it('saves a plan price in cents for the plan market', async () => {
    const user = userEvent.setup();
    route('PATCH', '/api/admin/billing/plans/payg', () => ({ plan: { ...localPassPlan, cents: 150000, baseAmountCents: 150000, amount: '1500.00' } }));
    renderDashboard('/admin/promotions');

    const priceInput = await screen.findByLabelText('Price LKR');
    await user.clear(priceInput);
    await user.type(priceInput, '1500');
    await user.selectOptions(screen.getByLabelText('Promo type'), 'percent');
    await user.type(screen.getByLabelText('Promo value'), '15');
    await user.click(screen.getAllByRole('button', { name: 'Save' })[0]);

    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Plan price updated.'));
    expect(callsTo('PATCH', '/api/admin/billing/plans/payg')[0].body).toEqual({
      label: 'Single CV Pass',
      market: 'local',
      amountCents: 150000,
      promotionActive: false,
      promotionLabel: '',
      promotionDiscountType: 'percent',
      promotionDiscountValue: 15,
    });
  });

  it('creates a fixed coupon in cents and resets the form', async () => {
    const user = userEvent.setup();
    route('POST', '/api/admin/billing/coupons', (call) => {
      const body = call.body as { code: string; label: string };
      return { coupon: { ...save10Coupon, id: 'coupon-2', code: body.code, label: body.label, discountType: 'fixed', discountValue: 25000, redeemedCount: 0 } };
    });
    renderDashboard('/admin/promotions');

    await user.type(await screen.findByPlaceholderText('CODE'), 'launch25');
    await user.type(within(couponFormRow()).getByPlaceholderText('Label'), 'Launch offer');
    await user.type(within(couponFormRow()).getByPlaceholderText('250'), '250');
    const saveButtons = screen.getAllByRole('button', { name: 'Save' });
    await user.click(saveButtons[saveButtons.length - 1]);

    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Coupon saved.'));
    expect(callsTo('POST', '/api/admin/billing/coupons')[0].body).toEqual({
      code: 'LAUNCH25',
      label: 'Launch offer',
      discountType: 'fixed',
      discountValue: 25000,
      appliesTo: ['monthly', 'quarterly'],
      maxRedemptions: '25',
      active: true,
    });
    expect(screen.getByPlaceholderText('CODE')).toHaveValue('');
    expect(within(couponFormRow()).getByPlaceholderText('Label')).toHaveValue('');
    expect(screen.getByText('LAUNCH25', { exact: false, selector: 'p' })).toBeInTheDocument();
  });

  it('maps the coupon plan choice to plan keys', async () => {
    const user = userEvent.setup();
    route('POST', '/api/admin/billing/coupons', () => ({ coupon: { ...save10Coupon, code: 'ALL5' } }));
    renderDashboard('/admin/promotions');

    await user.type(await screen.findByPlaceholderText('CODE'), 'all5');
    await user.selectOptions(within(couponFormRow()).getByDisplayValue('Monthly + Quarterly'), 'both');
    await user.selectOptions(within(couponFormRow()).getByDisplayValue('LKR off'), 'percent');
    await user.type(within(couponFormRow()).getByPlaceholderText('15'), '5');
    const saveButtons = screen.getAllByRole('button', { name: 'Save' });
    await user.click(saveButtons[saveButtons.length - 1]);

    await waitFor(() => expect(callsTo('POST', '/api/admin/billing/coupons')).toHaveLength(1));
    expect(callsTo('POST', '/api/admin/billing/coupons')[0].body).toMatchObject({
      code: 'ALL5',
      discountType: 'percent',
      discountValue: 5,
      appliesTo: ['payg', 'monthly', 'quarterly'],
    });
  });

  it('pauses and deletes a coupon', async () => {
    const user = userEvent.setup();
    route('PATCH', '/api/admin/billing/coupons/SAVE10', (call) => ({ coupon: { ...save10Coupon, active: (call.body as AdminCoupon).active } }));
    route('DELETE', '/api/admin/billing/coupons/SAVE10', () => ({ ok: true }));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderDashboard('/admin/promotions');

    await screen.findByText('SAVE10', { exact: false, selector: 'p' });
    await user.click(within(couponRow('SAVE10')).getByRole('button', { name: 'Pause' }));

    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Coupon paused.'));
    expect(callsTo('PATCH', '/api/admin/billing/coupons/SAVE10')[0].body).toMatchObject({ code: 'SAVE10', active: false });
    expect(within(couponRow('SAVE10')).getByRole('button', { name: 'Activate' })).toBeInTheDocument();

    await user.click(within(couponRow('SAVE10')).getByTitle('Delete coupon'));
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Coupon deleted.'));
    expect(callsTo('DELETE', '/api/admin/billing/coupons/SAVE10')).toHaveLength(1);
    expect(screen.getByText('No coupons found.')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Support
// ---------------------------------------------------------------------------

const paymentTicket: AdminSupportTicket = {
  id: 'ticket-1',
  user: null,
  fullName: 'Kasun Perera',
  email: 'kasun@nexcv.test',
  type: 'payment_issue',
  subject: 'Charged twice',
  message: 'I was charged twice for the monthly plan.',
  status: 'open',
  priority: 'normal',
  adminNotes: '',
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z',
};

describe('AdminDashboard support', () => {
  beforeEach(() => {
    route('GET', '/api/admin/support/tickets', () => ({ tickets: [paymentTicket], summary: { open: 1, pending: 0, resolved: 0, closed: 0 } }));
  });

  it('loads tickets and refetches with the chosen filters', async () => {
    const user = userEvent.setup();
    renderDashboard('/admin/support');

    expect(await screen.findByText('Charged twice')).toBeInTheDocument();
    const filterBar = screen.getByDisplayValue('All types').parentElement as HTMLElement;
    await user.selectOptions(screen.getByDisplayValue('All statuses'), 'open');
    await user.selectOptions(screen.getByDisplayValue('All types'), 'payment_issue');
    await user.type(within(filterBar).getByPlaceholderText('Search tickets'), 'twice');

    await waitFor(() => {
      const query = lastQuery('/api/admin/support/tickets');
      expect(query.get('status')).toBe('open');
      expect(query.get('type')).toBe('payment_issue');
      expect(query.get('search')).toBe('twice');
    });
  });

  it('saves the ticket workflow fields', async () => {
    const user = userEvent.setup();
    route('PATCH', '/api/admin/support/tickets/ticket-1', (call) => ({ ticket: { ...paymentTicket, ...(call.body as object) } }));
    renderDashboard('/admin/support');
    await screen.findByText('Charged twice');

    await user.click(screen.getByRole('button', { name: /View/ }));
    const drawer = screen.getByRole('dialog');
    await user.selectOptions(within(drawer).getByDisplayValue('Open'), 'resolved');
    await user.selectOptions(within(drawer).getByDisplayValue('Normal'), 'high');
    await user.type(within(drawer).getByPlaceholderText('Admin notes'), 'Refund issued');
    await user.click(within(drawer).getByRole('button', { name: 'Save ticket' }));

    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Support ticket updated.'));
    expect(callsTo('PATCH', '/api/admin/support/tickets/ticket-1')[0].body).toEqual({ status: 'resolved', priority: 'high', adminNotes: 'Refund issued' });
    expect(screen.getByText('resolved', { selector: 'article span' })).toBeInTheDocument();
  });

  it('sends a reply and clears the reply box', async () => {
    const user = userEvent.setup();
    route('POST', '/api/admin/support/tickets/ticket-1/reply', () => ({ ticket: { ...paymentTicket, status: 'pending' }, message: 'Reply emailed.' }));
    renderDashboard('/admin/support');
    await screen.findByText('Charged twice');

    await user.click(screen.getByRole('button', { name: /View/ }));
    const drawer = screen.getByRole('dialog');
    const replyBox = within(drawer).getByPlaceholderText('Write the message that will replace {{replyMessage}}');
    expect(within(drawer).getByRole('button', { name: /Send reply/ })).toBeDisabled();
    await user.type(replyBox, 'We refunded the duplicate charge.');
    await user.click(within(drawer).getByRole('button', { name: /Send reply/ }));

    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Reply emailed.'));
    expect(callsTo('POST', '/api/admin/support/tickets/ticket-1/reply')[0].body).toEqual({ replyMessage: 'We refunded the duplicate charge.' });
    expect(replyBox).toHaveValue('');
    expect(within(drawer).getByDisplayValue('Pending')).toBeInTheDocument();
  });

  it('resets the reply box when another ticket is opened', async () => {
    const user = userEvent.setup();
    renderDashboard('/admin/support');
    await screen.findByText('Charged twice');

    await user.click(screen.getByRole('button', { name: /View/ }));
    await user.type(screen.getByPlaceholderText('Write the message that will replace {{replyMessage}}'), 'Draft');
    await user.click(screen.getByRole('button', { name: 'Close ticket details' }));
    await user.click(screen.getByRole('button', { name: /View/ }));

    expect(screen.getByPlaceholderText('Write the message that will replace {{replyMessage}}')).toHaveValue('');
  });
});

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

function makeListUser(overrides: Partial<AdminUserListItem>): AdminUserListItem {
  return {
    id: 'user-1',
    email: 'user@nexcv.test',
    displayName: 'Regular User',
    role: 'user',
    plan: 'free',
    rawPlan: 'free',
    emailVerified: true,
    createdAt: '2026-10-01T10:00:00.000Z',
    ...overrides,
  } as AdminUserListItem;
}

describe('AdminDashboard roles', () => {
  it('promotes a regular user and moves them into the admin list', async () => {
    const user = userEvent.setup();
    const existingAdmin = makeListUser({ id: 'admin-1', email: 'admin@nexcv.test', displayName: 'Admin One', role: 'super_admin' });
    const candidate = makeListUser({ id: 'user-2', email: 'helper@nexcv.test', displayName: 'Helper' });
    route('GET', '/api/admin/roles', () => ({
      roles: [
        { role: 'user', label: 'User', access: [] },
        { role: 'super_admin', label: 'Super Admin', access: ['dashboard'] },
        { role: 'support_agent', label: 'Support Agent', access: ['support'] },
      ],
      admins: [existingAdmin],
    }));
    route('GET', '/api/admin/users', () => ({ users: [candidate] }));
    route('PATCH', '/api/admin/users/user-2/role', (call) => ({ user: { ...candidate, role: (call.body as { role: UserRole }).role } }));
    renderDashboard('/admin/roles');

    expect(await screen.findByText('Helper')).toBeInTheDocument();
    expect(lastQuery('/api/admin/users').get('limit')).toBe('20');
    const candidateRow = screen.getByText('Helper').closest('div.grid') as HTMLElement;
    await user.selectOptions(within(candidateRow).getByRole('combobox'), 'support_agent');

    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('User role updated.'));
    expect(callsTo('PATCH', '/api/admin/users/user-2/role')[0].body).toEqual({ role: 'support_agent' });
    expect(screen.getByText('No regular users loaded yet.')).toBeInTheDocument();
    const adminCard = screen.getByText('Admin Accounts').closest('article') as HTMLElement;
    expect(within(adminCard).getByText('Helper')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Settings, CMS, and email
// ---------------------------------------------------------------------------

const settingsSummary = {
  app: { supportEmail: 'help@nexcv.test', maintenanceMode: false },
} as unknown as AdminSettingsSummary;

describe('AdminDashboard settings', () => {
  beforeEach(() => {
    route('GET', '/api/admin/settings', () => settingsSummary);
  });

  it('loads and saves app settings', async () => {
    const user = userEvent.setup();
    route('PATCH', '/api/admin/settings', (call) => ({ app: (call.body as { app: AdminSettingsSummary['app'] }).app }));
    renderDashboard('/admin/settings');

    expect(await screen.findByText('support email: help@nexcv.test')).toBeInTheDocument();
    expect(screen.getByText('mode: settings')).toBeInTheDocument();
    expect(callsTo('GET', '/api/admin/templates')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Stub save settings' }));

    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Settings updated.'));
    expect(callsTo('PATCH', '/api/admin/settings')[0].body).toEqual({ app: { supportEmail: 'help@new.test', maintenanceMode: false } });
    expect(screen.getByText('support email: help@new.test')).toBeInTheDocument();
    expect(screen.getByText('settings idle')).toBeInTheDocument();
  });

  it('loads settings for the CMS page in cms mode', async () => {
    renderDashboard('/admin/cms');
    expect(await screen.findByText('mode: cms')).toBeInTheDocument();
    expect(await screen.findByText('support email: help@nexcv.test')).toBeInTheDocument();
    expect(callsTo('GET', '/api/admin/settings')).toHaveLength(1);
  });

  it('sends a test email from the notifications page', async () => {
    const user = userEvent.setup();
    route('POST', '/api/admin/settings/test-email', () => ({ message: 'Test email queued.' }));
    renderDashboard('/admin/notifications');

    expect(await screen.findByText('support email: help@nexcv.test')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Stub send test email' }));

    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Test email queued.'));
    expect(callsTo('POST', '/api/admin/settings/test-email')[0].body).toEqual({ to: 'ops@nexcv.test' });
    expect(screen.getByText('test email idle')).toBeInTheDocument();
  });

  it('shows a toast when saving settings fails', async () => {
    const user = userEvent.setup();
    route('PATCH', '/api/admin/settings', () => {
      throw new Error('Settings locked.');
    });
    renderDashboard('/admin/settings');
    await screen.findByText('support email: help@nexcv.test');

    await user.click(screen.getByRole('button', { name: 'Stub save settings' }));
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Settings locked.'));
    expect(screen.getByText('support email: help@nexcv.test')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Audit logs
// ---------------------------------------------------------------------------

const auditLog: AdminAuditLogItem = {
  id: 'log-1',
  actor: { id: 'admin-1', email: 'admin@nexcv.test', displayName: 'Admin One' },
  action: 'billing.review.resolved',
  targetType: 'payment',
  targetId: 'pay-1',
  targetLabel: 'PAY-1',
  metadata: { note: 'checked' },
  ip: '127.0.0.1',
  userAgent: 'test',
  createdAt: '2026-11-01T10:00:00.000Z',
};

describe('AdminDashboard audit logs', () => {
  it('loads logs with their filter options and refetches on filter change', async () => {
    const user = userEvent.setup();
    route('GET', '/api/admin/audit-logs', () => ({
      logs: [auditLog],
      filters: { actions: ['billing.review.resolved', 'users.role.update'], targetTypes: ['payment', 'user'] },
    }));
    renderDashboard('/admin/audit');

    expect(await screen.findByText('Billing Review Resolved', { selector: 'p' })).toBeInTheDocument();
    await user.selectOptions(screen.getByDisplayValue('All actions'), 'users.role.update');
    await user.selectOptions(screen.getByDisplayValue('All targets'), 'user');
    await user.type(screen.getByPlaceholderText('Search action, target, or label'), 'PAY');

    await waitFor(() => {
      const query = lastQuery('/api/admin/audit-logs');
      expect(query.get('action')).toBe('users.role.update');
      expect(query.get('targetType')).toBe('user');
      expect(query.get('search')).toBe('PAY');
    });
  });
});

// ---------------------------------------------------------------------------
// Data loading is scoped to the active page
// ---------------------------------------------------------------------------

describe('AdminDashboard page scoping', () => {
  it('only loads the data the billing page needs', async () => {
    route('GET', '/api/admin/payments', () => ({ payments: [], summary: makePaymentSummary() }));
    renderDashboard('/admin/billing');
    await waitFor(() => expect(callsTo('GET', '/api/admin/payments')).toHaveLength(1));
    await screen.findByText('No payments match these filters.');

    const loaded = new Set(apiState.calls.map((call) => call.url.split('?')[0]));
    expect([...loaded].sort()).toEqual(['/api/admin/payments', '/api/admin/summary']);
  });
});
