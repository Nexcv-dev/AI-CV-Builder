import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../utils/api';
import { getCurrentUser } from '../utils/api';
import {
  currentUserQueryKey,
  useCurrentUserQuery,
  useSetCurrentUserCache,
} from './useCurrentUserQuery';

vi.mock('../utils/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/api')>();
  return {
    ...actual,
    getCurrentUser: vi.fn(),
  };
});

const user: AuthUser = {
  id: 'user-1',
  email: 'user@example.com',
  displayName: 'Test User',
  role: 'user',
  plan: 'free',
  emailVerified: true,
  authProvider: 'email',
};

function CurrentUserHarness() {
  const { data, isPending } = useCurrentUserQuery();
  const setCurrentUser = useSetCurrentUserCache();

  return (
    <div>
      <span>{isPending ? 'loading' : data?.email || 'guest'}</span>
      <button type="button" onClick={() => setCurrentUser(null)}>clear user</button>
    </div>
  );
}

const renderHarness = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const result = render(
    <QueryClientProvider client={queryClient}>
      <CurrentUserHarness />
    </QueryClientProvider>,
  );
  return { ...result, queryClient };
};

describe('useCurrentUserQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the current user and reuses the fresh cached result across rerenders', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(user);
    const { rerender, queryClient } = renderHarness();

    expect(await screen.findByText(user.email)).toBeInTheDocument();
    rerender(
      <QueryClientProvider client={queryClient}>
        <CurrentUserHarness />
      </QueryClientProvider>,
    );

    expect(getCurrentUser).toHaveBeenCalledTimes(1);
  });

  it('synchronizes login and logout events into the query cache', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const { queryClient } = renderHarness();
    expect(await screen.findByText('guest')).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new CustomEvent<AuthUser>('auth-user-changed', { detail: user }));
    });
    expect(await screen.findByText(user.email)).toBeInTheDocument();
    expect(queryClient.getQueryData(currentUserQueryKey)).toEqual(user);

    act(() => {
      window.dispatchEvent(new CustomEvent('auth-user-changed'));
    });
    expect(await screen.findByText('guest')).toBeInTheDocument();
    expect(queryClient.getQueryData(currentUserQueryKey)).toBeNull();
  });

  it('allows authenticated flows to update the shared cache directly', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(user);
    const { queryClient } = renderHarness();
    expect(await screen.findByText(user.email)).toBeInTheDocument();

    act(() => screen.getByRole('button', { name: 'clear user' }).click());

    await waitFor(() => expect(queryClient.getQueryData(currentUserQueryKey)).toBeNull());
    expect(screen.getByText('guest')).toBeInTheDocument();
  });
});
