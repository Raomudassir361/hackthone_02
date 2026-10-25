import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { KpiCard } from '../../components/ui/KpiCard';
import {
  Users,
  Banknote,
  Percent,
  ShieldCheck,
  Building,
  UserCheck,
  History,
} from 'lucide-react';
import { AiSummaryButton } from '../ai/AiSummaryModal';

interface AdminDashboardResponse {
  period: { from: string; to: string };
  kpis: {
    headcount: number;
    attritionYtd: number;
    payrollCost: number;
    payrollGross: number;
    avgSalary: number;
    lastPayrollMonth: string;
  };
  headcountByDept: Array<{
    departmentName: string;
    count: number;
  }>;
  genderDiversity: Array<{
    gender: string;
    count: number;
  }>;
  recentAudit: Array<{
    _id: string;
    actorRole: string;
    action: string;
    entity: string;
    createdAt: string;
  }>;
}

export function AdminDashboardView() {
  const { data, isLoading } = useQuery<AdminDashboardResponse>({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      return apiFetch<AdminDashboardResponse>('/dashboard/admin');
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

  const kpis = data?.kpis;

  return (
    <div className="space-y-6">
      {/* Header with AI Summary Action */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-navy">Executive Operations Overview</h2>
          <p className="text-xs text-muted mt-0.5">Workforce growth, payroll distribution, and system audit trail</p>
        </div>
        <AiSummaryButton scope="general" />
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Headcount"
          value={kpis?.headcount ?? 0}
          hint="Active workforce"
          icon={<Users className="w-5 h-5 text-primary" />}
        />
        <KpiCard
          label="Attrition Rate (YTD)"
          value={`${kpis?.attritionYtd ?? 0}%`}
          hint="Exits vs Avg Headcount"
          icon={<Percent className="w-5 h-5 text-warn" />}
        />
        <KpiCard
          label="Net Payroll Cost"
          value={`PKR ${(kpis?.payrollCost ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}`}
          hint={`Period: ${kpis?.lastPayrollMonth ?? 'N/A'}`}
          icon={<Banknote className="w-5 h-5 text-success" />}
        />
        <KpiCard
          label="Average Basic Salary"
          value={`PKR ${(kpis?.avgSalary ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}`}
          hint="Company-wide mean"
          icon={<ShieldCheck className="w-5 h-5 text-accent" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Headcount */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5 text-primary" />
              Departments
            </CardTitle>
            <CardDescription>Headcount allocation by team.</CardDescription>
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
                      className="bg-primary h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (d.count / (kpis?.headcount || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-sm text-muted py-4">No department allocations.</div>
            )}
          </div>
        </Card>

        {/* Gender Diversity Breakdown */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-accent" />
              Workforce Diversity
            </CardTitle>
            <CardDescription>Gender distribution profile.</CardDescription>
          </CardHeader>
          <div className="p-4 space-y-3">
            {data?.genderDiversity && data.genderDiversity.length > 0 ? (
              data.genderDiversity.map((g) => (
                <div key={g.gender} className="flex justify-between items-center p-3 bg-bg rounded-md border border-border">
                  <span className="text-sm font-semibold text-text capitalize">{g.gender}</span>
                  <span className="font-bold text-primary">{g.count}</span>
                </div>
              ))
            ) : (
              <div className="text-center text-sm text-muted py-4">No demographic data.</div>
            )}
          </div>
        </Card>

        {/* Immutable Audit Stream Feed */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Recent Audit Events
            </CardTitle>
            <CardDescription>Real-time append-only system trail.</CardDescription>
          </CardHeader>
          <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
            {data?.recentAudit && data.recentAudit.length > 0 ? (
              data.recentAudit.map((a) => (
                <div key={a._id} className="p-2.5 bg-bg rounded-md border border-border text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-text truncate max-w-[140px]">{a.action}</span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                      {a.actorRole}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-muted">
                    <span>{a.entity}</span>
                    <span>{new Date(a.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-sm text-muted py-4">No recent audit logs.</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
