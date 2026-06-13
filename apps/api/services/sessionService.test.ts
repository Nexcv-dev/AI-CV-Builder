import { describe, expect, it } from 'vitest';
import {
  invalidateUserSessions,
  isSessionCurrent,
  markSessionCurrent,
  sessionVersionForUser,
} from './sessionService';

describe('sessionService', () => {
  it('normalizes missing, negative, and fractional session versions', () => {
    expect(sessionVersionForUser(undefined)).toBe(0);
    expect(sessionVersionForUser({ sessionVersion: -3 })).toBe(0);
    expect(sessionVersionForUser({ sessionVersion: 2.9 })).toBe(2);
    expect(sessionVersionForUser({ sessionVersion: '4' })).toBe(4);
  });

  it('marks a session current and invalidates all older sessions', () => {
    const req = { session: {} } as any;
    const user = { sessionVersion: 3 };

    markSessionCurrent(req, user);
    expect(req.session.authSessionVersion).toBe(3);
    expect(isSessionCurrent(req, user)).toBe(true);

    invalidateUserSessions(user);
    expect(user.sessionVersion).toBe(4);
    expect(isSessionCurrent(req, user)).toBe(false);
  });

  it('keeps legacy users without a version valid and tolerates missing sessions', () => {
    expect(isSessionCurrent({} as any, { sessionVersion: 0 })).toBe(true);
    expect(isSessionCurrent({} as any, { sessionVersion: 1 })).toBe(false);
    expect(() => markSessionCurrent({} as any, { sessionVersion: 1 })).not.toThrow();
  });
});
