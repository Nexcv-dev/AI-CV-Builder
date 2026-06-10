import { describe, expect, it, vi } from 'vitest';
import { validateAuthEmail } from './authValidationService';

describe('validateAuthEmail', () => {
  it('rejects syntactically invalid email addresses before domain checks', () => {
    const isValidEmail = vi.fn(() => false);

    expect(validateAuthEmail('not-an-email', isValidEmail)).toBe('Enter a valid email address.');
    expect(isValidEmail).toHaveBeenCalledWith('not-an-email');
  });

  it('allows common consumer email domains case-insensitively', () => {
    expect(validateAuthEmail('User@GMAIL.COM', () => true)).toBe('');
    expect(validateAuthEmail('person@protonmail.com', () => true)).toBe('');
  });

  it('rejects blocked disposable domains and unlisted domains', () => {
    expect(validateAuthEmail('user@mailinator.com', () => true)).toBe('Enter a valid email address.');
    expect(validateAuthEmail('user@example.org', () => true)).toBe('Enter a valid email address.');
  });
});
