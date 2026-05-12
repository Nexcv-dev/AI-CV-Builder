import { describe, it, expect, vi } from 'vitest';
import { integrityCheck, sendError, generateCVHTML } from '../server';

describe('Advanced Server Security', () => {
  describe('integrityCheck middleware', () => {
    it('should allow non-POST requests', () => {
      const req = { method: 'GET', path: '/api/test', header: vi.fn() } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
      const next = vi.fn();

      integrityCheck(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should block POST requests without integrity header', () => {
      const req = { 
        method: 'POST', 
        path: '/api/generate-pdf', 
        header: vi.fn().mockReturnValue(undefined) 
      } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
      const next = vi.fn();

      integrityCheck(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Unauthorized request source' }));
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow POST requests with correct integrity header', () => {
      const req = { 
        method: 'POST', 
        path: '/api/generate-pdf', 
        protocol: 'http',
        header: vi.fn((name: string) => {
          if (name === 'X-App-Source') return 'cv-builder-app';
          if (name === 'Origin') return 'http://localhost:3000';
          if (name === 'host') return 'localhost:3000';
          return undefined;
        }),
        get: vi.fn((name: string) => name === 'host' ? 'localhost:3000' : undefined),
      } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
      const next = vi.fn();

      integrityCheck(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should block PATCH requests without integrity header', () => {
      const req = {
        method: 'PATCH',
        path: '/api/auth/profile',
        header: vi.fn().mockReturnValue(undefined),
      } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
      const next = vi.fn();

      integrityCheck(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Unauthorized request source' }));
      expect(next).not.toHaveBeenCalled();
    });

    it('should block state-changing requests from untrusted origins', () => {
      const req = {
        method: 'DELETE',
        path: '/api/documents/123',
        protocol: 'http',
        header: vi.fn((name: string) => {
          if (name === 'X-App-Source') return 'cv-builder-app';
          if (name === 'Origin') return 'https://evil.example';
          if (name === 'host') return 'localhost:3000';
          return undefined;
        }),
        get: vi.fn((name: string) => name === 'host' ? 'localhost:3000' : undefined),
      } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
      const next = vi.fn();

      integrityCheck(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Untrusted request origin' }));
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('sendError helper', () => {
    it('should hide internal details in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
      sendError(res, 500, 'Public Message', new Error('Private Secret'));
      
      expect(res.status).toHaveBeenCalledWith(500);
      const jsonResponse = res.json.mock.calls[0][0];
      expect(jsonResponse.error).toBe('Public Message');
      expect(jsonResponse.errorId).toBeUndefined();
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should include errorId in non-production environments', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
      sendError(res, 400, 'Bad Request');
      
      const jsonResponse = res.json.mock.calls[0][0];
      expect(jsonResponse.errorId).toBeDefined();
      expect(typeof jsonResponse.errorId).toBe('string');
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('PDF Sanitization (Regression/Security)', () => {
    it('should sanitize rich text descriptions in generated HTML', () => {
      const dataWithXSS = {
        personalInfo: { fullName: 'John', email: 'j@j.com', summary: 'Dev' },
        experience: [
          {
            position: 'Dev',
            company: 'ACME',
            description: 'Safe <b>Bold</b> <script>alert("xss")</script> <iframe src="evil.com"></iframe>'
          }
        ],
        themeColor: '#000',
        sidebarColor: '#000'
      };

      const html = generateCVHTML(dataWithXSS as any, 'classic');
      
      // Should preserve safe tags
      expect(html).toContain('<b>Bold</b>');
      expect(html).toContain('Safe');
      
      // Should strip dangerous tags
      expect(html).not.toContain('<script>');
      expect(html).not.toContain('alert("xss")');
      expect(html).not.toContain('<iframe');
      expect(html).not.toContain('evil.com');
    });
  });
});
