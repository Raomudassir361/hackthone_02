import { cn } from '../../lib/utils';

export type StatusType =
  | 'present'
  | 'late'
  | 'half_day'
  | 'absent'
  | 'on_leave'
  | 'missing_checkout'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'draft'
  | 'finalized';

interface StatusConfig {
  label: string;
  className: string;
}

const statusMap: Record<StatusType, StatusConfig> = {
  present: {
    label: 'Present',
    className: 'bg-emerald-50 text-success border border-emerald-200',
  },
  late: {
    label: 'Late',
    className: 'bg-amber-50 text-warn border border-amber-200',
  },
  half_day: {
    label: 'Half day',
    className: 'bg-transparent text-warn border border-warn',
  },
  absent: {
    label: 'Absent',
    className: 'bg-red-50 text-danger border border-red-200',
  },
  on_leave: {
    label: 'On leave',
    className: 'bg-indigo-50 text-accent border border-indigo-200',
  },
  missing_checkout: {
    label: 'Missing check-out',
    className: 'bg-transparent text-warn border border-dashed border-warn',
  },
  pending: {
    label: 'Pending',
    className: 'bg-amber-50 text-warn border border-amber-200',
  },
  approved: {
    label: 'Approved',
    className: 'bg-emerald-50 text-success border border-emerald-200',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-50 text-danger border border-red-200',
  },
  draft: {
    label: 'Draft',
    className: 'bg-gray-100 text-muted border border-gray-200',
  },
  finalized: {
    label: 'Finalized 🔒',
    className: 'bg-slate-800 text-white border border-slate-700',
  },
};

export interface StatusBadgeProps {
  status: StatusType;
  className?: string;
  customLabel?: string;
}

export function StatusBadge({ status, className, customLabel }: StatusBadgeProps) {
  const config = statusMap[status] || {
    label: status,
    className: 'bg-gray-100 text-muted border border-gray-200',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide whitespace-nowrap',
        config.className,
        className
      )}
    >
      {customLabel || config.label}
    </span>
  );
}
