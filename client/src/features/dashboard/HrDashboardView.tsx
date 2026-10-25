import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { KpiCard } from '../../components/ui/KpiCard';
import { DataTable, Column } from '../../components/ui/DataTable';
import {
  Users,
  UserCheck,
  Clock,
  AlertCircle,
  TrendingUp,
  Building,
  BarChart2,
} from 'lucide-react';
import { AiSummaryButton } from '../ai/AiSummaryModal';

interface HrDashboardResponse {
  period: { from: string; to: string };
  kpis: {
    headcount: number;
    presentToday: number;
    lateToday: number;
    halfDayToday: number;
    attendanceRate: number;
    latePct: number;
    pendingApprovals: number;
  };
  topLateComers: Array<{
    _id: string;
    name: string;
    code: string;
    lateCount: number;
  }>;
  leaveByType: Array<{
    type: string;
    days: number;
    count: number;
  }>;
  attritionRisks?: Array<{
    employeeId: string;
    name: string;
    code: string;
    riskScore: 'Low' | 'Medium' | 'High';
    reason: string;
  }>;
  headcountByDept: Array<{
    departmentName: string;
    count: number;
  }>;
}

export function HrDashboardView() {
  const { data, isLoading } = useQuery<HrDashboardResponse>({
    queryKey: ['hr-dashboard'],
    queryFn: async () => {
      return apiFetch<HrDashboardResponse>('/dashboard/hr');
    },
  });

  const lateColumns: Column<{ id: string; name: string; code: string; lateCount: number }>[] = [
    {
      key: 'code',
      header: 'Code',
      render: (r) => <span className="font-mono text-xs font-bold text-primary">{r.code}</span>,
    },
    {
      key: 'name',
      header: 'Employee Name',
      render: (r) => <span className="font-semibold text-text">{r.name}</span>,
    },
    {
      key: 'lateCount',
      header: 'Late Count',
      render: (r) => (
        <span className="font-bold text-danger px-2.5 py-0.5 rounded-full bg-danger/10 text-xs">
          {r.lateCount} lates
        </span>
      ),
    },
  ];

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

  const kpis = data?.kpis;

  return (
    <div className="space-y-6">
      {/* Header with AI Summary Action */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-navy">HR Intelligence & Operations</h2>
          <p className="text-xs text-muted mt-0.5">Live headcount, attendance rates, and pending actions</p>
        </div>
        <AiSummaryButton scope="attendance" />
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Headcount"
          value={kpis?.headcount ?? 0}
          hint="Active & probation staff"
          icon={<Users className="w-5 h-5 text-primary" />}
        />
        <KpiCard
          label="Present Today"
          value={kpis?.presentToday ?? 0}
          hint={`${kpis?.lateToday ?? 0} late arrivals`}
          icon={<UserCheck className="w-5 h-5 text-success" />}
        />
        <KpiCard
          label="Attendance Rate"
          value={`${kpis?.attendanceRate ?? 100}%`}
          hint="Across working days in period"
          icon={<TrendingUp className="w-5 h-5 text-accent" />}
        />
        <KpiCard
          label="Pending Leave Approvals"
          value={kpis?.pendingApprovals ?? 0}
          hint="Awaiting HR/Admin decision"
          icon={<AlertCircle className="w-5 h-5 text-warn" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Late Comers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-danger" />
              Most Frequent Late Arrivals
            </CardTitle>
            <CardDescription>Employees exceeding the 15-minute grace period.</CardDescription>
          </CardHeader>
          {data?.topLateComers && data.topLateComers.length > 0 ? (
            <DataTable
              data={data.topLateComers.map((c) => ({ ...c, id: c._id }))}
              columns={lateColumns}
            />
          ) : (
            <div className="p-8 text-center text-sm text-muted">
              Punctuality is exceptional! No late-arrival records found for this period.
            </div>
          )}
        </Card>

        {/* Headcount by Department */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5 text-primary" />
              Headcount Distribution by Department
            </CardTitle>
            <CardDescription>Active workforce allocation across organizational units.</CardDescription>
          </CardHeader>
          <div className="p-4 space-y-3">
            {data?.headcountByDept && data.headcountByDept.length > 0 ? (
              data.headcountByDept.map((d) => (
                <div key={d.departmentName} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-text">
                    <span>{d.departmentName}</span>
                    <span>{d.count} staff</span>
                  </div>
                  <div className="w-full bg-bg h-2 rounded-full overflow-hidden border border-border">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (d.count / (kpis?.headcount || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-sm text-muted">No department allocations yet.</div>
            )}
          </div>
        </Card>
      </div>

      {/* Leave Utilization Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-accent" />
            Approved Leave Utilization in Period
          </CardTitle>
          <CardDescription>
            Cumulative approved working days categorized by policy leave type.
          </CardDescription>
        </CardHeader>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4">
          {data?.leaveByType && data.leaveByType.length > 0 ? (
            data.leaveByType.map((l) => (
              <div key={l.type} className="p-4 bg-bg rounded-card border border-border">
                <span className="text-xs uppercase font-semibold text-muted tracking-wider block">
                  {l.type} Leave
                </span>
                <span className="text-2xl font-bold text-text mt-1 block">{l.days} days</span>
                <span className="text-xs text-muted block mt-0.5">Across {l.count} approved requests</span>
              </div>
            ))
          ) : (
            <div className="col-span-3 text-center text-sm text-muted py-4">
              No approved leaves recorded in this period.
            </div>
          )}
        </div>
      </Card>

      {/* T10.3: Absence Anomaly & Attrition Risk Scoring */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-warn" />
            Absence Anomaly & Attrition Risk Scoring (Bonus)
          </CardTitle>
          <CardDescription>
            Predictive heuristic flags based on recurring late arrivals and attendance anomalies.
          </CardDescription>
        </CardHeader>
        <div className="p-4">
          {data?.attritionRisks && data.attritionRisks.length > 0 ? (
            <div className="space-y-2">
              {data.attritionRisks.map((ar) => (
                <div
                  key={ar.employeeId}
                  className="flex items-center justify-between p-3 bg-bg rounded-card border border-border text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-primary">{ar.code}</span>
                    <span className="font-semibold text-text">{ar.name}</span>
                    <span className="text-muted text-[11px]">— {ar.reason}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                      ar.riskScore === 'High'
                        ? 'bg-danger/10 text-danger'
                        : ar.riskScore === 'Medium'
                        ? 'bg-warn/10 text-warn'
                        : 'bg-success/10 text-success'
                    }`}
                  >
                    {ar.riskScore} Risk
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-sm text-muted py-4">
              Zero high-risk attendance anomalies detected in this period.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
