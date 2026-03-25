import { Skeleton } from './skeleton';
import { cn } from './utils';

interface TextSkeletonProps {
  rows?: number;
  title?: boolean;
  className?: string;
}

const textLineWidths = ['w-full', 'w-11/12', 'w-10/12', 'w-9/12', 'w-8/12'];

export default function TextSkeleton({ rows = 4, title = true, className }: TextSkeletonProps) {
  return (
    <div className={cn('rounded-xl border border-gray-200 bg-white p-5', className)}>
      {title ? <Skeleton className="mb-4 h-6 w-1/3 bg-gray-300" /> : null}

      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton
            key={`text-skeleton-line-${index}`}
            className={cn('h-4 bg-gray-200', textLineWidths[index % textLineWidths.length])}
          />
        ))}
      </div>
    </div>
  );
}
