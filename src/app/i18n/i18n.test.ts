// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { TranslationProvider } from './TranslationProvider';
import { useTranslation } from './useTranslation';
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY } from './types';
import { en } from './translations/en';
import { fil } from './translations/fil';

const act = React.act;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  localStorage.clear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function TestConsumer({ translationKey, params }: { translationKey: string; params?: Record<string, string | number> }) {
  const { t, locale, setLocale } = useTranslation();
  return React.createElement('div', null,
    React.createElement('span', { 'data-testid': 'output' }, t(translationKey, params)),
    React.createElement('span', { 'data-testid': 'locale' }, locale),
    React.createElement('button', {
      'data-testid': 'switch-fil',
      onClick: () => setLocale('fil'),
    }, 'FIL'),
    React.createElement('button', {
      'data-testid': 'switch-en',
      onClick: () => setLocale('en'),
    }, 'EN'),
  );
}

function renderWithProvider(key: string, params?: Record<string, string | number>) {
  act(() => {
    root.render(
      React.createElement(TranslationProvider, null,
        React.createElement(TestConsumer, { translationKey: key, params }),
      ),
    );
  });
}

describe('i18n', () => {
  it('defaults to English locale', () => {
    renderWithProvider('common.appName');
    expect(container.querySelector('[data-testid="locale"]')!.textContent).toBe('en');
  });

  it('translates a known key in English', () => {
    renderWithProvider('common.appName');
    expect(container.querySelector('[data-testid="output"]')!.textContent).toBe(en['common.appName']);
  });

  it('switches to Filipino and translates', () => {
    renderWithProvider('common.appName');
    act(() => {
      container.querySelector<HTMLButtonElement>('[data-testid="switch-fil"]')!.click();
    });
    expect(container.querySelector('[data-testid="locale"]')!.textContent).toBe('fil');
    expect(container.querySelector('[data-testid="output"]')!.textContent).toBe(fil['common.appName']);
  });

  it('persists locale choice in localStorage', () => {
    renderWithProvider('common.appName');
    act(() => {
      container.querySelector<HTMLButtonElement>('[data-testid="switch-fil"]')!.click();
    });
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('fil');
  });

  it('reads persisted locale on mount', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'fil');
    renderWithProvider('common.appName');
    expect(container.querySelector('[data-testid="locale"]')!.textContent).toBe('fil');
    expect(container.querySelector('[data-testid="output"]')!.textContent).toBe(fil['common.appName']);
  });

  it('falls back to English for missing Filipino key', () => {
    renderWithProvider('__test_only_en_key__');
    act(() => {
      container.querySelector<HTMLButtonElement>('[data-testid="switch-fil"]')!.click();
    });
    // If the key doesn't exist in fil, it should fall back to en, then to the key itself
    const enValue = en['__test_only_en_key__'];
    const output = container.querySelector('[data-testid="output"]')!.textContent;
    if (enValue) {
      expect(output).toBe(enValue);
    } else {
      // Falls back to key name when neither locale has it
      expect(output).toBe('__test_only_en_key__');
    }
  });

  it('returns the key itself when no translation exists in any locale', () => {
    renderWithProvider('nonexistent.key.that.does.not.exist');
    expect(container.querySelector('[data-testid="output"]')!.textContent).toBe('nonexistent.key.that.does.not.exist');
  });

  it('interpolates parameters', () => {
    renderWithProvider('common.welcome', { name: 'Mikell' });
    const output = container.querySelector('[data-testid="output"]')!.textContent;
    expect(output).toContain('Mikell');
  });

  it('includes translations for all incident types', () => {
    const incidentTypes = ['Pollution', 'Noise', 'Crime', 'Road Hazard', 'Other'];
    for (const type of incidentTypes) {
      const key = `incident.type.${type.toLowerCase().replace(/\s+/g, '_')}`;
      expect(en[key]).toBeTruthy();
      expect(fil[key]).toBeTruthy();
    }
  });

  it('includes translations for all ticket statuses', () => {
    const statuses = ['Submitted', 'Under Review', 'In Progress', 'Resolved', 'Closed', 'Unresolvable'];
    for (const status of statuses) {
      const key = `status.${status.toLowerCase().replace(/\s+/g, '_')}`;
      expect(en[key]).toBeTruthy();
      expect(fil[key]).toBeTruthy();
    }
  });

  it('sets document lang attribute on locale change', () => {
    renderWithProvider('common.appName');
    expect(document.documentElement.lang).toBe('en');
    act(() => {
      container.querySelector<HTMLButtonElement>('[data-testid="switch-fil"]')!.click();
    });
    expect(document.documentElement.lang).toBe('fil');
  });
});
