import { describe, expect, it, vi } from 'vitest';
import { registerPublicRoutes } from '../routes/public';

const getProfileImageHandler = (overrides: Record<string, any> = {}) => {
  const routes: Array<{ path: string; handlers: any[] }> = [];
  const router: any = {
    get: vi.fn((path: string, ...handlers: any[]) => {
      routes.push({ path, handlers });
      return router;
    }),
    post: vi.fn(() => router),
    put: vi.fn(() => router),
    patch: vi.fn(() => router),
    delete: vi.fn(() => router),
  };
  const deps = {
    getCvAssetObjectStream: vi.fn(),
    cvAssetS3Key: vi.fn((userId: string, fileName: string) => `cv-assets/${userId}/${fileName}`),
    sendError: vi.fn((res, status, error) => res.status(status).json({ error })),
    ...overrides,
  };

  registerPublicRoutes(router, deps);
  const route = routes.find((item) => item.path === '/api/cv-assets/:userId/:fileName');
  if (!route) throw new Error('Profile image serving route not found.');
  return { handler: route.handlers.at(-1), deps };
};

const createResponse = () => {
  const res: any = {
    statusCode: 200,
    body: undefined,
    headers: new Map<string, string>(),
    status: vi.fn((status: number) => {
      res.statusCode = status;
      return res;
    }),
    json: vi.fn((body: unknown) => {
      res.body = body;
      return res;
    }),
    setHeader: vi.fn((name: string, value: string) => {
      res.headers.set(name.toLowerCase(), value);
    }),
    send: vi.fn((body: unknown) => {
      res.body = body;
      return res;
    }),
  };
  return res;
};

describe('profile image serving', () => {
  it('serves SHA-256 content-addressed profile images', async () => {
    const image = Buffer.from('profile-image');
    const getCvAssetObjectStream = vi.fn().mockResolvedValue({
      ContentType: 'image/png',
      Body: {
        async *[Symbol.asyncIterator]() {
          yield image;
        },
      },
    });
    const { handler, deps } = getProfileImageHandler({ getCvAssetObjectStream });
    const res = createResponse();
    const userId = '507f1f77bcf86cd799439011';
    const fileName = `${'a'.repeat(64)}.png`;

    await handler({ params: { userId, fileName } }, res);

    expect(res.statusCode).toBe(200);
    expect(deps.cvAssetS3Key).toHaveBeenCalledWith(userId, fileName);
    expect(getCvAssetObjectStream).toHaveBeenCalledWith(`cv-assets/${userId}/${fileName}`);
    expect(res.headers.get('content-type')).toBe('image/png');
    expect(res.body).toEqual(image);
  });
});
