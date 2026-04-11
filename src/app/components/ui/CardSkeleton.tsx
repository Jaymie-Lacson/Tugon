import { Skeleton, SkeletonGroup } from './skeleton';
import { cn } from './utils';

interface CardSkeletonProps {
  /** Number of cards to render */
  count?: number;
  /** Number of text lines under title (for default/avatar variations) */
  lines?: number;
  /** Whether to show a top image thumbnail */
  showImage?: boolean;
  /** Whether to show a circular avatar */
  showAvatar?: boolean;
  /** 
   * Card layout variant:
   * - default: Standard vertical card (image + title + lines)
   * - stat: Horizontal dashboard KPI card
   * - compact: Dense horizontal list item
   */
  variant?: 'default' | 'stat' | 'compact';
  className?: string;
  gridClassName?: string;
  cardClassName?: string;
}

const lineWidths = ['w-full', 'w-5/6', 'w-3/4', 'w-2/3'];

export default function CardSkeleton({
  count = 3,
  lines = 2,
  showImage = true,
  showAvatar = false,
  variant = 'default',
  className,
  gridClassName,
  cardClassName,
}: CardSkeletonProps) {
  return (
    <SkeletonGroup
      className={cn(
        variant === 'default' && 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3',
        variant === 'stat' && 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4',
        variant === 'compact' && 'space-y-3',
        gridClassName,
        className,
      )}
    >
      {Array.from({ length: count }).map((_, index) => {
        // Base delay per card (staggers each card block)
        const baseDelay = index * 80;

        if (variant === 'stat') {
          return (
            <div
              key={`stat-skeleton-${index}`}
              className={cn('rounded-xl border border-border bg-card p-5', cardClassName)}
            >
              <div className="flex items-center gap-3 mb-3">
                <Skeleton variant="circular" className="h-10 w-10 shrink-0" delay={baseDelay} />
                <Skeleton variant="text" className="h-4 w-24" delay={baseDelay + 40} />
              </div>
              <Skeleton variant="text" className="h-8 w-20 mb-2" delay={baseDelay + 80} />
              <Skeleton variant="text" className="h-3 w-32" delay={baseDelay + 120} />
            </div>
          );
        }

        if (variant === 'compact') {
          return (
            <div
              key={`compact-skeleton-${index}`}
              className={cn('flex items-center gap-4 rounded-lg border border-border bg-card p-4', cardClassName)}
            >
              {showAvatar && (
                <Skeleton variant="circular" className="h-12 w-12 shrink-0" delay={baseDelay} />
              )}
              <div className="flex-1 space-y-2">
                <Skeleton variant="text" className="h-4 w-1/3" delay={baseDelay + 40} />
                <Skeleton variant="text" className="h-3 w-2/3" delay={baseDelay + 80} />
              </div>
              <Skeleton variant="rounded" className="h-8 w-20 shrink-0" delay={baseDelay + 120} />
            </div>
          );
        }

        return (
          <div
            key={`card-skeleton-${index}`}
            className={cn('rounded-xl border border-border bg-card p-4 flex flex-col', cardClassName)}
          >
            {showImage && (
              <Skeleton 
                variant="rectangular" 
                className="h-36 w-full shrink-0" 
                delay={baseDelay} 
              />
            )}

            <div className={cn('flex gap-3 flex-1', showImage ? 'mt-4' : '')}>
              {showAvatar && (
                <Skeleton 
                  variant="circular" 
                  className="h-10 w-10 shrink-0" 
                  delay={baseDelay + 40} 
                />
              )}
              
              <div className="space-y-2 flex-1 pt-1">
                <Skeleton 
                  variant="text" 
                  className="h-4 w-2/3 mb-3" 
                  delay={baseDelay + (!showImage && !showAvatar ? 0 : 80)} 
                />
                
                {Array.from({ length: lines }).map((__, lineIndex) => (
                  <Skeleton
                    key={`card-skeleton-${index}-line-${lineIndex}`}
                    variant="text"
                    className={cn('h-3', lineWidths[lineIndex % lineWidths.length])}
                    delay={baseDelay + 120 + (lineIndex * 40)}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </SkeletonGroup>
  );
}
