import { describe, expect, it } from 'vitest';
import { validateLoginForm } from './authValidation';

describe('validateLoginForm', () => {
  it('requires phone and password', () => {
    expect(validateLoginForm('', '')).toEqual({
      phone: 'Phone number is required.',
      password: 'Password is required.',
    });
  });

  it('rejects short phone and short password', () => {
    expect(validateLoginForm('0917-12', 'short')).toEqual({
      phone: 'Enter a valid Philippine phone number.',
      password: 'Password must be at least 8 characters.',
    });
  });

  it('accepts formatted valid phone and strong-enough password', () => {
    expect(validateLoginForm('0917-555-1234', 'password8')).toEqual({});
  });

  it('accepts minimally valid boundary values', () => {
    expect(validateLoginForm('0917123456', '12345678')).toEqual({});
  });

  it('keeps phone valid when separators are present but still rejects short password', () => {
    expect(validateLoginForm('0917-123-4567', '1234567')).toEqual({
      password: 'Password must be at least 8 characters.',
    });
  });
});
