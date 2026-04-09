import { Skeleton, SkeletonGroup } from './skeleton';
import { cn } from './utils';

interface TextSkeletonProps {
  rows?: number;
  /** Whether to show a prominent title line */
  title?: boolean;
  /** 
   * Text context variant:
   * - default: Standard paragraph
   * - article: Long-form content with occasional short lines
   * - hero: Large centered text blocks
   */
  variant?: 'default' | 'article' | 'hero';
  className?: string;
}

const textLineWidths = ['w-full', 'w-11/12', 'w-10/12', 'w-9/12', 'w-8/12'];

export default function TextSkeleton({ 
  rows = 4, 
  title = true, 
  variant = 'default',
  className 
}: TextSkeletonProps) {
  return (
    <SkeletonGroup className={cn(
      'rounded-xl border border-gray-200 bg-white p-5 space-y-4',
      variant === 'hero' && 'flex flex-col items-center text-center p-8',
      className
    )}>
      {title && (
        <Skeleton 
          variant="text" 
          className={cn(
            'h-6 mb-2',
            variant === 'hero' ? 'w-2/3 h-8' : 'w-1/3'
          )} 
          delay={0}
        />
      )}

      <div className={cn(
        'space-y-3 w-full',
        variant === 'hero' && 'flex flex-col items-center'
      )}>
        {Array.from({ length: rows }).map((_, index) => {
          // Add some organic variation for 'article' variant
          let widthClass = textLineWidths[index % textLineWidths.length];
          if (variant === 'article' && index > 0 && index % 4 === 0) {
            widthClass = 'w-1/2'; // Occasional short line
          }
          if (variant === 'hero') {
            widthClass = ['w-3/4', 'w-5/6', 'w-2/3'][index % 3];
          }

          return (
            <Skeleton
              key={`text-skeleton-line-${index}`}
              variant="text"
              className={cn('h-3.5', widthClass)}
              delay={40 + (index * 30)}
            />
          );
        })}
      </div>
    </SkeletonGroup>
  );
}
