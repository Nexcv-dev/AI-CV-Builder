import { beforeEach, describe, expect, it, vi } from 'vitest';

const logEvent = vi.fn();

vi.mock('./logger', () => ({
  logEvent,
}));

describe('withCircuitBreaker', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.resetModules();
    logEvent.mockReset();
  });

  it('opens after the configured failure threshold and blocks calls during cooldown', async () => {
    const { CircuitBreakerOpenError, withCircuitBreaker } = await import('./circuitBreaker');
    const operation = vi.fn().mockRejectedValue(new Error('provider unavailable'));

    await expect(withCircuitBreaker({ name: 'test-open', failureThreshold: 2 }, operation)).rejects.toThrow(
      'provider unavailable',
    );
    await expect(withCircuitBreaker({ name: 'test-open', failureThreshold: 2 }, operation)).rejects.toThrow(
      'provider unavailable',
    );
    await expect(withCircuitBreaker({ name: 'test-open', failureThreshold: 2 }, operation)).rejects.toBeInstanceOf(
      CircuitBreakerOpenError,
    );

    expect(operation).toHaveBeenCalledTimes(2);
    expect(logEvent).toHaveBeenCalledWith('error', 'circuit.opened', {
      circuit: 'test-open',
      failures: 2,
      cooldownMs: 60000,
    });
  });

  it('moves to half-open after cooldown and closes again after a successful probe', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-10T00:00:00.000Z'));
    const { withCircuitBreaker } = await import('./circuitBreaker');
    const failingOperation = vi.fn().mockRejectedValue(new Error('timeout'));

    await expect(
      withCircuitBreaker({ name: 'test-half-open', failureThreshold: 1, cooldownMs: 1000 }, failingOperation),
    ).rejects.toThrow('timeout');

    vi.setSystemTime(new Date('2026-06-10T00:00:01.001Z'));
    const successfulOperation = vi.fn().mockResolvedValue('ok');

    await expect(
      withCircuitBreaker({ name: 'test-half-open', failureThreshold: 1, cooldownMs: 1000 }, successfulOperation),
    ).resolves.toBe('ok');

    expect(logEvent).toHaveBeenCalledWith('warn', 'circuit.half_open', { circuit: 'test-half-open' });
    expect(logEvent).toHaveBeenCalledWith('info', 'circuit.closed', { circuit: 'test-half-open' });
  });
});
