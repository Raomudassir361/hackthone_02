import React from 'react';
import { cn } from '../../lib/utils';
import { Skeleton } from './Skeleton';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (item: T) => void;
  className?: string;
  pagination?: {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
}

export function DataTable<T extends { id?: string | number; _id?: string | number }>({
  columns,
  data,
  isLoading,
  emptyTitle = 'No records found',
  emptyDescription = 'There is currently no data to display.',
  onRowClick,
  className,
  pagination,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className={cn('w-full bg-surface rounded-card border border-border p-4', className)}>
        <div className="space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} className={className} />;
  }

  return (
    <div className={cn('w-full bg-surface rounded-card border border-border overflow-hidden shadow-sm', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-navy">
          <thead className="bg-bg text-xs font-semibold uppercase tracking-wider text-muted border-b border-border">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={cn('px-4 py-3', col.className)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((row, idx) => {
              const rowKey = row.id || row._id || idx;
              return (
                <tr
                  key={rowKey}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={cn(
                    'transition-colors hover:bg-bg/50',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn('px-4 py-3.5', col.className)}>
                      {col.render
                        ? col.render(row)
                        : (row as Record<string, unknown>)[col.key] != null
                        ? String((row as Record<string, unknown>)[col.key])
                        : '—'}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="px-4 py-3 bg-bg/40 border-t border-border flex items-center justify-between text-xs text-muted">
          <span>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-2.5 py-1 rounded border border-border bg-surface text-navy disabled:opacity-40 disabled:cursor-not-allowed hover:bg-bg"
            >
              Previous
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-2.5 py-1 rounded border border-border bg-surface text-navy disabled:opacity-40 disabled:cursor-not-allowed hover:bg-bg"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
