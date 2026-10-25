import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../context/AuthContextCore';
import { useToast } from '../../components/ui/ToastContext';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { DataTable, Column } from '../../components/ui/DataTable';
import { StatusBadge, StatusType } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { Calendar, Clock, AlertCircle, FileText, Ban, Sparkles } from 'lucide-react';

interface LeaveBalance {
  key: string;
  name: string;
  quota: number | null;
  used: number;
  pending: number;
  remaining: number | null;
}

interface LeaveRequestItem {
  id?: string;
  _id: string;
  employeeId: string | { _id: string; name: string; code: string };
  leaveTypeKey: string;
  startDate: string;
  endDate: string;
  workingDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  decisionComment?: string;
  decidedAt?: string;
  createdAt: string;
}

interface PreviewResponse {
  workingDays: number;
  totalCalendarDays: number;
  holidaysEncountered: number;
}

export function MyLeaveScreen() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [leaveTypeKey, setLeaveTypeKey] = useState('annual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [cancelTarget, setCancelTarget] = useState<LeaveRequestItem | null>(null);

  // Smart Leave state
  const [smartLeaveText, setSmartLeaveText] = useState('');
  const [smartLeaveLoading, setSmartLeaveLoading] = useState(false);
  const [isAiFilled, setIsAiFilled] = useState(false);

  const handleSmartLeaveParse = async () => {
    if (!smartLeaveText.trim()) return;
    setSmartLeaveLoading(true);
    try {
      const res = await apiFetch<{
        type?: string;
        startDate?: string;
        endDate?: string;
        reason?: string;
        fallback?: boolean;
      }>('/ai/smart-leave', {
        method: 'POST',
        body: JSON.stringify({ prompt: smartLeaveText }),
      });

      if (res.fallback) {
        showToast('Could not automatically determine dates or type. Please fill manually.', 'info');
        return;
      }

      if (res.type) setLeaveTypeKey(res.type);
      if (res.startDate) setStartDate(res.startDate);
      if (res.endDate) setEndDate(res.endDate);
      if (res.reason) setReason(res.reason);
      setIsAiFilled(true);
      showToast('Form pre-filled by AI. Please review and submit.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Smart Leave parsing failed.';
      showToast(msg, 'error');
    } finally {
      setSmartLeaveLoading(false);
    }
  };

  // 1. Fetch Balances
  const { data: balances = [], isLoading: balancesLoading } = useQuery<LeaveBalance[]>({
    queryKey: ['leave-balances', user?.employeeId],
    queryFn: async () => {
      return apiFetch<LeaveBalance[]>('/leave/balances');
    },
    enabled: !!user?.employeeId,
  });

  // 2. Fetch My Requests History
  const { data: requests = [], isLoading: requestsLoading } = useQuery<LeaveRequestItem[]>({
    queryKey: ['leave-my-requests', user?.employeeId],
    queryFn: async () => {
      return apiFetch<LeaveRequestItem[]>('/leave/requests');
    },
    enabled: !!user?.employeeId,
  });

  // 3. Live Preview Calculation Query
  const { data: previewData, isFetching: previewLoading } = useQuery<PreviewResponse>({
    queryKey: ['leave-preview', startDate, endDate],
    queryFn: async () => {
      if (!startDate || !endDate) return { workingDays: 0, totalCalendarDays: 0, holidaysEncountered: 0 };
      return apiFetch<PreviewResponse>(
        `/leave/preview?startDate=${startDate}&endDate=${endDate}`
      );
    },
    enabled: !!startDate && !!endDate && startDate <= endDate,
  });

  // 4. Submit Mutation
  const applyMutation = useMutation({
    mutationFn: async () => {
      return apiFetch('/leave/apply', {
        method: 'POST',
        body: JSON.stringify({
          leaveTypeKey,
          startDate,
          endDate,
          reason,
        }),
      });
    },
    onSuccess: () => {
      showToast('Your leave application has been submitted for review.', 'success');
      setStartDate('');
      setEndDate('');
      setReason('');
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      queryClient.invalidateQueries({ queryKey: ['leave-my-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-inbox'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Could not submit leave application.';
      showToast(msg, 'error');
    },
  });

  // 5. Cancel Mutation
  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiFetch(`/leave/${id}/cancel`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      showToast('Your leave request has been cancelled.', 'info');
      setCancelTarget(null);
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      queryClient.invalidateQueries({ queryKey: ['leave-my-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-inbox'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Could not cancel request.';
      showToast(msg, 'error');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      showToast('Please select both start and end dates.', 'info');
      return;
    }
    if (startDate > endDate) {
      showToast('Start date cannot be after end date.', 'error');
      return;
    }
    if (!reason.trim()) {
      showToast('Please provide a reason.', 'info');
      return;
    }
    applyMutation.mutate();
  };

  const columns: Column<LeaveRequestItem>[] = [
    {
      key: 'leaveTypeKey',
      header: 'Type',
      render: (r: LeaveRequestItem) => (
        <span className="font-medium capitalize text-text">{r.leaveTypeKey}</span>
      ),
    },
    {
      key: 'dates',
      header: 'Dates',
      render: (r: LeaveRequestItem) => (
        <div className="text-xs">
          <span className="font-medium text-text">{r.startDate}</span>
          <span className="text-muted"> to </span>
          <span className="font-medium text-text">{r.endDate}</span>
        </div>
      ),
    },
    {
      key: 'workingDays',
      header: 'Days',
      render: (r: LeaveRequestItem) => (
        <span className="font-semibold text-text">{r.workingDays}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r: LeaveRequestItem) => (
        <StatusBadge status={r.status as StatusType} />
      ),
    },
    {
      key: 'reason',
      header: 'Reason & Remarks',
      render: (r: LeaveRequestItem) => (
        <div className="max-w-xs text-xs truncate">
          <p className="text-text truncate" title={r.reason}>{r.reason}</p>
          {r.decisionComment && (
            <p className="text-muted text-[11px] truncate italic" title={r.decisionComment}>
              Decision: {r.decisionComment}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Action',
      render: (r: LeaveRequestItem) =>
        r.status === 'pending' ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-danger hover:bg-danger/10"
            onClick={() => setCancelTarget(r)}
          >
            <Ban className="w-3.5 h-3.5 mr-1" />
            Cancel
          </Button>
        ) : (
          <span className="text-muted text-xs">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Leave Balance Cards */}
      <div>
        <h2 className="text-base font-semibold text-text mb-3">Leave Balances</h2>
        {balancesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-surface rounded-card border border-border animate-pulse" />
            ))}
          </div>
        ) : balances.length === 0 ? (
          <div className="p-4 bg-surface rounded-card border border-border text-sm text-muted">
            No active leave types configured in organization settings.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {balances.map((bal) => (
              <Card key={bal.key} className="relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted uppercase tracking-wider">{bal.name}</p>
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-text">
                    {bal.remaining !== null ? bal.remaining : '∞'}
                  </span>
                  <span className="text-xs text-muted">
                    {bal.quota !== null ? `/ ${bal.quota} days total` : 'unlimited'}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted border-t border-border/50 pt-2">
                  <span>Used: <strong className="text-text">{bal.used}</strong></span>
                  {bal.pending > 0 && (
                    <span className="text-amber-500 font-medium">Pending: {bal.pending}</span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Application Form */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Apply for Leave
              </CardTitle>
              <CardDescription>
                Weekends and public holidays are automatically excluded.
              </CardDescription>
            </CardHeader>

            {/* Smart Leave AI Input Bar */}
            <div className="mb-4 p-3 bg-accent/5 border border-accent/20 rounded-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-accent flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Smart Leave Assistant
                </span>
                <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded font-semibold border border-accent/20">
                  AI Pre-fill
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={smartLeaveText}
                  onChange={(e) => setSmartLeaveText(e.target.value)}
                  placeholder="e.g. Next Monday and Tuesday off for sister's wedding"
                  className="flex-1 text-xs px-2.5 py-1.5 rounded-control border border-border bg-surface focus:outline-none focus:ring-1 focus:ring-accent"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSmartLeaveParse();
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleSmartLeaveParse}
                  disabled={smartLeaveLoading || !smartLeaveText.trim()}
                  className="text-xs h-7 px-2.5 bg-accent text-white hover:bg-accent/90"
                >
                  {smartLeaveLoading ? (
                    <Clock className="w-3 h-3 animate-spin" />
                  ) : (
                    'Parse'
                  )}
                </Button>
              </div>
              {isAiFilled && (
                <div className="text-[10px] text-accent font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Fields pre-filled from prompt. Please review before applying.</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField label="Leave Type" required>
                <select
                  value={leaveTypeKey}
                  onChange={(e) => setLeaveTypeKey(e.target.value)}
                  className={`w-full px-3 py-2 bg-surface rounded-md border text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary ${
                    isAiFilled ? 'border-accent ring-1 ring-accent/30' : 'border-border'
                  }`}
                >
                  {balances.map((b) => (
                    <option key={b.key} value={b.key}>
                      {b.name} ({b.remaining !== null ? `${b.remaining} remaining` : 'Unlimited'})
                    </option>
                  ))}
                  {balances.length === 0 && <option value="annual">Annual Leave</option>}
                </select>
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Start Date" required>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-surface rounded-md border border-border text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </FormField>
                <FormField label="End Date" required>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-surface rounded-md border border-border text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </FormField>
              </div>

              {/* Working Days Calculation Preview */}
              {startDate && endDate && (
                <div className="p-3 bg-bg rounded-md border border-border text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Calculated Working Days:</span>
                    <span className="font-bold text-primary text-sm">
                      {previewLoading ? '...' : previewData?.workingDays ?? 0}
                    </span>
                  </div>
                  {previewData && (
                    <div className="text-muted text-[11px] flex justify-between">
                      <span>Calendar Days: {previewData.totalCalendarDays}</span>
                      <span>Holidays: {previewData.holidaysEncountered}</span>
                    </div>
                  )}
                  {previewData && previewData.workingDays === 0 && (
                    <p className="text-danger flex items-center gap-1 mt-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Dates fall strictly on weekends/holidays (0 working days).
                    </p>
                  )}
                </div>
              )}

              <FormField label="Reason" required>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for taking leave..."
                  className="w-full px-3 py-2 bg-surface rounded-md border border-border text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </FormField>

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={applyMutation.isPending}
                disabled={previewData?.workingDays === 0}
              >
                Submit Application
              </Button>
            </form>
          </Card>
        </div>

        {/* My Requests History */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                My Leave Requests
              </CardTitle>
              <CardDescription>
                History of leave requests with approval status and comments.
              </CardDescription>
            </CardHeader>

            {requestsLoading ? (
              <div className="p-8 text-center text-muted">Loading requests...</div>
            ) : requests.length === 0 ? (
              <EmptyState
                icon={<Calendar className="w-6 h-6 text-muted" />}
                title="No leave requests"
                description="You haven't submitted any leave requests yet."
              />
            ) : (
              <DataTable<LeaveRequestItem>
                data={requests.map((r) => ({ ...r, id: r._id }))}
                columns={columns}
              />
            )}
          </Card>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {cancelTarget && (
        <Modal
          isOpen={!!cancelTarget}
          onClose={() => setCancelTarget(null)}
          title="Cancel Leave Request"
        >
          <div className="space-y-4">
            <p className="text-sm text-text">
              Are you sure you want to cancel your{' '}
              <strong className="capitalize">{cancelTarget.leaveTypeKey}</strong> leave request for{' '}
              <strong>{cancelTarget.startDate}</strong> to <strong>{cancelTarget.endDate}</strong> ({cancelTarget.workingDays} working days)?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setCancelTarget(null)}>
                Keep Request
              </Button>
              <Button
                variant="danger"
                isLoading={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate(cancelTarget._id)}
              >
                Yes, Cancel Request
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
