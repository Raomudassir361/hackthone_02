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
import { Inbox, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface InboxItem {
  id?: string;
  _id: string;
  employeeId: {
    _id: string;
    name: string;
    code: string;
  };
  leaveTypeKey: string;
  startDate: string;
  endDate: string;
  workingDays: number;
  reason: string;
  status: 'pending';
  createdAt: string;
}

export function LeaveInboxTab() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [activeItem, setActiveItem] = useState<InboxItem | null>(null);
  const [decisionAction, setDecisionAction] = useState<'approved' | 'rejected'>('approved');
  const [comment, setComment] = useState('');

  const { data: items = [], isLoading } = useQuery<InboxItem[]>({
    queryKey: ['leave-inbox'],
    queryFn: async () => {
      return apiFetch<InboxItem[]>('/leave/inbox');
    },
  });

  const decideMutation = useMutation({
    mutationFn: async ({ id, status, comment }: { id: string; status: 'approved' | 'rejected'; comment: string }) => {
      return apiFetch(`/leave/${id}/decide`, {
        method: 'POST',
        body: JSON.stringify({ status, comment }),
      });
    },
    onSuccess: (_, vars) => {
      showToast(
        `Successfully ${vars.status === 'approved' ? 'approved' : 'rejected'} leave request.`,
        vars.status === 'approved' ? 'success' : 'info'
      );
      setActiveItem(null);
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['leave-inbox'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      queryClient.invalidateQueries({ queryKey: ['leave-my-requests'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Could not decide leave request.';
      showToast(msg, 'error');
    },
  });

  const handleOpenDecision = (item: InboxItem, action: 'approved' | 'rejected') => {
    setActiveItem(item);
    setDecisionAction(action);
    setComment('');
  };

  const handleConfirmDecision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem) return;
    if (!comment.trim()) {
      showToast('Please provide a comment for audit logging.', 'info');
      return;
    }

    decideMutation.mutate({
      id: activeItem._id,
      status: decisionAction,
      comment: comment.trim(),
    });
  };

  const columns: Column<InboxItem>[] = [
    {
      key: 'employee',
      header: 'Employee',
      render: (r: InboxItem) => (
        <div>
          <span className="font-semibold text-text">{r.employeeId?.name || 'Unknown'}</span>
          <span className="block text-xs font-mono text-muted">{r.employeeId?.code || ''}</span>
        </div>
      ),
    },
    {
      key: 'leaveTypeKey',
      header: 'Leave Type',
      render: (r: InboxItem) => (
        <span className="font-medium capitalize text-text">{r.leaveTypeKey}</span>
      ),
    },
    {
      key: 'dates',
      header: 'Dates',
      render: (r: InboxItem) => (
        <div className="text-xs">
          <span className="font-medium text-text">{r.startDate}</span>
          <span className="text-muted"> to </span>
          <span className="font-medium text-text">{r.endDate}</span>
        </div>
      ),
    },
    {
      key: 'workingDays',
      header: 'Working Days',
      render: (r: InboxItem) => (
        <span className="font-bold text-primary">{r.workingDays}</span>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (r: InboxItem) => (
        <p className="max-w-xs text-xs text-text truncate" title={r.reason}>
          {r.reason}
        </p>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: () => (
        <StatusBadge status={'pending' as StatusType} />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r: InboxItem) => {
        const isSelf = user?.employeeId === r.employeeId?._id;
        if (isSelf) {
          return (
            <span className="text-xs text-muted italic flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              Self (Blocked)
            </span>
          );
        }

        return (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="text-success hover:bg-success/10 border-success/30"
              onClick={() => handleOpenDecision(r, 'approved')}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Approve
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-danger hover:bg-danger/10"
              onClick={() => handleOpenDecision(r, 'rejected')}
            >
              <XCircle className="w-3.5 h-3.5 mr-1" />
              Reject
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="w-5 h-5 text-primary" />
            Leave Approvals Inbox
          </CardTitle>
          <CardDescription>
            Pending leave applications awaiting administrative or HR approval. Self-approval is strictly forbidden.
          </CardDescription>
        </CardHeader>

        {isLoading ? (
          <div className="p-8 text-center text-muted">Loading inbox...</div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Inbox className="w-6 h-6 text-muted" />}
            title="All caught up"
            description="There are no pending leave requests awaiting approval."
          />
        ) : (
          <DataTable<InboxItem>
            data={items.map((it) => ({ ...it, id: it._id }))}
            columns={columns}
          />
        )}
      </Card>

      {/* Decision Modal */}
      {activeItem && (
        <Modal
          isOpen={!!activeItem}
          onClose={() => setActiveItem(null)}
          title={decisionAction === 'approved' ? 'Approve Leave Request' : 'Reject Leave Request'}
        >
          <form onSubmit={handleConfirmDecision} className="space-y-4">
            <div className="p-3 bg-bg rounded-md border border-border text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted">Employee:</span>
                <span className="font-semibold text-text">{activeItem.employeeId?.name} ({activeItem.employeeId?.code})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Type:</span>
                <span className="font-medium text-text capitalize">{activeItem.leaveTypeKey}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Duration:</span>
                <span className="font-medium text-text">{activeItem.startDate} to {activeItem.endDate} ({activeItem.workingDays} working days)</span>
              </div>
              <div className="pt-1 border-t border-border/50">
                <span className="text-muted block">Applicant Reason:</span>
                <p className="text-text italic mt-0.5">{activeItem.reason}</p>
              </div>
            </div>

            <FormField label={decisionAction === 'approved' ? 'Approval Remarks' : 'Rejection Reason'} required>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={decisionAction === 'approved' ? 'Approved as per company quota...' : 'Reason for rejecting this request...'}
                className="w-full px-3 py-2 bg-surface rounded-md border border-border text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </FormField>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setActiveItem(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant={decisionAction === 'approved' ? 'primary' : 'danger'}
                isLoading={decideMutation.isPending}
              >
                {decisionAction === 'approved' ? 'Confirm Approval' : 'Confirm Rejection'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
