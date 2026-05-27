import { logEvent } from './logger';

type CircuitState = 'closed' | 'open' | 'half_open';

interface CircuitBreakerOptions {
    name: string;
    failureThreshold?: number;
    cooldownMs?: number;
    halfOpenMaxCalls?: number;
}

interface CircuitBreakerState {
    state: CircuitState;
    failures: number;
    openedAt: number;
    halfOpenCalls: number;
}

const breakers = new Map<string, CircuitBreakerState>();

const parsePositiveInt = (value: string | undefined, fallback: number) => {
    const parsed = Number.parseInt(value || '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export class CircuitBreakerOpenError extends Error {
    constructor(name: string) {
        super(`${name} circuit breaker is open.`);
        this.name = 'CircuitBreakerOpenError';
    }
}

const getState = (name: string): CircuitBreakerState => {
    const existing = breakers.get(name);
    if (existing) return existing;

    const state: CircuitBreakerState = {
        state: 'closed',
        failures: 0,
        openedAt: 0,
        halfOpenCalls: 0,
    };
    breakers.set(name, state);
    return state;
};

export async function withCircuitBreaker<T>(options: CircuitBreakerOptions, operation: () => Promise<T>): Promise<T> {
    const failureThreshold = options.failureThreshold ?? parsePositiveInt(process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD, 5);
    const cooldownMs = options.cooldownMs ?? parsePositiveInt(process.env.CIRCUIT_BREAKER_COOLDOWN_MS, 60_000);
    const halfOpenMaxCalls = options.halfOpenMaxCalls ?? parsePositiveInt(process.env.CIRCUIT_BREAKER_HALF_OPEN_MAX_CALLS, 1);
    const state = getState(options.name);
    const now = Date.now();

    if (state.state === 'open') {
        if (now - state.openedAt < cooldownMs) {
            throw new CircuitBreakerOpenError(options.name);
        }
        state.state = 'half_open';
        state.halfOpenCalls = 0;
        logEvent('warn', 'circuit.half_open', { circuit: options.name });
    }

    if (state.state === 'half_open') {
        if (state.halfOpenCalls >= halfOpenMaxCalls) {
            throw new CircuitBreakerOpenError(options.name);
        }
        state.halfOpenCalls += 1;
    }

    try {
        const result = await operation();
        if (state.state !== 'closed' || state.failures > 0) {
            logEvent('info', 'circuit.closed', { circuit: options.name });
        }
        state.state = 'closed';
        state.failures = 0;
        state.openedAt = 0;
        state.halfOpenCalls = 0;
        return result;
    } catch (error) {
        state.failures += 1;
        if (state.state === 'half_open' || state.failures >= failureThreshold) {
            state.state = 'open';
            state.openedAt = Date.now();
            state.halfOpenCalls = 0;
            logEvent('error', 'circuit.opened', {
                circuit: options.name,
                failures: state.failures,
                cooldownMs,
            });
        }
        throw error;
    }
}
