import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../context/AuthContextCore';
import { useToast } from '../../components/ui/ToastContext';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DataTable, Column } from '../../components/ui/DataTable';
import { StatusBadge, StatusType } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  Banknote,
  Calendar,
  Lock,
  RefreshCw,
  Plus,
  CheckCircle2,
  FileSpreadsheet,
  AlertTriangle,
} from 'lucide-react';

interface PayrollTotals {
  gross: number;
  deductions: number;
  tax: number;
  net: number;
  employeeCount: number;
}

interface PayrollRunItem {
  id?: string;
  _id: string;
  month: string;
  status: 'draft' | 'finalized';
  totals: PayrollTotals;
  createdAt: string;
  finalizedAt?: string;
}

interface PayslipLine {
  id?: string;
  _id?: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentName?: string;
  designationTitle?: string;
  basic: number;
  hra: number;
  medical: number;
  gross: number;
  workingDays: number;
  absentDays: number;
  unpaidDays: number;
  halfDays: number;
  deductionDays: number;
  deductionAmount: number;
  annualTaxable: number;
  monthlyTax: number;
  net: number;
}

interface PayrollRunDetail extends PayrollRunItem {
  lines: PayslipLine[];
}

export function PayrollScreen() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const isAdmin = user?.role === 'admin';

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);

  // 1. Fetch Runs
  const { data: runs = [], isLoading: runsLoading } = useQuery<PayrollRunItem[]>({
    queryKey: ['payroll-runs'],
    queryFn: async () => {
      return apiFetch<PayrollRunItem[]>('/payroll/runs');
    },
  });

  // 2. Fetch Detail of Active Run
  const effectiveRunId = activeRunId || (runs.length > 0 ? runs[0]._id : null);

  const { data: activeRun, isLoading: detailLoading } = useQuery<PayrollRunDetail>({
    queryKey: ['payroll-run-detail', effectiveRunId],
    queryFn: async () => {
      if (!effectiveRunId) return null as unknown as PayrollRunDetail;
      return apiFetch<PayrollRunDetail>(`/payroll/runs/${effectiveRunId}`);
    },
    enabled: !!effectiveRunId,
  });

  // 3. Create Draft Run Mutation
  const createMutation = useMutation({
    mutationFn: async (month: string) => {
      return apiFetch<PayrollRunItem>('/payroll/runs', {
        method: 'POST',
        body: JSON.stringify({ month }),
      });
    },
    onSuccess: (data: PayrollRunItem) => {
      showToast(`Draft payroll created for ${data.month}`, 'success');
      setShowCreateModal(false);
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      setActiveRunId(data._id);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Could not create payroll run.';
      showToast(msg, 'error');
    },
  });

  // 4. Regenerate Draft Run Mutation
  const regenerateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiFetch(`/payroll/runs/${id}/regenerate`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      showToast('Draft payroll recomputed with latest attendance and leave.', 'success');
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-run-detail', effectiveRunId] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Could not regenerate payroll.';
      showToast(msg, 'error');
    },
  });

  // 5. Finalize Run Mutation (Admin Only)
  const finalizeMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiFetch(`/payroll/runs/${id}/finalize`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      showToast('Payroll finalized and locked. Snapshot payslips published.', 'success');
      setShowFinalizeModal(false);
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-run-detail', effectiveRunId] });
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Could not finalize payroll.';
      showToast(msg, 'error');
    },
  });

  const columns: Column<PayslipLine>[] = [
    {
      key: 'employee',
      header: 'Employee',
      render: (r: PayslipLine) => (
        <div>
          <span className="font-semibold text-text">{r.employeeName}</span>
          <span className="block text-xs font-mono text-muted">{r.employeeCode}</span>
          <span className="block text-[11px] text-muted">{r.departmentName} · {r.designationTitle}</span>
        </div>
      ),
    },
    {
      key: 'earnings',
      header: 'Basic / Gross (PKR)',
      render: (r: PayslipLine) => (
        <div className="text-xs">
          <span className="font-semibold text-text block">{r.gross.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          <span className="text-muted block text-[11px]">Basic: {r.basic.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
      ),
    },
    {
      key: 'days',
      header: 'Work / Ded Days',
      render: (r: PayslipLine) => (
        <div className="text-xs">
          <span className="text-text block">{r.workingDays} working days</span>
          <span className="text-amber-600 block text-[11px]">
            {r.deductionDays > 0 ? `${r.deductionDays} ded (${r.absentDays}A, ${r.unpaidDays}U, ${r.halfDays}H)` : '0 deductions'}
          </span>
        </div>
      ),
    },
    {
      key: 'deductions',
      header: 'Deductions & Tax (PKR)',
      render: (r: PayslipLine) => (
        <div className="text-xs">
          <span className="text-danger block">
            {(r.deductionAmount + r.monthlyTax).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-muted block text-[11px]">
            Ded: {r.deductionAmount.toLocaleString()} | Tax: {r.monthlyTax.toLocaleString()}
          </span>
        </div>
      ),
    },
    {
      key: 'net',
      header: 'Net Salary (PKR)',
      render: (r: PayslipLine) => (
        <span className="font-bold text-success text-sm">
          {r.net.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Payroll Operations</h1>
          <p className="text-sm text-muted mt-1">
            Compute monthly salaries, deductions, income tax slabs, and publish finalized payslips.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Payroll Draft
          </Button>
        </div>
      </div>

      {/* Selector & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-surface rounded-card border border-border">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold text-text">Select Run:</span>
          {runsLoading ? (
            <div className="h-9 w-40 bg-bg rounded animate-pulse" />
          ) : runs.length === 0 ? (
            <span className="text-xs text-muted">No runs found</span>
          ) : (
            <select
              value={effectiveRunId || ''}
              onChange={(e) => setActiveRunId(e.target.value)}
              className="px-3 py-1.5 bg-bg rounded-md border border-border text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {runs.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.month} ({r.status.toUpperCase()})
                </option>
              ))}
            </select>
          )}

          {activeRun && (
            <StatusBadge
              status={activeRun.status as StatusType}
            />
          )}
        </div>

        {activeRun && (
          <div className="flex items-center gap-2">
            {activeRun.status === 'draft' ? (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => regenerateMutation.mutate(activeRun._id)}
                  isLoading={regenerateMutation.isPending}
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Regenerate Draft
                </Button>

                {isAdmin ? (
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => setShowFinalizeModal(true)}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    Finalize & Lock
                  </Button>
                ) : (
                  <span className="text-xs text-muted italic flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-muted" />
                    Admin finalizes
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs text-success font-semibold flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                <Lock className="w-3.5 h-3.5" />
                Finalized on {activeRun.finalizedAt ? new Date(activeRun.finalizedAt).toLocaleDateString() : 'N/A'} (Locked)
              </span>
            )}
          </div>
        )}
      </div>

      {/* KPI Cards for Selected Run */}
      {activeRun && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <p className="text-xs font-semibold text-muted uppercase">Employees</p>
            <p className="text-2xl font-bold text-text mt-1">{activeRun.totals.employeeCount}</p>
          </Card>
          <Card>
            <p className="text-xs font-semibold text-muted uppercase">Total Gross</p>
            <p className="text-2xl font-bold text-text mt-1">
              PKR {activeRun.totals.gross.toLocaleString('en-US', { minimumFractionDigits: 0 })}
            </p>
          </Card>
          <Card>
            <p className="text-xs font-semibold text-muted uppercase">Attendance Deductions</p>
            <p className="text-2xl font-bold text-danger mt-1">
              PKR {activeRun.totals.deductions.toLocaleString('en-US', { minimumFractionDigits: 0 })}
            </p>
          </Card>
          <Card>
            <p className="text-xs font-semibold text-muted uppercase">Monthly Tax</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">
              PKR {activeRun.totals.tax.toLocaleString('en-US', { minimumFractionDigits: 0 })}
            </p>
          </Card>
          <Card className="bg-emerald-50/50 border-emerald-200">
            <p className="text-xs font-semibold text-emerald-800 uppercase">Net Disbursed</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">
              PKR {activeRun.totals.net.toLocaleString('en-US', { minimumFractionDigits: 0 })}
            </p>
          </Card>
        </div>
      )}

      {/* Payslip Lines Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Payroll Line Items Snapshot
          </CardTitle>
          <CardDescription>
            {activeRun ? `Detailed salary and deduction breakdown for ${activeRun.month}.` : 'No payroll run selected.'}
          </CardDescription>
        </CardHeader>

        {runsLoading || detailLoading ? (
          <div className="p-8 text-center text-muted">Loading payroll data...</div>
        ) : !activeRun ? (
          <EmptyState
            icon={<Banknote className="w-6 h-6 text-muted" />}
            title="No payroll run"
            description="Create your first monthly payroll draft to calculate salaries."
            actionLabel="Create Draft Run"
            onAction={() => setShowCreateModal(true)}
          />
        ) : (
          <DataTable<PayslipLine>
            data={activeRun.lines.map((l) => ({ ...l, id: l.employeeId }))}
            columns={columns}
          />
        )}
      </Card>

      {/* Create Draft Modal */}
      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create New Payroll Draft"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate(selectedMonth);
            }}
            className="space-y-4"
          >
            <p className="text-sm text-text">
              Select the payroll month. HCM Lite will evaluate working days, attendance deductions, approved leaves, and income tax slabs across all active staff.
            </p>

            <div>
              <label className="block text-xs font-semibold text-text mb-1">Month (YYYY-MM)</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                required
                className="w-full px-3 py-2 bg-surface rounded-md border border-border text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={createMutation.isPending}>
                Generate Draft Run
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Finalize Confirmation Modal */}
      {showFinalizeModal && activeRun && (
        <Modal
          isOpen={showFinalizeModal}
          onClose={() => setShowFinalizeModal(false)}
          title="Finalize & Lock Payroll"
        >
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 rounded-md border border-amber-200 text-xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Permanent Locking Warning
              </p>
              <p>
                Once finalized, this payroll run <strong>cannot be modified or regenerated</strong>.
                Snapshot payslips will be published immediately for {activeRun.totals.employeeCount} employees.
              </p>
            </div>

            <div className="text-sm text-text space-y-1">
              <p>Month: <strong>{activeRun.month}</strong></p>
              <p>Total Net Disbursement: <strong>PKR {activeRun.totals.net.toLocaleString()}</strong></p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setShowFinalizeModal(false)}>
                Keep as Draft
              </Button>
              <Button
                variant="primary"
                className="bg-emerald-600 hover:bg-emerald-700"
                isLoading={finalizeMutation.isPending}
                onClick={() => finalizeMutation.mutate(activeRun._id)}
              >
                Yes, Finalize Payroll
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
