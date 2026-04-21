import { useEffect } from 'react';

// Pretext is heavy (~25 KB gzip) and only performs measurements AFTER first
// paint. Loading it via dynamic import keeps it out of the initial bundle.
type PretextModule = typeof import('@chenglou/pretext');
let pretextModulePromise: Promise<PretextModule> | null = null;

function loadPretextModule(): Promise<PretextModule> {
  pretextModulePromise ??= import('@chenglou/pretext');
  return pretextModulePromise;
}

type NavigatorWithConnection = Navigator & {
  connection?: {
    saveData?: boolean;
  };
};

function shouldEnablePretextAutoMeasurement(): boolean {
  const saveData = (navigator as NavigatorWithConnection).connection?.saveData === true;
  const isMobileViewport = window.matchMedia('(max-width: 1024px)').matches;
  return !saveData && !isMobileViewport;
}

const TARGET_SELECTOR = [
  '#root h1',
  '#root h2',
  '#root h3',
  '#root h4',
  '#root h5',
  '#root h6',
  '#root p',
  '#root li',
  '#root label',
  '#root figcaption',
  '#root blockquote',
  '#root td',
  '#root th',
  '#root dt',
  '#root dd',
  '#root legend',
].join(', ');

function parseLineHeight(lineHeight: string, fontSize: string): number {
  const parsedLineHeight = Number.parseFloat(lineHeight);
  if (Number.isFinite(parsedLineHeight) && parsedLineHeight > 0) {
    return parsedLineHeight;
  }

  const parsedFontSize = Number.parseFloat(fontSize);
  if (Number.isFinite(parsedFontSize) && parsedFontSize > 0) {
    return parsedFontSize * 1.4;
  }

  return 20;
}

function resolveCanvasFont(style: CSSStyleDeclaration): string {
  if (style.font && style.font.trim() && style.font !== 'normal normal normal normal 16px / normal serif') {
    return style.font;
  }

  const fontStyle = style.fontStyle || 'normal';
  const fontWeight = style.fontWeight || '400';
  const fontSize = style.fontSize || '16px';
  const fontFamily = style.fontFamily || 'sans-serif';
  return `${fontStyle} ${fontWeight} ${fontSize} ${fontFamily}`;
}

function applyPretextAutoMeasurement(pretextModule: PretextModule) {
  const { layout, prepare } = pretextModule;
  const elements = document.querySelectorAll<HTMLElement>(TARGET_SELECTOR);

  for (const element of elements) {
    if (element.dataset.pretextOptOut === 'true' || element.closest('[data-pretext-opt-out="true"]')) {
      continue;
    }

    if (element.getAttribute('aria-hidden') === 'true' || element.isContentEditable) {
      continue;
    }

    const rawText = element.textContent ?? '';
    const text = rawText.trim();
    if (!text) {
      continue;
    }

    const width = Math.max(0, element.clientWidth);
    if (width <= 0) {
      continue;
    }

    const style = window.getComputedStyle(element);
    if (style.display === 'inline') {
      continue;
    }

    const font = resolveCanvasFont(style);
    const lineHeight = parseLineHeight(style.lineHeight, style.fontSize);
    const whiteSpace = style.whiteSpace === 'pre-wrap' ? 'pre-wrap' : 'normal';
    const wordBreak = style.wordBreak === 'keep-all' ? 'keep-all' : 'normal';

    const prepared = prepare(text, font, { whiteSpace, wordBreak });
    const metrics = layout(prepared, width, lineHeight);
    const minHeight = `${Math.ceil(metrics.height)}px`;

    if (element.style.minHeight !== minHeight) {
      element.style.minHeight = minHeight;
    }
  }
}

export default function PretextAutoTextBridge() {
  useEffect(() => {
    if (typeof window === 'undefined' || !shouldEnablePretextAutoMeasurement()) {
      return;
    }

    let rafId = 0;
    let timeoutId = 0;
    let cancelled = false;

    const runMeasure = () => {
      loadPretextModule().then((pretextModule) => {
        if (cancelled) {
          return;
        }
        applyPretextAutoMeasurement(pretextModule);
      });
    };

    const scheduleMeasure = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }

      timeoutId = window.setTimeout(() => {
        timeoutId = 0;
        if (rafId) {
          window.cancelAnimationFrame(rafId);
        }
        rafId = window.requestAnimationFrame(() => {
          rafId = 0;
          runMeasure();
        });
      }, 100);
    };

    const root = document.getElementById('root');
    const mutationObserver = new MutationObserver(() => {
      scheduleMeasure();
    });

    if (root) {
      mutationObserver.observe(root, {
        childList: true,
        subtree: true,
      });
    }

    const viewport = window.visualViewport;
    window.addEventListener('resize', scheduleMeasure);
    window.addEventListener('orientationchange', scheduleMeasure);
    viewport?.addEventListener('resize', scheduleMeasure);

    if (document.fonts?.addEventListener) {
      document.fonts.addEventListener('loadingdone', scheduleMeasure);
    }

    scheduleMeasure();

    return () => {
      cancelled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }

      mutationObserver.disconnect();
      window.removeEventListener('resize', scheduleMeasure);
      window.removeEventListener('orientationchange', scheduleMeasure);
      viewport?.removeEventListener('resize', scheduleMeasure);
      if (document.fonts?.removeEventListener) {
        document.fonts.removeEventListener('loadingdone', scheduleMeasure);
      }
    };
  }, []);

  return null;
}
