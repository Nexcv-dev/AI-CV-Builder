import React, { useRef, useState } from 'react';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../../utils/api';
import { apiFetch, getCurrentUser, notifyAuthUserChanged } from '../../utils/api';
import { useCheckoutReturnHandler } from './useCheckoutReturnHandler';

const toastMock = vi.hoisted(() => {
  const toast = vi.fn();
  return {
    toast,
    dismiss: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  };
});

vi.mock('react-hot-toast', () => ({
  default: Object.assign(toastMock.toast, {
    dismiss: toastMock.dismiss,
    error: toastMock.error,
    loading: toastMock.loading,
  }),
}));

vi.mock('../../utils/api', () => ({
  apiFetch: vi.fn(),
  getCurrentUser: vi.fn(),
  notifyAuthUserChanged: vi.fn(),
}));

const paidUser: AuthUser = {
  id: 'user-1',
  email: 'user@example.com',
  displayName: 'Paid User',
  role: 'user',
  plan: 'monthly',
  emailVerified: true,
  authProvider: 'email',
};

type NavigateFn = (to: string, options?: { replace?: boolean }) => void;
type SetSearchParamsFn = (nextInit: Record<string, string>, navigateOptions?: { replace?: boolean }) => void;

function HookHarness({
  couponCode = '',
  navigate = vi.fn<NavigateFn>(),
  search = '?plan=monthly&payment=return&order=order-1',
  setSearchParams = vi.fn<SetSearchParamsFn>(),
}: {
  couponCode?: string;
  navigate?: NavigateFn;
  search?: string;
  setSearchParams?: SetSearchParamsFn;
}) {
  const checkoutInFlightRef = useRef(true);
  const confirmingReturnRef = useRef<string | null>(null);
  const handledCancelRef = useRef<string | null>(null);
  const [, setSubmitting] = useState(false);
  const [, setUser] = useState<AuthUser | null>(null);

  useCheckoutReturnHandler({
    navigate,
    searchParams: new URLSearchParams(search),
    setSearchParams,
    selectedPlanKey: 'monthly',
    couponCode,
    checkoutInFlightRef,
    confirmingReturnRef,
    handledCancelRef,
    setSubmitting,
    setUser,
  });

  return null;
}

describe('useCheckoutReturnHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('confirms a paid return, refreshes the user, and navigates to builder success', async () => {
    const navigate = vi.fn();
    sessionStorage.setItem('nexcv-pending-checkout', 'order-1');
    vi.mocked(apiFetch).mockResolvedValueOnce({
      status: 'paid',
      plan: 'monthly',
      planActive: true,
      user: paidUser,
    });

    render(<HookHarness navigate={navigate} />);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/builder?payment=success', { replace: true }));
    expect(apiFetch).toHaveBeenCalledWith('/api/billing/checkout/order-1/status', { cache: 'no-store' });
    expect(getCurrentUser).not.toHaveBeenCalled();
    expect(notifyAuthUserChanged).toHaveBeenCalledWith(paidUser);
    expect(sessionStorage.getItem('nexcv-pending-checkout')).toBeNull();
    expect(toastMock.loading).toHaveBeenCalledWith('Confirming your payment...', { id: 'payment-confirmation' });
    expect(toastMock.dismiss).toHaveBeenCalledWith('payment-confirmation');
  });

  it('cancels a pending checkout, clears local state, and preserves coupon query state', async () => {
    const setSearchParams = vi.fn();
    sessionStorage.setItem('nexcv-pending-checkout', 'order-2');
    vi.mocked(apiFetch).mockResolvedValueOnce({});

    render(
      <HookHarness
        couponCode="SAVE10"
        search="?plan=monthly&payment=cancel&order=order-2"
        setSearchParams={setSearchParams}
      />,
    );

    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/api/billing/checkout/order-2/cancel', { method: 'POST' }));
    expect(sessionStorage.getItem('nexcv-pending-checkout')).toBeNull();
    expect(toastMock.error).toHaveBeenCalledWith('Payment cancelled. Your plan was not changed.', {
      id: 'payment-cancelled',
    });
    expect(setSearchParams).toHaveBeenCalledWith({ plan: 'monthly', coupon: 'SAVE10' }, { replace: true });
  });
});
