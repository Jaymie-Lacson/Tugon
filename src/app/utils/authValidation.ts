export interface LoginValidationErrors {
  phone?: string;
  password?: string;
}

export function validateLoginForm(phone: string, password: string): LoginValidationErrors {
  const errors: LoginValidationErrors = {};
  const digits = phone.replace(/\D/g, '');

  if (!phone) {
    errors.phone = 'Phone number is required.';
  } else if (digits.length < 10) {
    errors.phone = 'Enter a valid Philippine phone number.';
  }

  if (!password) {
    errors.password = 'Password is required.';
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  }

  return errors;
}