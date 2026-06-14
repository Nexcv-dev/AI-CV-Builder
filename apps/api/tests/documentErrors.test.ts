import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerCvRoutes } from '../routes/cv';
import { API_ERROR_CODES } from '../server-utils/apiErrors';

type Route = { method: string; path: string; handlers: any[] };

const createRouteHarness = (overrides: Record<string, any> = {}) => {
  const routes: Route[] = [];
  const router: any = {};
  for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
    router[method] = vi.fn((path: string, ...handlers: any[]) => {
      routes.push({ method, path, handlers });
      return router;
    });
  }

  const CVDocument = {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    findOneAndDelete: vi.fn(),
    create: vi.fn(),
  };
  const deps = {
    CVDocument,
    requireAuth: vi.fn(),
    requireVerifiedEmail: vi.fn(() => true),
    isValidDocumentId: vi.fn(() => true),
    currentUserId: vi.fn(() => 'user-1'),
    resolveRequestedTemplate: vi.fn(async () => 'classic'),
    sanitizeCvDataForStorage: vi.fn((value) => value),
    sanitizeContextField: vi.fn((value) => String(value || 'Untitled CV')),
    titleFromCvData: vi.fn(() => 'Untitled CV'),
    incrementCvCreationQuota: vi.fn(async () => ({
      limit: 3,
      used: 1,
      remaining: 2,
      reached: false,
      reserved: true,
    })),
    rollbackCvCreationQuota: vi.fn(async () => undefined),
    documentDetails: vi.fn((document) => document),
    isMongoValidationError: vi.fn((error) => error?.name === 'ValidationError'),
    sendError: vi.fn((res, status, error, _internalError, code) => (
      res.status(status).json({ error, code: code || API_ERROR_CODES.INTERNAL_ERROR })
    )),
    ...overrides,
  };

  registerCvRoutes(router, deps);

  const handler = (method: string, path: string) => {
    const route = routes.find((item) => item.method === method && item.path === path);
    if (!route) throw new Error(`Route not found: ${method} ${path}`);
    return route.handlers.at(-1);
  };

  return { CVDocument, deps, handler };
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

describe('document CRUD error contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ['get', '/api/documents/:id'],
    ['put', '/api/documents/:id'],
    ['delete', '/api/documents/:id'],
  ])('returns a coded validation error for invalid ids on %s', async (method, path) => {
    const { handler } = createRouteHarness({ isValidDocumentId: vi.fn(() => false) });
    const res = createResponse();

    await handler(method, path)({ params: { id: 'bad-id' }, body: {}, user: {} }, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: 'Invalid document id.',
      code: API_ERROR_CODES.VALIDATION_FAILED,
    });
  });

  it.each([
    ['get', '/api/documents/:id', 'findOne'],
    ['put', '/api/documents/:id', 'findOneAndUpdate'],
    ['delete', '/api/documents/:id', 'findOneAndDelete'],
  ])('returns a stable not-found code on %s', async (method, path, modelMethod) => {
    const { CVDocument, handler } = createRouteHarness();
    CVDocument[modelMethod as keyof typeof CVDocument].mockResolvedValue(null);
    const res = createResponse();

    await handler(method, path)({
      params: { id: '507f1f77bcf86cd799439011' },
      body: method === 'put' ? { cvData: {}, status: 'draft' } : {},
      user: {},
    }, res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      error: 'Document not found.',
      code: API_ERROR_CODES.DOCUMENT_NOT_FOUND,
    });
  });

  it.each([
    ['post', '/api/documents'],
    ['put', '/api/documents/:id'],
  ])('rejects missing, array, and invalid-status payloads on %s', async (method, path) => {
    const { handler } = createRouteHarness();

    for (const body of [undefined, { cvData: [] }, { cvData: {}, status: 'published' }]) {
      const res = createResponse();
      await handler(method, path)({
        params: { id: '507f1f77bcf86cd799439011' },
        body,
        user: {},
      }, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe(API_ERROR_CODES.VALIDATION_FAILED);
    }
  });

  it('returns the forbidden code when the create quota is reached', async () => {
    const { handler } = createRouteHarness({
      incrementCvCreationQuota: vi.fn(async () => ({
        limit: 1,
        used: 1,
        remaining: 0,
        reached: true,
        reserved: false,
      })),
    });
    const res = createResponse();

    await handler('post', '/api/documents')({
      body: { cvData: {}, status: 'draft' },
      user: {},
    }, res);

    expect(res.statusCode).toBe(403);
    expect(res.body).toMatchObject({
      code: API_ERROR_CODES.FORBIDDEN,
      upgradeRequired: true,
    });
  });

  it.each([
    ['post', '/api/documents', 'create'],
    ['put', '/api/documents/:id', 'findOneAndUpdate'],
  ])('maps database validation failures to a coded 400 on %s', async (method, path, modelMethod) => {
    const { CVDocument, deps, handler } = createRouteHarness();
    const validationError = Object.assign(new Error('Invalid schema value'), { name: 'ValidationError' });
    CVDocument[modelMethod as keyof typeof CVDocument].mockRejectedValue(validationError);
    const res = createResponse();

    await handler(method, path)({
      params: { id: '507f1f77bcf86cd799439011' },
      body: { cvData: {}, status: 'draft' },
      user: {},
    }, res);

    expect(deps.sendError).toHaveBeenCalledWith(
      res,
      400,
      'Invalid CV data.',
      validationError,
      API_ERROR_CODES.VALIDATION_FAILED,
    );
    expect(res.statusCode).toBe(400);
  });
});
