import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../context/AuthContextCore';
import { useToast } from '../../components/ui/ToastContext';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DataTable, Column } from '../../components/ui/DataTable';
import { EmptyState } from '../../components/ui/EmptyState';
import { FileText, Download, Banknote, Calendar } from 'lucide-react';

interface MyPayslipItem {
  id?: string;
  _id: string;
  month: string;
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
  createdAt: string;
}

export function MyPayslipsScreen() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const { data: payslips = [], isLoading } = useQuery<MyPayslipItem[]>({
    queryKey: ['my-payslips', user?.employeeId],
    queryFn: async () => {
      return apiFetch<MyPayslipItem[]>('/payslips');
    },
    enabled: !!user?.employeeId,
  });

  const handleDownloadPdf = async (id: string, month: string) => {
    try {
      const token = localStorage.getItem('hcm_token');
      const res = await fetch(`http://localhost:5000/api/payslips/${id}/pdf`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to generate payslip PDF');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payslip-${month}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      showToast(`Payslip for ${month} downloaded.`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Download failed';
      showToast(msg, 'error');
    }
  };

  const columns: Column<MyPayslipItem>[] = [
    {
      key: 'month',
      header: 'Pay Period',
      render: (r: MyPayslipItem) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="font-semibold text-text">{r.month}</span>
        </div>
      ),
    },
    {
      key: 'earnings',
      header: 'Gross Salary (PKR)',
      render: (r: MyPayslipItem) => (
        <div className="text-xs">
          <span className="font-semibold text-text block">
            {r.gross.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-muted block text-[11px]">
            Basic: {r.basic.toLocaleString()} | HRA: {r.hra.toLocaleString()}
          </span>
        </div>
      ),
    },
    {
      key: 'deductions',
      header: 'Total Deductions (PKR)',
      render: (r: MyPayslipItem) => (
        <div className="text-xs">
          <span className="text-danger font-medium block">
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
      header: 'Net Pay (PKR)',
      render: (r: MyPayslipItem) => (
        <span className="font-bold text-success text-sm">
          {r.net.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r: MyPayslipItem) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleDownloadPdf(r._id, r.month)}
        >
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Download PDF
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text">My Payslips</h1>
        <p className="text-sm text-muted mt-1">
          Review your finalized monthly earnings, tax deductions, and download confidential PDF payslips.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Payslip History
          </CardTitle>
          <CardDescription>
            Official compensation records finalized by administration.
          </CardDescription>
        </CardHeader>

        {isLoading ? (
          <div className="p-8 text-center text-muted">Loading your payslips...</div>
        ) : payslips.length === 0 ? (
          <EmptyState
            icon={<Banknote className="w-6 h-6 text-muted" />}
            title="No payslips available"
            description="You do not have any finalized payslips published yet. Payslips appear here once administration finalizes the monthly payroll run."
          />
        ) : (
          <DataTable<MyPayslipItem>
            data={payslips.map((p) => ({ ...p, id: p._id }))}
            columns={columns}
          />
        )}
      </Card>
    </div>
  );
}
