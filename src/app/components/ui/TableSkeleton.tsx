import { Skeleton, SkeletonGroup } from './skeleton';
import { cn } from './utils';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  /** Whether to show a checkbox column as the first column */
  showCheckbox?: boolean;
  /** Whether to show an action button placeholder in the last column */
  showActions?: boolean;
  className?: string;
}

const columnWidths = ['w-24', 'w-32', 'w-20', 'w-28', 'w-16', 'w-36'];

export default function TableSkeleton({
  rows = 5,
  columns = 4,
  showHeader = true,
  showCheckbox = false,
  showActions = false,
  className,
}: TableSkeletonProps) {
  // Generate a stable list of widths based on column count to maintain alignment
  const widths = Array.from({ length: columns }).map(
    (_, i) => columnWidths[i % columnWidths.length]
  );

  return (
    <SkeletonGroup 
      className={cn('overflow-x-auto rounded-xl border border-border bg-card w-full', className)}
    >
      <table className="min-w-full border-collapse">
        {showHeader && (
          <thead className="border-b border-border bg-muted">
            <tr>
              {showCheckbox && (
                <th className="px-4 py-3 w-10">
                  <Skeleton variant="rounded" className="h-4 w-4" delay={0} />
                </th>
              )}
              
              {Array.from({ length: columns }).map((_, colIndex) => (
                <th key={`th-${colIndex}`} className="px-4 py-3 text-left">
                  <Skeleton
                    variant="text"
                    className={cn('h-3.5', widths[colIndex])}
                    delay={colIndex * 30}
                  />
                </th>
              ))}

              {showActions && (
                <th className="px-4 py-3 w-16 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
        )}

        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => {
            const rowDelay = (rowIndex + 1) * 60; // Stagger each row

            return (
              <tr 
                key={`tr-${rowIndex}`} 
                className="border-b border-border/50 last:border-b-0"
              >
                {showCheckbox && (
                  <td className="px-4 py-3 text-left">
                    <Skeleton variant="rounded" className="h-4 w-4" delay={rowDelay} />
                  </td>
                )}

                {Array.from({ length: columns }).map((__, colIndex) => {
                  // Make the first data column look like a title/identifier (longer)
                  const isTitle = colIndex === 0;
                  const cellWidth = isTitle ? 'w-10/12' : widths[colIndex];
                  
                  // Vary width slightly for organic feel
                  const widthVariant = !isTitle && rowIndex % 3 === 0 ? 'w-3/4' : cellWidth;

                  return (
                    <td key={`td-${rowIndex}-${colIndex}`} className="px-4 py-3">
                      <Skeleton
                        variant="text"
                        className={cn('h-3.5', widthVariant)}
                        delay={rowDelay + (colIndex * 20)}
                      />
                    </td>
                  );
                })}

                {showActions && (
                  <td className="px-4 py-3 text-right">
                    <Skeleton variant="circular" className="h-8 w-8 ml-auto inline-block" delay={rowDelay + 100} />
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </SkeletonGroup>
  );
}
