import { Skeleton } from './skeleton';
import { cn } from './utils';

interface CardSkeletonProps {
  count?: number;
  lines?: number;
  showImage?: boolean;
  className?: string;
  gridClassName?: string;
  cardClassName?: string;
}

const lineWidths = ['w-full', 'w-5/6', 'w-3/4', 'w-2/3'];

export default function CardSkeleton({
  count = 3,
  lines = 2,
  showImage = true,
  className,
  gridClassName,
  cardClassName,
}: CardSkeletonProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3',
        gridClassName,
        className,
      )}
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`card-skeleton-${index}`}
          className={cn('rounded-xl border border-gray-200 bg-white p-4', cardClassName)}
        >
          {showImage ? <Skeleton className="h-36 w-full rounded-lg bg-gray-200" /> : null}

          <div className={cn('space-y-2', showImage ? 'mt-4' : '')}>
            <Skeleton className="h-4 w-2/3 bg-gray-300" />
            {Array.from({ length: lines }).map((__, lineIndex) => (
              <Skeleton
                key={`card-skeleton-${index}-line-${lineIndex}`}
                className={cn('h-3.5 bg-gray-200', lineWidths[lineIndex % lineWidths.length])}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
