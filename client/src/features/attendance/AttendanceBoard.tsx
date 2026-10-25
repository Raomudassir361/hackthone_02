import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { DataTable, Column } from '../../components/ui/DataTable';
import { StatusBadge, StatusType } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { FormField } from '../../components/ui/FormField';
import { apiFetch } from '../../lib/api';
import {
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  UserX,
  Inbox,
} from 'lucide-react';

interface BoardRow {
  id?: string;
  employee: {
    id: string;
    code: string;
    name: string;
    department: string;
    designation: string;
  };
  date: string;
  status: string;
  checkInAt?: string;
  checkOutAt?: string;
  workedMinutes?: number;
  source?: string;
}

interface BoardResponse {
  date: string;
  summary: {
    totalEmployees: number;
    present: number;
    late: number;
    halfDay: number;
    absent: number;
    isWeekend: boolean;
    isHoliday: boolean;
    holidayName?: string;
  };
  rows: BoardRow[];
}

interface CorrectionItem {
  _id: string;
  employeeId: { _id: string; name: string; code: string };
  date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  decidedBy?: { email: string };
  decisionComment?: string;
}

export function AttendanceBoard() {
  const [activeTab, setActiveTab] = useState<'board' | 'corrections'>('board');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [boardData, setBoardData] = useState<BoardResponse | null>(null);
  const [corrections, setCorrections] = useState<CorrectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Decide Modal
  const [decideModalItem, setDecideModalItem] = useState<CorrectionItem | null>(null);
  const [decisionComment, setDecisionComment] = useState('');
  const [decisionAction, setDecisionAction] = useState<'approved' | 'rejected'>('approved');
  const [isDeciding, setIsDeciding] = useState(false);

  const loadBoard = async (date: string) => {
    setIsLoading(true);
    try {
      const res = await apiFetch<BoardResponse>(`/attendance/board?date=${date}`);
      setBoardData(res);
    } catch (err) {
      console.error('Failed to load attendance board:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCorrections = async () => {
    try {
      const res = await apiFetch<CorrectionItem[]>('/attendance/corrections?status=pending');
      setCorrections(res);
    } catch (err) {
      console.error('Failed to load corrections:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'board') {
      loadBoard(selectedDate);
    } else {
      loadCorrections();
    }
  }, [selectedDate, activeTab]);

  const handleDecide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decideModalItem) return;
    setIsDeciding(true);
    try {
      await apiFetch(`/attendance/corrections/${decideModalItem._id}/decide`, {
        method: 'POST',
        body: JSON.stringify({
          status: decisionAction,
          decisionComment,
        }),
      });
      setDecideModalItem(null);
      setDecisionComment('');
      loadCorrections();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Decision failed');
    } finally {
      setIsDeciding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Mode Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold text-navy tracking-tight">Attendance Operations</h1>
          <p className="text-sm text-muted mt-1">
            Real-time daily attendance monitoring and employee correction approvals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === 'board' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('board')}
          >
            Attendance Board
          </Button>
          <Button
            variant={activeTab === 'corrections' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('corrections')}
            className="flex items-center gap-1.5"
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Corrections Inbox ({corrections.length})</span>
          </Button>
        </div>
      </div>

      {activeTab === 'board' && (
        <div className="space-y-6">
          {/* Controls Bar & Summary Chips */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 rounded-control border border-border bg-surface text-xs font-semibold text-navy focus:outline-none focus:border-primary shadow-sm"
              />
            </div>

            {boardData && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-3 py-1 rounded-full bg-surface border border-border font-semibold text-navy flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-muted" />
                  <span>Total: {boardData.summary.totalEmployees}</span>
                </span>
                <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 font-semibold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                  <span>Present: {boardData.summary.present}</span>
                </span>
                <span className="px-3 py-1 rounded-full bg-amber-50 border border-amber-200 font-semibold text-amber-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-warn" />
                  <span>Late: {boardData.summary.late}</span>
                </span>
                <span className="px-3 py-1 rounded-full bg-red-50 border border-red-200 font-semibold text-red-800 flex items-center gap-1.5">
                  <UserX className="w-3.5 h-3.5 text-danger" />
                  <span>Absent: {boardData.summary.absent}</span>
                </span>
              </div>
            )}
          </div>

          {/* Attendance Table */}
          {(() => {
            const boardColumns: Column<BoardRow>[] = [
              {
                key: 'code',
                header: 'Code',
                render: (r: BoardRow) => (
                  <span className="font-mono font-bold text-xs text-primary">
                    {r.employee.code}
                  </span>
                ),
              },
              {
                key: 'name',
                header: 'Employee',
                render: (r: BoardRow) => (
                  <div>
                    <span className="font-semibold text-navy block">{r.employee.name}</span>
                    <span className="text-xs text-muted block">
                      {r.employee.department} · {r.employee.designation}
                    </span>
                  </div>
                ),
              },
              {
                key: 'status',
                header: 'Daily Status',
                render: (r: BoardRow) => <StatusBadge status={r.status as StatusType} />,
              },
              {
                key: 'checkInAt',
                header: 'Check-In',
                render: (r: BoardRow) =>
                  r.checkInAt ? (
                    <span className="text-xs text-navy">
                      {new Date(r.checkInAt).toLocaleTimeString()}
                    </span>
                  ) : (
                    <span className="text-xs text-muted">—</span>
                  ),
              },
              {
                key: 'checkOutAt',
                header: 'Check-Out',
                render: (r: BoardRow) =>
                  r.checkOutAt ? (
                    <span className="text-xs text-navy">
                      {new Date(r.checkOutAt).toLocaleTimeString()}
                    </span>
                  ) : (
                    <span className="text-xs text-muted">—</span>
                  ),
              },
              {
                key: 'source',
                header: 'Source',
                render: (r: BoardRow) => (
                  <span className="text-xs uppercase font-medium text-muted">
                    {r.source || '—'}
                  </span>
                ),
              },
            ];

            const rowsWithId = (boardData?.rows || []).map((row) => ({
              ...row,
              id: row.employee.id,
            }));

            return (
              <DataTable<BoardRow>
                columns={boardColumns}
                data={rowsWithId}
                isLoading={isLoading}
                emptyTitle="No Attendance Records"
                emptyDescription="No employees have registered attendance for this date."
              />
            );
          })()}
        </div>
      )}

      {activeTab === 'corrections' && (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Pending employee attendance adjustments requiring HR / Admin review and decision comments.
          </p>

          <DataTable
            columns={[
              {
                key: 'employee',
                header: 'Employee',
                render: (c) => (
                  <div>
                    <span className="font-semibold text-navy block">{c.employeeId?.name}</span>
                    <span className="font-mono text-xs text-muted block">{c.employeeId?.code}</span>
                  </div>
                ),
              },
              { key: 'date', header: 'Shift Date' },
              { key: 'reason', header: 'Justification Reason' },
              {
                key: 'status',
                header: 'Decision Status',
                render: (c) => <StatusBadge status={c.status as StatusType} />,
              },
              {
                key: 'actions',
                header: 'Action',
                render: (c) => (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDecideModalItem(c);
                      setDecisionAction('approved');
                    }}
                  >
                    Review & Decide
                  </Button>
                ),
              },
            ]}
            data={corrections}
            emptyTitle="No Pending Corrections"
            emptyDescription="All attendance correction requests have been addressed."
          />
        </div>
      )}

      {/* Decide Modal */}
      <Modal
        isOpen={Boolean(decideModalItem)}
        onClose={() => setDecideModalItem(null)}
        title="Decide Attendance Correction"
        description={`Review justification from ${decideModalItem?.employeeId?.name} for ${decideModalItem?.date}.`}
      >
        <form onSubmit={handleDecide} className="space-y-4">
          <div className="p-3 bg-bg rounded-control border border-border text-xs">
            <span className="font-bold text-navy block">Employee Justification:</span>
            <p className="mt-1 text-navy/80 italic">{decideModalItem?.reason}</p>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-navy">
              <input
                type="radio"
                name="decision"
                checked={decisionAction === 'approved'}
                onChange={() => setDecisionAction('approved')}
              />
              <span>Approve Correction</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-danger">
              <input
                type="radio"
                name="decision"
                checked={decisionAction === 'rejected'}
                onChange={() => setDecisionAction('rejected')}
              />
              <span>Reject Correction</span>
            </label>
          </div>

          <FormField
            label="Decision Comment (Required)"
            required
            value={decisionComment}
            onChange={(e) => setDecisionComment(e.target.value)}
            placeholder="e.g. Verified with front-desk log / security officer..."
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDecideModalItem(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={decisionAction === 'approved' ? 'primary' : 'danger'}
              isLoading={isDeciding}
            >
              Confirm {decisionAction === 'approved' ? 'Approval' : 'Rejection'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
