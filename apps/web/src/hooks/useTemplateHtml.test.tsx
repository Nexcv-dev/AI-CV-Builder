import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NETWORK_ERROR_MESSAGE, apiFetchText } from '../utils/api';
import { useTemplateHtml } from './useTemplateHtml';

vi.mock('../utils/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/api')>();
  return {
    ...actual,
    apiFetchText: vi.fn(),
  };
});

const mockApiFetchText = vi.mocked(apiFetchText);

describe('useTemplateHtml', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads template HTML through the shared API path and caches it', async () => {
    mockApiFetchText.mockResolvedValue('<main>Classic</main>');

    const first = renderHook(() => useTemplateHtml('classic'));
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    expect(first.result.current).toEqual({
      html: '<main>Classic</main>',
      loading: false,
      error: null,
    });
    first.unmount();

    const second = renderHook(() => useTemplateHtml('classic'));
    await waitFor(() => expect(second.result.current.loading).toBe(false));
    expect(second.result.current.html).toBe('<main>Classic</main>');
    expect(mockApiFetchText).toHaveBeenCalledTimes(2);
    expect(mockApiFetchText).toHaveBeenCalledWith(
      '/api/templates/classic/html',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      'Could not load template.',
    );
  });

  it('shows the shared internet connection message for network failures', async () => {
    mockApiFetchText.mockRejectedValue(new TypeError('Failed to fetch'));

    const { result } = renderHook(() => useTemplateHtml('modern'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(NETWORK_ERROR_MESSAGE);
  });

  it('silently ignores cancellation when the component unmounts', () => {
    mockApiFetchText.mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener('abort', () => {
        reject(new DOMException('The operation was aborted.', 'AbortError'));
      });
    }));

    const { unmount } = renderHook(() => useTemplateHtml('startup'));
    expect(() => unmount()).not.toThrow();
  });
});
