import { describe, expect, it } from 'vitest';
import { getAuthEmailError, getPasswordChecks, getPasswordError, getSuggestedEmail } from './authValidation';

describe('auth validation helpers', () => {
  it('accepts normalized allowed email domains and rejects disposable domains', () => {
    expect(getAuthEmailError('  User.Name+cv@GMAIL.com  ')).toBe('');
    expect(getAuthEmailError('applicant@mailinator.com')).toBe('Enter a valid email address.');
    expect(getAuthEmailError('applicant@example.com')).toBe('Enter a valid email address.');
    expect(getAuthEmailError('missing-at-symbol')).toBe('Enter a valid email address.');
  });

  it('suggests common email domain typo fixes without changing valid addresses', () => {
    expect(getSuggestedEmail('person@gmai.com')).toBe('person@gmail.com');
    expect(getSuggestedEmail('person@outlok.com')).toBe('person@outlook.com');
    expect(getSuggestedEmail('person@gmail.com')).toBe('');
  });

  it('requires every password policy segment before passing', () => {
    expect(getPasswordError('Short1!')).toBe('Use 8+ characters with uppercase, lowercase, number, and symbol.');
    expect(getPasswordError('longbutmissingnumber!')).toBe('Use 8+ characters with uppercase, lowercase, number, and symbol.');
    expect(getPasswordError('ValidPass1!')).toBe('');

    expect(getPasswordChecks('ValidPass1!')).toEqual([
      { label: '8+ characters', passed: true },
      { label: 'Uppercase', passed: true },
      { label: 'Lowercase', passed: true },
      { label: 'Number', passed: true },
      { label: 'Symbol', passed: true },
    ]);
  });
});
