import { Skeleton } from './skeleton';
import { cn } from './utils';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
}

const columnWidths = ['w-24', 'w-20', 'w-16', 'w-28', 'w-14'];

export default function TableSkeleton({
  rows = 5,
  columns = 4,
  showHeader = true,
  className,
}: TableSkeletonProps) {
  return (
    <div className={cn('overflow-x-auto rounded-xl border border-gray-200 bg-white', className)}>
      <table className="min-w-full border-collapse">
        {showHeader ? (
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              {Array.from({ length: columns }).map((_, columnIndex) => (
                <th key={`table-skeleton-header-${columnIndex}`} className="px-4 py-3 text-left">
                  <Skeleton
                    className={cn('h-4 bg-gray-300', columnWidths[columnIndex % columnWidths.length])}
                  />
                </th>
              ))}
            </tr>
          </thead>
        ) : null}

        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={`table-skeleton-row-${rowIndex}`} className="border-b border-gray-100 last:border-b-0">
              {Array.from({ length: columns }).map((__, columnIndex) => (
                <td key={`table-skeleton-cell-${rowIndex}-${columnIndex}`} className="px-4 py-3">
                  <Skeleton
                    className={cn(
                      'h-4 bg-gray-200',
                      columnIndex === 0
                        ? 'w-11/12'
                        : columnWidths[(rowIndex + columnIndex) % columnWidths.length],
                    )}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
