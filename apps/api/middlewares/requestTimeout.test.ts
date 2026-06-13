import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { configureRequestTimeout } from './requestTimeout';

const createMiddleware = () => {
  const app = { use: vi.fn() };
  configureRequestTimeout(app as any);
  return app.use.mock.calls[0][0] as (req: any, res: any, next: () => void) => void;
};

const createResponse = () => {
  const res = new EventEmitter() as EventEmitter & {
    headersSent: boolean;
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };
  res.headersSent = false;
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

describe('configureRequestTimeout', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('skips non-API requests', () => {
    vi.useFakeTimers();
    const middleware = createMiddleware();
    const res = createResponse();
    const next = vi.fn();

    middleware({ path: '/health' }, res, next);
    vi.runAllTimers();

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 503 after the route-specific timeout', () => {
    vi.useFakeTimers();
    vi.stubEnv('PDF_REQUEST_TIMEOUT_MS', '25');
    const middleware = createMiddleware();
    const res = createResponse();

    middleware({ path: '/api/generate-pdf' }, res, vi.fn());
    vi.advanceTimersByTime(24);
    expect(res.status).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Request timed out. Please try again.' });
  });

  it('cancels the timeout when the response finishes or closes', () => {
    vi.useFakeTimers();
    vi.stubEnv('API_REQUEST_TIMEOUT_MS', '10');
    const middleware = createMiddleware();

    for (const event of ['finish', 'close']) {
      const res = createResponse();
      middleware({ path: '/api/current-user' }, res, vi.fn());
      res.emit(event);
      vi.advanceTimersByTime(10);
      expect(res.status).not.toHaveBeenCalled();
    }
  });

  it('does not write a timeout response after headers were sent', () => {
    vi.useFakeTimers();
    vi.stubEnv('API_REQUEST_TIMEOUT_MS', '10');
    const middleware = createMiddleware();
    const res = createResponse();
    res.headersSent = true;

    middleware({ path: '/api/current-user' }, res, vi.fn());
    vi.advanceTimersByTime(10);

    expect(res.status).not.toHaveBeenCalled();
  });
});
