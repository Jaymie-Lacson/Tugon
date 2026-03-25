// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, beforeEach } from 'vitest';
import { Navigate } from 'react-router';
import { RequireAuth, RequireRole } from './RequireAuth';

function writeSession(role: 'CITIZEN' | 'OFFICIAL' | 'SUPER_ADMIN') {
  localStorage.setItem(
    'tugon.auth.session',
    JSON.stringify({
      user: {
        id: 'user-1',
        fullName: 'Guard Test',
        phoneNumber: '09170000000',
        role,
      },
    }),
  );
}

describe('RequireAuth component guards', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('redirects unauthenticated users to login', () => {
    const result = RequireAuth({ children: React.createElement('div', null, 'private') });

    expect(React.isValidElement(result)).toBe(true);
    expect((result as React.ReactElement).type).toBe(Navigate);
    expect((result as React.ReactElement).props.to).toBe('/auth/login');
    expect((result as React.ReactElement).props.replace).toBe(true);
  });

  it('renders children when an authenticated session exists', () => {
    writeSession('CITIZEN');

    const child = React.createElement('div', { id: 'allowed' }, 'allowed');
    const result = RequireAuth({ children: child });

    expect(React.isValidElement(result)).toBe(true);
    expect((result as React.ReactElement).type).toBe(React.Fragment);
  });

  it('applies fallback redirect when role is not allowed', () => {
    writeSession('OFFICIAL');

    const result = RequireRole({
      children: React.createElement('div', null, 'restricted'),
      roles: ['CITIZEN'],
      fallbackPath: '/app',
    });

    expect(React.isValidElement(result)).toBe(true);
    expect((result as React.ReactElement).type).toBe(Navigate);
    expect((result as React.ReactElement).props.to).toBe('/app');
    expect((result as React.ReactElement).props.replace).toBe(true);
  });

  it('renders content when role is included in the allowed list', () => {
    writeSession('SUPER_ADMIN');

    const result = RequireRole({
      children: React.createElement('div', null, 'ok'),
      roles: ['OFFICIAL', 'SUPER_ADMIN'],
      fallbackPath: '/citizen',
    });

    expect(React.isValidElement(result)).toBe(true);
    expect((result as React.ReactElement).type).toBe(React.Fragment);
  });
});
