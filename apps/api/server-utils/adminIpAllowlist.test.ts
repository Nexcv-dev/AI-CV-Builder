import { beforeEach, describe, expect, it, vi } from 'vitest';

const makeRequest = ({
  remoteAddress = '203.0.113.10',
  ip = '203.0.113.10',
  ips = [],
  forwardedFor = '',
}: {
  remoteAddress?: string;
  ip?: string;
  ips?: string[];
  forwardedFor?: string;
} = {}) => ({
  socket: { remoteAddress },
  ip,
  ips,
  header: vi.fn((name: string) => (name.toLowerCase() === 'x-forwarded-for' ? forwardedFor : '')),
});

describe('admin IP allowlist', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('denies access when no allowlist is configured', async () => {
    const { isAdminIpAllowed } = await import('./adminIpAllowlist');

    expect(isAdminIpAllowed(makeRequest() as any)).toBe(false);
  });

  it('normalizes IPv4-mapped and loopback addresses', async () => {
    vi.stubEnv('ADMIN_ALLOWED_IPS', '127.0.0.1, 203.0.113.10');
    const { isAdminIpAllowed, resolveAdminClientIp } = await import('./adminIpAllowlist');

    const localhostReq = makeRequest({ remoteAddress: '::ffff:127.0.0.1', ip: '::1' });
    const publicReq = makeRequest({ remoteAddress: '203.0.113.10:443', ip: '203.0.113.10' });

    expect(resolveAdminClientIp(localhostReq as any)).toBe('127.0.0.1');
    expect(isAdminIpAllowed(localhostReq as any)).toBe(true);
    expect(isAdminIpAllowed(publicReq as any)).toBe(true);
  });

  it('uses forwarded client IPs only from trusted proxies', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ADMIN_ALLOWED_IPS', '198.51.100.25');
    vi.stubEnv('ADMIN_TRUSTED_PROXY_IPS', '10.0.0.10');
    const { isAdminIpAllowed, resolveAdminClientIp } = await import('./adminIpAllowlist');
    const trustedProxyReq = makeRequest({
      remoteAddress: '10.0.0.10',
      ip: '10.0.0.10',
      ips: ['198.51.100.25'],
      forwardedFor: '198.51.100.25, 10.0.0.10',
    });
    const untrustedProxyReq = makeRequest({
      remoteAddress: '10.0.0.11',
      ip: '10.0.0.11',
      ips: ['198.51.100.25'],
      forwardedFor: '198.51.100.25, 10.0.0.11',
    });

    expect(resolveAdminClientIp(trustedProxyReq as any)).toBe('198.51.100.25');
    expect(isAdminIpAllowed(trustedProxyReq as any)).toBe(true);
    expect(resolveAdminClientIp(untrustedProxyReq as any)).toBe('10.0.0.11');
    expect(isAdminIpAllowed(untrustedProxyReq as any)).toBe(false);
  });
});
