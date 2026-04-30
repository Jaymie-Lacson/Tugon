import { cn } from './utils';

/* ══════════════════════════════════════════════════════════════════════
   PRODUCTION-GRADE SKELETON SYSTEM
   ─────────────────────────────────
   Inspired by:
   • Facebook/Meta  — Shimmer wave gradient sweep (left→right)
   • YouTube        — Content-aware shapes (circles, pill lines, thumbnails)
   • LinkedIn       — Graduated opacity & staggered fade-in
   • Stripe         — Smooth crossfade from skeleton → real content
   • Google         — prefers-reduced-motion compliance + aria-busy

   Key features:
   1. CSS-only shimmer via linear-gradient + @keyframes (zero JS overhead)
   2. aria-hidden + role="presentation" for screen-reader transparency
   3. prefers-reduced-motion automatically disables animation
   4. Staggered child animation delays for organic "content loading" feel
   5. Fade-in transition wrapper (SkeletonFadeIn) for smooth swap
   ══════════════════════════════════════════════════════════════════════ */

/* ── Base Skeleton Block ────────────────────────────────────────────── */
interface SkeletonProps extends Omit<React.ComponentProps<'div'>, 'style'> {
  /** Variant shape for contextual usage */
  variant?: 'rectangular' | 'circular' | 'rounded' | 'text';
  /** Animation delay for staggered groups (ms) */
  delay?: number;
}

function getSkeletonDelayClass(delay?: number): string | undefined {
  if (typeof delay !== 'number' || delay <= 0) return undefined;

  const normalizedDelay = Math.max(10, Math.min(400, Math.round(delay / 10) * 10));
  return `skeleton-delay-${normalizedDelay}`;
}

function Skeleton({
  className,
  variant = 'rectangular',
  delay,
  ...props
}: SkeletonProps) {
  const variantClass = {
    rectangular: 'rounded-md',
    circular: 'rounded-full',
    rounded: 'rounded-xl',
    text: 'rounded-[4px]',
  }[variant];

  return (
    <div
      data-slot="skeleton"
      role="presentation"
      aria-hidden="true"
      className={cn(
        'skeleton-shimmer',
        variantClass,
        getSkeletonDelayClass(delay),
        className,
      )}
      {...props}
    />
  );
}

/* ── Skeleton Group (aria-busy container + stagger) ─────────────────── */
interface SkeletonGroupProps extends React.ComponentProps<'div'> {
  /** Number of items — used to generate stagger delays */
  stagger?: number;
  /** Base stagger interval in ms (default 80) */
  staggerInterval?: number;
}

function SkeletonGroup({
  children,
  className,
  stagger: _stagger,
  staggerInterval: _staggerInterval,
  ...props
}: SkeletonGroupProps) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={cn('skeleton-group', className)}
      {...props}
    >
      {children}
    </div>
  );
}

/* ── Fade-In Wrapper (Stripe-style crossfade) ───────────────────────── */
interface SkeletonFadeInProps {
  /** Whether content has loaded */
  loaded: boolean;
  /** Skeleton fallback */
  skeleton: React.ReactNode;
  /** Real content */
  children: React.ReactNode;
  /** Fade duration in ms (default 220) */
  duration?: number;
  className?: string;
}

function SkeletonFadeIn({
  loaded,
  skeleton,
  children,
  duration = 220,
  className,
}: SkeletonFadeInProps) {
  const durationClass = duration <= 160
    ? 'skeleton-crossfade-duration-fast'
    : duration >= 300
      ? 'skeleton-crossfade-duration-slow'
      : 'skeleton-crossfade-duration-default';

  return (
    <div className={cn('relative', className)}>
      {/* Skeleton layer */}
      <div
        className={cn(
          'skeleton-crossfade-layer',
          durationClass,
          loaded ? 'skeleton-crossfade-hidden' : 'skeleton-crossfade-visible',
        )}
        aria-hidden
      >
        {skeleton}
      </div>

      {/* Content layer */}
      <div
        className={cn(
          'skeleton-crossfade-layer',
          durationClass,
          loaded ? 'skeleton-crossfade-visible' : 'skeleton-crossfade-hidden',
        )}
      >
        {children}
      </div>
    </div>
  );
}

export { Skeleton, SkeletonGroup, SkeletonFadeIn };
export type { SkeletonProps, SkeletonGroupProps, SkeletonFadeInProps };
