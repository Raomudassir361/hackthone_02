import React from 'react';
import { Card } from './Card';
import { Skeleton } from './Skeleton';
import { cn } from '../../lib/utils';

export interface KpiCardProps {
  label: string;
  value: string | number;
  hint?: string;
  delta?: {
    value: string;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function KpiCard({
  label,
  value,
  hint,
  delta,
  icon,
  isLoading,
  className,
}: KpiCardProps) {
  if (isLoading) {
    return (
      <Card className={cn('p-5 flex flex-col justify-between', className)}>
        <div className="flex justify-between items-start mb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <Skeleton className="h-8 w-32 my-1" />
        <Skeleton className="h-3 w-20 mt-2" />
      </Card>
    );
  }

  return (
    <Card className={cn('p-5 flex flex-col justify-between', className)}>
      <div className="flex justify-between items-start">
        <span className="text-sm font-medium text-muted">{label}</span>
        {icon && (
          <div className="p-2 rounded-lg bg-bg text-navy flex items-center justify-center">
            {icon}
          </div>
        )}
      </div>

      <div className="my-2">
        <div className="text-2xl font-bold text-navy tracking-tight">{value}</div>
        {delta && (
          <div
            className={cn(
              'text-xs font-semibold mt-1 flex items-center gap-1',
              delta.isPositive ? 'text-success' : 'text-danger'
            )}
          >
            <span>{delta.isPositive ? '↑' : '↓'}</span>
            <span>{delta.value}</span>
          </div>
        )}
      </div>

      {hint && <span className="text-xs text-muted mt-1">{hint}</span>}
    </Card>
  );
}
