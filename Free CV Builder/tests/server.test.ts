import { describe, it, expect } from 'vitest';
import { sanitizeTextForPrompt, sanitizeContextField, generateCVHTML } from '../server';

describe('Server Utils', () => {
  describe('sanitizeTextForPrompt', () => {
    it('should strip control characters', () => {
      const input = 'Hello\x00World\x1F';
      const result = sanitizeTextForPrompt(input);
      expect(result).toBe('HelloWorld');
    });

    it('should trim whitespace', () => {
      const input = '  Hello World  ';
      const result = sanitizeTextForPrompt(input);
      expect(result).toBe('Hello World');
    });

    it('should truncate long text', () => {
      const input = 'a'.repeat(10001);
      const result = sanitizeTextForPrompt(input);
      expect(result.length).toBe(10000);
    });
  });

  describe('sanitizeContextField', () => {
    it('should return "Unknown" for non-string values', () => {
      expect(sanitizeContextField(null)).toBe('Unknown');
      expect(sanitizeContextField(undefined)).toBe('Unknown');
      expect(sanitizeContextField(123)).toBe('Unknown');
    });

    it('should sanitize and trim string values', () => {
      const input = '  Company\x00Name  ';
      expect(sanitizeContextField(input)).toBe('CompanyName');
    });

    it('should truncate long fields to 200 chars', () => {
      const input = 'b'.repeat(250);
      expect(sanitizeContextField(input).length).toBe(200);
    });
  });
});

describe('generateCVHTML', () => {
  const mockCVData = {
    personalInfo: {
      fullName: 'John Doe',
      email: 'john@example.com',
      summary: 'Professional developer'
    },
    experience: [
      {
        company: 'Tech Corp',
        position: 'Senior Dev',
        startDate: '2020',
        endDate: 'Present',
        description: 'Building things'
      }
    ],
    themeColor: '#2563eb',
    sidebarColor: '#111827'
  };

  it('should generate HTML for "classic" template', () => {
    const html = generateCVHTML(mockCVData, 'classic');
    expect(html).toContain('John Doe');
    expect(html).toContain('john@example.com');
    expect(html).toContain('Tech Corp');
    expect(html).toContain('Senior Dev');
  });

  it('should generate HTML for "modern" template', () => {
    const html = generateCVHTML(mockCVData, 'modern');
    expect(html).toContain('John Doe');
    expect(html).toContain('Profile'); // Modern uses "Profile" header
  });

  it('should generate HTML for "professional" template', () => {
    const html = generateCVHTML(mockCVData, 'professional');
    expect(html).toContain('John Doe');
    expect(html).toContain('Professional Summary'); // Professional uses this header
  });

  it('should escape HTML characters for security', () => {
    const maliciousData = {
      ...mockCVData,
      personalInfo: {
        ...mockCVData.personalInfo,
        fullName: 'John <script>alert("xss")</script> Doe'
      }
    };
    const html = generateCVHTML(maliciousData, 'classic');
    expect(html).toContain('John &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; Doe');
    expect(html).not.toContain('<script>');
  });
});
