import { layout, prepare } from '@chenglou/pretext';
import { useEffect } from 'react';

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

function applyPretextAutoMeasurement() {
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
    let rafId = 0;

    const scheduleMeasure = () => {
      if (rafId) {
        return;
      }

      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        applyPretextAutoMeasurement();
      });
    };

    const root = document.getElementById('root');
    const mutationObserver = new MutationObserver(() => {
      scheduleMeasure();
    });

    if (root) {
      mutationObserver.observe(root, {
        childList: true,
        subtree: true,
        characterData: true,
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
