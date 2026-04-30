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

type NavigatorWithConnection = Navigator & {
  connection?: {
    saveData?: boolean;
  };
};

type PretextModule = typeof import('@chenglou/pretext');
let pretextModulePromise: Promise<PretextModule> | null = null;

function loadPretextModule(): Promise<PretextModule> {
  pretextModulePromise ??= import('@chenglou/pretext');
  return pretextModulePromise;
}

function shouldEnablePretextMetrics(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const saveData = (navigator as NavigatorWithConnection).connection?.saveData === true;
  const isMobileViewport = window.matchMedia('(max-width: 1024px)').matches;
  return !saveData && !isMobileViewport;
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
  const [metricsEnabled, setMetricsEnabled] = useState<boolean>(() => shouldEnablePretextMetrics());

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mobileQuery = window.matchMedia('(max-width: 1024px)');
    const updateEnabled = () => {
      setMetricsEnabled(shouldEnablePretextMetrics());
    };

    updateEnabled();
    mobileQuery.addEventListener('change', updateEnabled);
    return () => {
      mobileQuery.removeEventListener('change', updateEnabled);
    };
  }, []);

  useEffect(() => {
    if (!metricsEnabled) {
      setPretextModule(null);
      return;
    }

    let cancelled = false;

    loadPretextModule().then((module) => {
      if (!cancelled) {
        setPretextModule(module);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [metricsEnabled]);

  const prepared = useMemo(
    () =>
      metricsEnabled && pretextModule
        ? pretextModule.prepare(text || '', font, { whiteSpace, wordBreak })
        : null,
    [font, metricsEnabled, pretextModule, text, whiteSpace, wordBreak],
  );

  const updateWidth = useCallback(() => {
    if (!metricsEnabled) {
      return;
    }

    const node = elementRef.current;
    if (!node) {
      return;
    }

    const width = Math.max(0, node.clientWidth);
    setMaxWidth((current) => (current === width ? current : width));
  }, [metricsEnabled]);

  const ref = useCallback((node: T | null) => {
    elementRef.current = node;
    if (node && metricsEnabled) {
      const width = Math.max(0, node.clientWidth);
      setMaxWidth((current) => (current === width ? current : width));
    }
  }, [metricsEnabled]);

  useEffect(() => {
    if (!metricsEnabled) {
      return;
    }

    const node = elementRef.current;
    if (!node || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(() => {
      updateWidth();
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, [metricsEnabled, updateWidth]);

  const minHeight = useMemo(() => {
    const normalizedText = text.trim();
    if (!metricsEnabled || !normalizedText || maxWidth <= 0 || !prepared || !pretextModule) {
      return undefined;
    }

    const result = pretextModule.layout(prepared, maxWidth, lineHeight);
    const boundedHeight =
      typeof maxLines === 'number' ? Math.min(result.height, lineHeight * maxLines) : result.height;

    return `${Math.ceil(boundedHeight)}px`;
  }, [lineHeight, maxLines, maxWidth, metricsEnabled, prepared, pretextModule, text]);

  return { ref, minHeight };
}
