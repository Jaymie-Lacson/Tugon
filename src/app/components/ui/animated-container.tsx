import * as React from "react";
import { cn } from "./utils";

/* ══════════════════════════════════════════════════════════════════════
   ANIMATED CONTAINER SYSTEM
   ─────────────────────────
   Provides entrance animations for page content with staggered children.
   Follows TUGON's "calm confidence" aesthetic — smooth, purposeful motion.

   Usage:
     <AnimatedContainer>
       <AnimatedItem>First card</AnimatedItem>
       <AnimatedItem>Second card (enters 50ms later)</AnimatedItem>
     </AnimatedContainer>

   Or with manual stagger control:
     <AnimatedItem delay={0}>Immediate</AnimatedItem>
     <AnimatedItem delay={100}>100ms delay</AnimatedItem>
   ══════════════════════════════════════════════════════════════════════ */

type AnimationVariant =
  | "fade-in"
  | "fade-in-up"
  | "fade-in-down"
  | "fade-in-scale"
  | "slide-in-right"
  | "slide-in-left";

interface AnimatedContainerProps extends React.ComponentProps<"div"> {
  /** Delay between each child animation in ms (default: 50) */
  staggerDelay?: number;
  /** Starting delay before first animation in ms (default: 0) */
  initialDelay?: number;
  /** Animation variant for children (default: "fade-in-up") */
  variant?: AnimationVariant;
  /** Whether to animate (set false to disable animations) */
  animate?: boolean;
}

/**
 * Container that automatically staggers entrance animations for children.
 * Wrap your page sections or card grids with this for choreographed entrances.
 */
function AnimatedContainer({
  children,
  className,
  staggerDelay = 50,
  initialDelay = 0,
  variant = "fade-in-up",
  animate = true,
  ...props
}: AnimatedContainerProps) {
  if (!animate) {
    return (
      <div className={className} {...props}>
        {children}
      </div>
    );
  }

  return (
    <div className={className} {...props}>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;

        const delay = initialDelay + index * staggerDelay;

        // If child is AnimatedItem, pass the delay
        if (child.type === AnimatedItem) {
          return React.cloneElement(child as React.ReactElement<AnimatedItemProps>, {
            delay: child.props.delay ?? delay,
            variant: child.props.variant ?? variant,
          });
        }

        // Otherwise wrap in AnimatedItem
        return (
          <AnimatedItem delay={delay} variant={variant}>
            {child}
          </AnimatedItem>
        );
      })}
    </div>
  );
}

interface AnimatedItemProps extends React.ComponentProps<"div"> {
  /** Delay before animation starts in ms */
  delay?: number;
  /** Animation variant (default: "fade-in-up") */
  variant?: AnimationVariant;
  /** Whether animation has played (for controlled scenarios) */
  animated?: boolean;
}

/**
 * Single animated item. Can be used standalone or within AnimatedContainer.
 */
function AnimatedItem({
  children,
  className,
  delay = 0,
  variant = "fade-in-up",
  animated,
  style,
  ...props
}: AnimatedItemProps) {
  const animationClass = `animate-${variant}`;

  return (
    <div
      className={cn(animationClass, className)}
      style={{
        animationDelay: `${delay}ms`,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

interface AnimatedListProps extends React.ComponentProps<"ul"> {
  /** Delay between each item animation in ms (default: 50) */
  staggerDelay?: number;
  /** Starting delay before first animation in ms (default: 0) */
  initialDelay?: number;
  /** Animation variant for items (default: "fade-in-up") */
  variant?: AnimationVariant;
}

/**
 * Animated list with staggered item entrances.
 */
function AnimatedList({
  children,
  className,
  staggerDelay = 50,
  initialDelay = 0,
  variant = "fade-in-up",
  ...props
}: AnimatedListProps) {
  return (
    <ul className={className} {...props}>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;

        const delay = initialDelay + index * staggerDelay;
        const animationClass = `animate-${variant}`;

        return React.cloneElement(child as React.ReactElement, {
          className: cn(animationClass, child.props.className),
          style: {
            ...child.props.style,
            animationDelay: `${delay}ms`,
          },
        });
      })}
    </ul>
  );
}

interface AnimatedGridProps extends React.ComponentProps<"div"> {
  /** Delay between each item animation in ms (default: 40) */
  staggerDelay?: number;
  /** Starting delay before first animation in ms (default: 0) */
  initialDelay?: number;
  /** Animation variant for items (default: "fade-in-scale") */
  variant?: AnimationVariant;
}

/**
 * Animated grid with staggered item entrances.
 * Great for card grids and dashboard layouts.
 */
function AnimatedGrid({
  children,
  className,
  staggerDelay = 40,
  initialDelay = 0,
  variant = "fade-in-scale",
  ...props
}: AnimatedGridProps) {
  return (
    <div className={className} {...props}>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;

        const delay = initialDelay + index * staggerDelay;
        const animationClass = `animate-${variant}`;

        return React.cloneElement(child as React.ReactElement, {
          className: cn(animationClass, child.props.className),
          style: {
            ...child.props.style,
            animationDelay: `${delay}ms`,
          },
        });
      })}
    </div>
  );
}

interface FadeInProps extends React.ComponentProps<"div"> {
  /** Delay before animation starts in ms */
  delay?: number;
  /** Direction to fade in from */
  direction?: "up" | "down" | "left" | "right" | "none" | "scale";
}

/**
 * Simple fade-in wrapper. Convenience component for single elements.
 */
function FadeIn({
  children,
  className,
  delay = 0,
  direction = "up",
  style,
  ...props
}: FadeInProps) {
  const variantMap: Record<string, AnimationVariant> = {
    up: "fade-in-up",
    down: "fade-in-down",
    left: "slide-in-left",
    right: "slide-in-right",
    none: "fade-in",
    scale: "fade-in-scale",
  };

  const animationClass = `animate-${variantMap[direction]}`;

  return (
    <div
      className={cn(animationClass, className)}
      style={{
        animationDelay: `${delay}ms`,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export {
  AnimatedContainer,
  AnimatedItem,
  AnimatedList,
  AnimatedGrid,
  FadeIn,
};
export type {
  AnimatedContainerProps,
  AnimatedItemProps,
  AnimatedListProps,
  AnimatedGridProps,
  FadeInProps,
  AnimationVariant,
};
