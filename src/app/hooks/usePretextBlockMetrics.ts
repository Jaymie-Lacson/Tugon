import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type UsePretextBlockMetricsOptions = {
  font: string;
  lineHeight: number;
  maxLines?: number;
  whiteSpace?: 'normal' | 'pre-wrap';
  wordBreak?: 'normal' | 'keep-all';
};

type UsePretextBlockMetricsResult<T extends HTMLElement> = {
  ref: (node: T | null) => void;
  minHeight: string | undefined;
};

type PretextModule = typeof import('@chenglou/pretext');
let pretextModulePromise: Promise<PretextModule> | null = null;

function loadPretextModule(): Promise<PretextModule> {
  pretextModulePromise ??= import('@chenglou/pretext');
  return pretextModulePromise;
}

export function usePretextBlockMetrics<T extends HTMLElement>(
  text: string,
  {
    font,
    lineHeight,
    maxLines,
    whiteSpace = 'normal',
    wordBreak = 'normal',
  }: UsePretextBlockMetricsOptions,
): UsePretextBlockMetricsResult<T> {
  const elementRef = useRef<T | null>(null);
  const [maxWidth, setMaxWidth] = useState(0);
  const [pretextModule, setPretextModule] = useState<PretextModule | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadPretextModule().then((module) => {
      if (!cancelled) {
        setPretextModule(module);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const prepared = useMemo(
    () => (pretextModule ? pretextModule.prepare(text || '', font, { whiteSpace, wordBreak }) : null),
    [font, pretextModule, text, whiteSpace, wordBreak],
  );

  const updateWidth = useCallback(() => {
    const node = elementRef.current;
    if (!node) {
      return;
    }

    const width = Math.max(0, node.clientWidth);
    setMaxWidth((current) => (current === width ? current : width));
  }, []);

  const ref = useCallback((node: T | null) => {
    elementRef.current = node;
    if (node) {
      const width = Math.max(0, node.clientWidth);
      setMaxWidth((current) => (current === width ? current : width));
    }
  }, []);

  useEffect(() => {
    const node = elementRef.current;
    if (!node || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(() => {
      updateWidth();
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, [updateWidth]);

  const minHeight = useMemo(() => {
    const normalizedText = text.trim();
    if (!normalizedText || maxWidth <= 0 || !prepared || !pretextModule) {
      return undefined;
    }

    const result = pretextModule.layout(prepared, maxWidth, lineHeight);
    const boundedHeight =
      typeof maxLines === 'number' ? Math.min(result.height, lineHeight * maxLines) : result.height;

    return `${Math.ceil(boundedHeight)}px`;
  }, [lineHeight, maxLines, maxWidth, prepared, pretextModule, text]);

  return { ref, minHeight };
}
