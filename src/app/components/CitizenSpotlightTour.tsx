import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Sparkles, X } from 'lucide-react';

export interface SpotlightStep {
  selector: string;
  title: string;
  body: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  padding?: number;
}

interface CitizenSpotlightTourProps {
  steps: SpotlightStep[];
  open: boolean;
  onClose: (info: { completed: boolean }) => void;
  storageKey?: string;
  labels?: {
    skip?: string;
    back?: string;
    next?: string;
    done?: string;
    stepOf?: (current: number, total: number) => string;
    targetMissing?: string;
  };
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const TOOLTIP_MAX_WIDTH = 360;
const TOOLTIP_GAP = 14;
const ESTIMATED_TOOLTIP_HEIGHT = 220;

const DEFAULT_LABELS: Required<NonNullable<CitizenSpotlightTourProps['labels']>> = {
  skip: 'Skip',
  back: 'Back',
  next: 'Next',
  done: 'Got it',
  stepOf: (c, t) => `Step ${c} of ${t}`,
  targetMissing: 'This area is not visible right now.',
};

export function CitizenSpotlightTour({
  steps,
  open,
  onClose,
  storageKey,
  labels,
}: CitizenSpotlightTourProps) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });

  const L = { ...DEFAULT_LABELS, ...(labels ?? {}) };
  const step = steps[index];

  const measure = useCallback(() => {
    if (!step) return;
    setViewport({ w: window.innerWidth, h: window.innerHeight });
    const el = document.querySelector(step.selector) as HTMLElement | null;
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step]);

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open || !step) return;
    measure();
    const el = document.querySelector(step.selector) as HTMLElement | null;
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  }, [open, index, measure, step]);

  useEffect(() => {
    if (!open) return;
    const handle = () => measure();
    window.addEventListener('resize', handle);
    window.addEventListener('scroll', handle, true);
    const interval = window.setInterval(handle, 250);
    return () => {
      window.removeEventListener('resize', handle);
      window.removeEventListener('scroll', handle, true);
      window.clearInterval(interval);
    };
  }, [open, measure]);

  const finish = useCallback(
    (completed: boolean) => {
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, '1');
        } catch {
          /* ignore storage failures (private mode, quota) */
        }
      }
      onClose({ completed });
    },
    [onClose, storageKey],
  );

  const goNext = useCallback(() => {
    setIndex((i) => {
      if (i < steps.length - 1) return i + 1;
      finish(true);
      return i;
    });
  }, [finish, steps.length]);

  const goBack = useCallback(() => {
    setIndex((i) => (i > 0 ? i - 1 : i));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish(false);
      else if (e.key === 'ArrowRight' || e.key === 'Enter') goNext();
      else if (e.key === 'ArrowLeft') goBack();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, finish, goNext, goBack]);

  if (!open || !step) return null;

  const padding = step.padding ?? 8;
  const spotRect: Rect | null = rect
    ? {
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      }
    : null;

  const tooltipWidth = Math.min(TOOLTIP_MAX_WIDTH, viewport.w - 24);
  let ttTop = 0;
  let ttLeft = 0;

  if (spotRect) {
    const requested = step.placement ?? 'auto';
    let placement: 'top' | 'bottom' | 'left' | 'right' = 'bottom';
    if (requested === 'auto') {
      const spaceBelow = viewport.h - (spotRect.top + spotRect.height);
      const spaceAbove = spotRect.top;
      placement = spaceBelow >= ESTIMATED_TOOLTIP_HEIGHT + TOOLTIP_GAP || spaceBelow >= spaceAbove ? 'bottom' : 'top';
    } else {
      placement = requested;
    }

    if (placement === 'bottom') {
      ttTop = spotRect.top + spotRect.height + TOOLTIP_GAP;
      ttLeft = spotRect.left + spotRect.width / 2 - tooltipWidth / 2;
    } else if (placement === 'top') {
      ttTop = spotRect.top - TOOLTIP_GAP - ESTIMATED_TOOLTIP_HEIGHT;
      ttLeft = spotRect.left + spotRect.width / 2 - tooltipWidth / 2;
    } else if (placement === 'right') {
      ttTop = spotRect.top + spotRect.height / 2 - ESTIMATED_TOOLTIP_HEIGHT / 2;
      ttLeft = spotRect.left + spotRect.width + TOOLTIP_GAP;
    } else {
      ttTop = spotRect.top + spotRect.height / 2 - ESTIMATED_TOOLTIP_HEIGHT / 2;
      ttLeft = spotRect.left - tooltipWidth - TOOLTIP_GAP;
    }
  } else {
    ttTop = viewport.h / 2 - ESTIMATED_TOOLTIP_HEIGHT / 2;
    ttLeft = viewport.w / 2 - tooltipWidth / 2;
  }

  ttLeft = Math.max(12, Math.min(viewport.w - tooltipWidth - 12, ttLeft));
  ttTop = Math.max(12, Math.min(viewport.h - ESTIMATED_TOOLTIP_HEIGHT - 12, ttTop));

  const isLast = index === steps.length - 1;

  const node = (
    <div
      className="fixed inset-0 z-[5000]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="citizen-tour-title"
      aria-describedby="citizen-tour-body"
    >
      <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
        <defs>
          <mask id="citizen-tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spotRect && (
              <rect
                x={spotRect.left}
                y={spotRect.top}
                width={spotRect.width}
                height={spotRect.height}
                rx="14"
                ry="14"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.74)"
          mask="url(#citizen-tour-mask)"
        />
        {spotRect && (
          <rect
            x={spotRect.left}
            y={spotRect.top}
            width={spotRect.width}
            height={spotRect.height}
            rx="14"
            ry="14"
            fill="none"
            stroke="rgba(96, 165, 250, 0.9)"
            strokeWidth="2"
          />
        )}
      </svg>

      <div
        style={{ top: ttTop, left: ttLeft, width: tooltipWidth }}
        className="absolute rounded-2xl border border-[var(--outline-variant)] bg-card p-5 shadow-[0_24px_60px_rgba(0,0,0,0.4)]"
      >
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
            <Sparkles size={12} />
            {L.stepOf(index + 1, steps.length)}
          </div>
          <button
            type="button"
            onClick={() => finish(false)}
            aria-label={L.skip}
            className="cursor-pointer rounded-md border-0 bg-transparent p-1 text-muted-foreground hover:text-foreground"
          >
            <X size={14} />
          </button>
        </div>

        <h2
          id="citizen-tour-title"
          className="mb-1.5 text-[18px] font-extrabold leading-tight tracking-tight text-foreground"
        >
          {step.title}
        </h2>
        <p id="citizen-tour-body" className="mb-2 text-[13px] leading-relaxed text-muted-foreground">
          {step.body}
        </p>
        {!spotRect && (
          <p className="mb-2 rounded-md bg-[var(--surface-container-low)] px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground">
            {L.targetMissing}
          </p>
        )}

        <div className="mb-4 mt-3 flex items-center gap-1.5" aria-hidden="true">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`block h-1.5 rounded-full transition-all duration-200 ${
                i === index ? 'w-6 bg-primary' : 'w-1.5 bg-border'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => finish(false)}
            className="cursor-pointer border-0 bg-transparent text-[12px] font-semibold text-muted-foreground hover:text-foreground"
          >
            {L.skip}
          </button>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <button
                type="button"
                onClick={goBack}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border bg-transparent px-3 py-2 text-[12px] font-bold text-foreground hover:bg-muted/50"
              >
                <ChevronLeft size={14} /> {L.back}
              </button>
            )}
            <button
              type="button"
              onClick={goNext}
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border-0 bg-primary px-3.5 py-2 text-[12px] font-bold text-white hover:bg-primary/90"
            >
              {isLast ? (
                L.done
              ) : (
                <>
                  {L.next} <ChevronRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
