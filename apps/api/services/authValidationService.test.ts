import { describe, expect, it, vi } from 'vitest';
import { API_ERROR_CODES } from '../server-utils/apiErrors';
import {
  hasAcceptedTerms,
  normalizeOtpCode,
  validateAuthEmail,
  validateAuthEmailForIntent,
  validateSignupDetails,
} from './authValidationService';

const rules = {
  isValidEmail: (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  roleForEmail: (email: unknown) => (email === 'owner@gmail.com' ? 'super_admin' as const : 'user' as const),
  validatePasswordStrength: (password: string) => password.length >= 8,
  passwordPolicyMessage: 'Password policy.',
};

const validSignup = {
  email: 'person@gmail.com',
  displayName: 'Person',
  phone: '0771234567',
  password: 'long-enough',
  acceptedTerms: true,
};

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

describe('validateAuthEmailForIntent', () => {
  it('refuses allowlisted admin emails for signup only', () => {
    expect(validateAuthEmailForIntent('owner@gmail.com', 'signup', rules)).toMatchObject({
      status: 400,
      code: API_ERROR_CODES.VALIDATION_FAILED,
      error: 'Could not create your account. Please check your details and try again.',
    });
    expect(validateAuthEmailForIntent('owner@gmail.com', 'login', rules)).toBeNull();
  });
});

describe('validateSignupDetails', () => {
  it('accepts complete details', () => {
    expect(validateSignupDetails(validSignup, rules)).toBeNull();
  });

  it('reports the first missing field in a fixed order', () => {
    expect(validateSignupDetails({ ...validSignup, displayName: '', phone: '' }, rules)?.error).toBe('Enter your name.');
    expect(validateSignupDetails({ ...validSignup, phone: '', acceptedTerms: false }, rules)?.error).toBe('Enter your contact number.');
    expect(validateSignupDetails({ ...validSignup, acceptedTerms: false, password: '' }, rules)?.error)
      .toBe('Please accept the Terms and Privacy Policy to create your account.');
    expect(validateSignupDetails({ ...validSignup, password: 'short' }, rules)).toMatchObject({
      error: 'Password policy.',
      code: API_ERROR_CODES.PASSWORD_INVALID,
    });
  });
});

describe('form value helpers', () => {
  it('accepts the terms checkbox as a boolean or the string "true"', () => {
    expect(hasAcceptedTerms(true)).toBe(true);
    expect(hasAcceptedTerms('true')).toBe(true);
    expect(hasAcceptedTerms('yes')).toBe(false);
    expect(hasAcceptedTerms(undefined)).toBe(false);
  });

  it('keeps only the digits of an OTP', () => {
    expect(normalizeOtpCode(' 123-456 ')).toBe('123456');
    expect(normalizeOtpCode(123456)).toBe('');
  });
});
