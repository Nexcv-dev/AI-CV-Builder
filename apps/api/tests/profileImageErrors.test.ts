import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { registerCvRoutes } from '../routes/cv';
import { API_ERROR_CODES } from '../server-utils/apiErrors';

const getHandler = (overrides: Record<string, any> = {}) => {
  const routes: Array<{ path: string; handlers: any[] }> = [];
  const router: any = {
    post: vi.fn((path: string, ...handlers: any[]) => {
      routes.push({ path, handlers });
      return router;
    }),
    get: vi.fn(() => router),
    put: vi.fn(() => router),
    patch: vi.fn(() => router),
    delete: vi.fn(() => router),
  };
  const deps = {
    requireAuth: vi.fn(),
    imageUploadJsonParser: vi.fn(),
    isCvAssetStorageConfigured: vi.fn(() => true),
    cvAssetS3Key: vi.fn((userId: string, fileName: string) => `cv-assets/${userId}/${fileName}`),
    putCvAssetObject: vi.fn(async () => undefined),
    currentUserId: vi.fn(() => 'user-1'),
    getApiOrigin: vi.fn(() => 'https://api.example.com'),
    createHash,
    sendError: vi.fn((res, status, error, _internal, code) => res.status(status).json({ error, code })),
    ...overrides,
  };

  registerCvRoutes(router, deps);
  const route = routes.find((item) => item.path === '/api/profile-images');
  if (!route) throw new Error('Profile image route not found.');
  return { handler: route.handlers.at(-1), deps };
};

const createResponse = () => {
  const res: any = {
    statusCode: 200,
    body: undefined,
    status: vi.fn((status: number) => {
      res.statusCode = status;
      return res;
    }),
    json: vi.fn((body: unknown) => {
      res.body = body;
      return res;
    }),
  };
  return res;
};

describe('profile image upload contracts', () => {
  it('returns a coded service error when storage is unavailable', async () => {
    const { handler } = getHandler({ isCvAssetStorageConfigured: vi.fn(() => false) });
    const res = createResponse();

    await handler({ body: {}, user: {} }, res);

    expect(res.statusCode).toBe(503);
    expect(res.body.code).toBe(API_ERROR_CODES.PROFILE_IMAGE_STORAGE_UNAVAILABLE);
  });

  it('returns a coded validation error for invalid image data', async () => {
    const { handler } = getHandler();
    const res = createResponse();

    await handler({ body: { imageData: 'not-an-image' }, user: {} }, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe(API_ERROR_CODES.PROFILE_IMAGE_INVALID);
  });

  it('uses a stable content hash key for identical image bytes', async () => {
    const { handler, deps } = getHandler();
    const imageData = 'data:image/png;base64,c2FtZS1pbWFnZQ==';
    const expectedHash = createHash('sha256').update(Buffer.from('same-image')).digest('hex');

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const res = createResponse();
      await handler({ body: { imageData }, user: {} }, res);
      expect(res.statusCode).toBe(201);
      expect(res.body.imageUrl).toContain(`${expectedHash}.png`);
    }

    expect(deps.cvAssetS3Key).toHaveBeenNthCalledWith(1, 'user-1', `${expectedHash}.png`);
    expect(deps.cvAssetS3Key).toHaveBeenNthCalledWith(2, 'user-1', `${expectedHash}.png`);
  });

  it('returns a domain code when the storage upload fails', async () => {
    const uploadError = new Error('S3 unavailable');
    const { handler, deps } = getHandler({
      putCvAssetObject: vi.fn().mockRejectedValue(uploadError),
    });
    const res = createResponse();

    await handler({ body: { imageData: 'data:image/webp;base64,dGVzdA==' }, user: {} }, res);

    expect(deps.sendError).toHaveBeenCalledWith(
      res,
      500,
      'Could not sync the profile image.',
      uploadError,
      API_ERROR_CODES.PROFILE_IMAGE_UPLOAD_FAILED,
    );
  });
});
