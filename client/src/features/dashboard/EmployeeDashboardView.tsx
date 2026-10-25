import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { CheckInWidget } from '../attendance/CheckInWidget';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { KpiCard } from '../../components/ui/KpiCard';
import { StatusBadge, StatusType } from '../../components/ui/StatusBadge';
import {
  Clock,
  Calendar,
  AlertCircle,
  Banknote,
  Award,
} from 'lucide-react';

interface EmployeeDashboardResponse {
  todayRecord: {
    status: string;
    checkInAt?: string;
    checkOutAt?: string;
    workedMinutes?: number;
  } | null;
  weeklyHours: number;
  targetWeeklyHours: number;
  lateCountMonth: number;
  leaveBalances: Array<{
    key: string;
    name: string;
    remaining: number;
    quota: number;
  }>;
  lastPayslip: {
    month: string;
    gross: number;
    net: number;
  } | null;
}

export function EmployeeDashboardView() {
  const { data, isLoading } = useQuery<EmployeeDashboardResponse>({
    queryKey: ['employee-dashboard'],
    queryFn: async () => {
      return apiFetch<EmployeeDashboardResponse>('/dashboard/employee');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-surface rounded-card border border-border animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const hoursPct = Math.min(
    100,
    Math.round(((data?.weeklyHours ?? 0) / (data?.targetWeeklyHours || 40)) * 100)
  );

  return (
    <div className="space-y-6">
      {/* Top Row: Check-In Widget + Personal KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <CheckInWidget />
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <KpiCard
            label="Weekly Hours Logged"
            value={`${data?.weeklyHours ?? 0}h / 40h`}
            hint={`${hoursPct}% of target completed`}
            icon={<Clock className="w-5 h-5 text-primary" />}
          />
          <KpiCard
            label="Monthly Late Arrivals"
            value={data?.lateCountMonth ?? 0}
            hint="Grace period: 15 minutes"
            icon={<AlertCircle className="w-5 h-5 text-warn" />}
          />
          <KpiCard
            label="Annual Leave Remaining"
            value={`${data?.leaveBalances.find((b) => b.key === 'annual')?.remaining ?? 14} days`}
            hint="Out of 14 days annual quota"
            icon={<Calendar className="w-5 h-5 text-accent" />}
          />
          <KpiCard
            label="Last Net Compensation"
            value={
              data?.lastPayslip
                ? `PKR ${data.lastPayslip.net.toLocaleString()}`
                : 'Awaiting Run'
            }
            hint={data?.lastPayslip ? `Period: ${data.lastPayslip.month}` : 'No finalized payslips'}
            icon={<Banknote className="w-5 h-5 text-success" />}
          />
        </div>
      </div>

      {/* Middle Row: Progress & Leave Balances */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Time Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              Weekly Attendance Goal
            </CardTitle>
            <CardDescription>Target: 40 hours standard work week.</CardDescription>
          </CardHeader>
          <div className="p-4 space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="font-semibold text-text">Standard Full-Time Target</span>
              <span className="font-bold text-primary">{hoursPct}%</span>
            </div>
            <div className="w-full bg-bg h-3 rounded-full overflow-hidden border border-border">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${hoursPct}%` }}
              />
            </div>
            <p className="text-xs text-muted">
              Accumulated hours update in real-time as you check out each business day.
            </p>
          </div>
        </Card>

        {/* Leave Balances Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-accent" />
              My Leave Allocation
            </CardTitle>
            <CardDescription>Available balances for instant self-service application.</CardDescription>
          </CardHeader>
          <div className="p-4 grid grid-cols-3 gap-3">
            {data?.leaveBalances.map((b) => (
              <div key={b.key} className="p-3 bg-bg rounded-card border border-border text-center">
                <span className="text-[11px] font-semibold text-muted uppercase block truncate">
                  {b.name}
                </span>
                <span className="text-xl font-bold text-text mt-1 block">{b.remaining}</span>
                <span className="text-[10px] text-muted block">of {b.quota} days</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Today's Status Banner */}
      {data?.todayRecord && (
        <Card className="bg-surface/50 border-primary/20">
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-muted uppercase tracking-wider block">
                Today's Recorded Session
              </span>
              <p className="text-sm font-medium text-text mt-0.5">
                Check-in stamped at{' '}
                <strong>
                  {data.todayRecord.checkInAt
                    ? new Date(data.todayRecord.checkInAt).toLocaleTimeString()
                    : 'N/A'}
                </strong>
                {data.todayRecord.checkOutAt && (
                  <span>
                    {' '}
                    · Checked out at{' '}
                    <strong>{new Date(data.todayRecord.checkOutAt).toLocaleTimeString()}</strong>
                  </span>
                )}
              </p>
            </div>
            <StatusBadge status={data.todayRecord.status as StatusType} />
          </div>
        </Card>
      )}
    </div>
  );
}
