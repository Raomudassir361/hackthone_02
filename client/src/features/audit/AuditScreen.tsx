import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { DataTable, Column } from '../../components/ui/DataTable';
import { EmptyState } from '../../components/ui/EmptyState';
import { History, Search, Code2 } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';

interface AuditLogItem {
  id?: string;
  _id: string;
  actorId: {
    _id: string;
    email: string;
    role: string;
  };
  actorRole: string;
  action: string;
  entity: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  createdAt: string;
}

export function AuditScreen() {
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const { data: logs = [], isLoading } = useQuery<AuditLogItem[]>({
    queryKey: ['audit-logs', actionFilter, entityFilter],
    queryFn: async () => {
      let url = '/audit?';
      if (actionFilter) url += `action=${encodeURIComponent(actionFilter)}&`;
      if (entityFilter) url += `entity=${encodeURIComponent(entityFilter)}&`;
      return apiFetch<AuditLogItem[]>(url);
    },
  });

  const columns: Column<AuditLogItem>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      render: (r) => (
        <span className="text-xs font-mono text-muted">
          {new Date(r.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'actor',
      header: 'Actor',
      render: (r) => (
        <div>
          <span className="font-semibold text-text text-xs block">
            {r.actorId?.email || 'System'}
          </span>
          <span className="font-mono text-[10px] uppercase text-primary font-bold">
            {r.actorRole}
          </span>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (r) => (
        <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-xs font-semibold">
          {r.action}
        </span>
      ),
    },
    {
      key: 'entity',
      header: 'Entity / Target',
      render: (r) => (
        <div className="text-xs">
          <span className="font-medium text-text block capitalize">{r.entity}</span>
          {r.entityId && (
            <span className="font-mono text-[10px] text-muted block truncate max-w-[120px]">
              ID: {r.entityId}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'diff',
      header: 'State Diff',
      render: (r) => (
        <button
          onClick={() => setSelectedLog(r)}
          className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
        >
          <Code2 className="w-3.5 h-3.5" />
          View JSON
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text">System Audit Trail</h1>
        <p className="text-sm text-muted mt-1">
          Cryptographically immutable, append-only ledger tracking all administrative, HR, and workflow actions.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-surface rounded-card border border-border">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-muted" />
          <input
            type="text"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            placeholder="Filter by action (e.g. CREATE_EMPLOYEE)..."
            className="w-full px-3 py-1.5 bg-bg rounded-md border border-border text-text text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2 min-w-[160px]">
          <input
            type="text"
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            placeholder="Entity (e.g. Employee)..."
            className="w-full px-3 py-1.5 bg-bg rounded-md border border-border text-text text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Audit Ledger ({logs.length} entries)
          </CardTitle>
          <CardDescription>
            Logs are stored strictly append-only; update and deletion code paths are permanently omitted.
          </CardDescription>
        </CardHeader>

        {isLoading ? (
          <div className="p-8 text-center text-muted">Loading audit entries...</div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={<History className="w-6 h-6 text-muted" />}
            title="No audit entries"
            description="No logs match your filter criteria."
          />
        ) : (
          <DataTable<AuditLogItem>
            data={logs.map((l) => ({ ...l, id: l._id }))}
            columns={columns}
          />
        )}
      </Card>

      {/* JSON Viewer Modal */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title={`Audit Event: ${selectedLog.action}`}
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="p-3 bg-bg rounded-md border border-border text-xs space-y-1">
              <div>
                <span className="text-muted">Actor:</span>{' '}
                <strong className="text-text">{selectedLog.actorId?.email} ({selectedLog.actorRole})</strong>
              </div>
              <div>
                <span className="text-muted">Entity:</span>{' '}
                <strong className="text-text">{selectedLog.entity} ({selectedLog.entityId || 'N/A'})</strong>
              </div>
              <div>
                <span className="text-muted">Timestamp:</span>{' '}
                <span className="text-text">{new Date(selectedLog.createdAt).toISOString()}</span>
              </div>
            </div>

            {Boolean(selectedLog.before) && (
              <div>
                <h4 className="text-xs font-bold text-muted uppercase mb-1">State Before</h4>
                <pre className="p-3 bg-bg rounded-md border border-border text-xs font-mono overflow-x-auto text-amber-700">
                  {JSON.stringify(selectedLog.before, null, 2)}
                </pre>
              </div>
            )}

            {Boolean(selectedLog.after) && (
              <div>
                <h4 className="text-xs font-bold text-muted uppercase mb-1">State After</h4>
                <pre className="p-3 bg-bg rounded-md border border-border text-xs font-mono overflow-x-auto text-emerald-700">
                  {JSON.stringify(selectedLog.after, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
