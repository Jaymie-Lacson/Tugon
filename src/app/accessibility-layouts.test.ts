// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router';
import Landing from './pages/Landing';
import Layout from './components/Layout';
import SuperAdminLayout from './pages/superadmin/SuperAdminLayout';

vi.mock('./services/superAdminApi', () => ({
  superAdminApi: {
    getBarangays: vi.fn().mockResolvedValue({ barangays: [] }),
    getNotifications: vi.fn().mockResolvedValue({ notifications: [], unreadCount: 0 }),
    markNotificationRead: vi.fn().mockResolvedValue(undefined),
    markAllNotificationsRead: vi.fn().mockResolvedValue(undefined),
  },
}));

type MountedTree = {
  container: HTMLDivElement;
  root: Root;
};

let mounted: MountedTree | null = null;

async function mount(node: React.ReactElement): Promise<MountedTree> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(node);
    await Promise.resolve();
  });
  return { container, root };
}

function unmountCurrent() {
  if (!mounted) {
    return;
  }

  act(() => {
    mounted?.root.unmount();
  });

  mounted.container.remove();
  mounted = null;
}

class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const act = React.act;

describe('Accessibility layout safeguards', () => {
  beforeEach(() => {
    localStorage.clear();
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('max-width') ? false : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
  });

  afterEach(() => {
    unmountCurrent();
    vi.unstubAllGlobals();
    delete (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT;
  });

  it('renders Landing with a skip link and main landmark', async () => {
    mounted = await mount(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/'] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, {
            path: '/',
            element: React.createElement(Landing),
          }),
        ),
      ),
    );

    const skipLink = mounted.container.querySelector('a.skip-link');
    expect(skipLink).not.toBeNull();
    expect(skipLink?.getAttribute('href')).toBe('#landing-main-content');

    const mainLandmark = mounted.container.querySelector('main#landing-main-content');
    expect(mainLandmark).not.toBeNull();

    const mobileToggle = mounted.container.querySelector('button[aria-controls="landing-mobile-nav"]');
    expect(mobileToggle).not.toBeNull();
    expect(mobileToggle?.getAttribute('aria-expanded')).toBe('false');
  });

  it('renders official Layout with accessible mobile drawer controls', async () => {
    mounted = await mount(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/app'] },
        React.createElement(
          Routes,
          null,
          React.createElement(
            Route,
            { path: '/app', element: React.createElement(Layout) },
            React.createElement(Route, {
              index: true,
              element: React.createElement('div', null, 'Dashboard Content'),
            }),
          ),
        ),
      ),
    );

    const menuToggle = mounted.container.querySelector('button[aria-controls="layout-mobile-drawer"]');
    expect(menuToggle).not.toBeNull();
    expect(menuToggle?.getAttribute('aria-expanded')).toBe('false');

    const notificationsButton = mounted.container.querySelector('button[aria-label="No notifications"]');
    expect(notificationsButton).not.toBeNull();
  });

  it('renders SuperAdminLayout with accessible mobile drawer controls', async () => {
    mounted = await mount(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/superadmin'] },
        React.createElement(
          Routes,
          null,
          React.createElement(
            Route,
            { path: '/superadmin', element: React.createElement(SuperAdminLayout) },
            React.createElement(Route, {
              index: true,
              element: React.createElement('div', null, 'Super Admin Content'),
            }),
          ),
        ),
      ),
    );

    const menuToggle = mounted.container.querySelector('button[aria-controls="superadmin-mobile-drawer"]');
    expect(menuToggle).not.toBeNull();
    expect(menuToggle?.getAttribute('aria-expanded')).toBe('false');

    const profileButton = mounted.container.querySelector('button[aria-label="Open profile actions"]');
    expect(profileButton).not.toBeNull();
  });
});
