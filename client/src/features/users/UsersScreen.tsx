import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { FormField } from '../../components/ui/FormField';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { UserPlus, KeyRound, UserX, UserCheck, Copy, Check } from 'lucide-react';

interface UserItem {
  _id: string;
  email: string;
  role: 'admin' | 'hr' | 'employee';
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

export function UsersScreen() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Create HR Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [hrForm, setHrForm] = useState({
    name: '',
    email: '',
    phone: '',
    joinDate: new Date().toISOString().split('T')[0],
    basicSalary: 75000,
  });

  // One-time password display
  const [oneTimePassword, setOneTimePassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch<UserItem[]>('/users');
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateHr = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch<{
        user: { id: string; email: string; role: 'hr'; isActive: boolean };
        temporaryPassword: string;
      }>('/users/hr', {
        method: 'POST',
        body: JSON.stringify(hrForm),
      });

      setIsCreateModalOpen(false);
      setOneTimePassword(res.temporaryPassword);
      setHrForm({
        name: '',
        email: '',
        phone: '',
        joinDate: new Date().toISOString().split('T')[0],
        basicSalary: 75000,
      });
      loadUsers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to create HR user');
    }
  };

  const handleToggleDeactivate = async (id: string) => {
    try {
      await apiFetch(`/users/${id}/deactivate`, { method: 'PATCH' });
      loadUsers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Action failed');
    }
  };

  const handleResetPassword = async (id: string) => {
    if (!confirm('Generate a new temporary password for this user?')) return;
    try {
      const res = await apiFetch<{ temporaryPassword: string }>(`/users/${id}/reset-password`, {
        method: 'POST',
      });
      setOneTimePassword(res.temporaryPassword);
      loadUsers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Reset failed');
    }
  };

  const copyToClipboard = () => {
    if (!oneTimePassword) return;
    navigator.clipboard.writeText(oneTimePassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold text-navy tracking-tight">Users & Logins</h1>
          <p className="text-sm text-muted mt-1">
            Admin management of HR logins, account status, and credential resets.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-1.5"
        >
          <UserPlus className="w-4 h-4" />
          <span>Create HR Login</span>
        </Button>
      </div>

      {/* Temporary Password Alert Box */}
      {oneTimePassword && (
        <Card className="p-4 bg-amber-50 border-amber-300">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-sm font-bold text-amber-900 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-warn" />
                Temporary Password Generated (One-Time Display)
              </h4>
              <p className="text-xs text-amber-800 mt-1">
                Provide this credential to the user. They will be forced to change it on their first sign-in.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <code className="px-3 py-1.5 bg-surface rounded-control border border-amber-300 font-mono text-sm font-bold text-navy select-all">
                  {oneTimePassword}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  className="bg-white border-amber-300 text-amber-900 flex items-center gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </Button>
              </div>
            </div>
            <button
              onClick={() => setOneTimePassword(null)}
              className="text-amber-700 hover:text-amber-900 text-xs font-semibold p-1"
            >
              Dismiss
            </button>
          </div>
        </Card>
      )}

      {/* Users Table */}
      <DataTable
        columns={[
          { key: 'email', header: 'Email Address' },
          {
            key: 'role',
            header: 'Role',
            render: (u) => (
              <span className="font-semibold text-xs uppercase tracking-wider text-navy/90">
                {u.role}
              </span>
            ),
          },
          {
            key: 'status',
            header: 'Account Status',
            render: (u) => (
              <StatusBadge
                status={u.isActive ? 'approved' : 'rejected'}
                customLabel={u.isActive ? 'Active' : 'Deactivated'}
              />
            ),
          },
          {
            key: 'mustChangePassword',
            header: 'Password Status',
            render: (u) => (
              <span className="text-xs text-muted">
                {u.mustChangePassword ? 'Temporary (Must Change)' : 'Established'}
              </span>
            ),
          },
          {
            key: 'actions',
            header: 'Actions',
            render: (u) => (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleResetPassword(u._id)}
                  title="Reset Temporary Password"
                  className="p-1.5 text-muted hover:text-navy"
                >
                  <KeyRound className="w-4 h-4" />
                </Button>
                {u.role !== 'admin' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleDeactivate(u._id)}
                    title={u.isActive ? 'Deactivate User' : 'Reactivate User'}
                    className={`p-1.5 ${u.isActive ? 'text-danger hover:text-red-700' : 'text-success hover:text-emerald-700'}`}
                  >
                    {u.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                  </Button>
                )}
              </div>
            ),
          },
        ]}
        data={users}
        isLoading={isLoading}
      />

      {/* Create HR Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create HR Login & Employee Record"
        description="Creates an HR account with generated temporary credentials and initial profile."
      >
        <form onSubmit={handleCreateHr} className="space-y-4">
          <FormField
            label="Full Name"
            required
            value={hrForm.name}
            onChange={(e) => setHrForm({ ...hrForm, name: e.target.value })}
            placeholder="e.g. Sarah Khan"
          />

          <FormField
            label="Work Email"
            type="email"
            required
            value={hrForm.email}
            onChange={(e) => setHrForm({ ...hrForm, email: e.target.value })}
            placeholder="hr@company.com"
          />

          <FormField
            label="Phone Number"
            value={hrForm.phone}
            onChange={(e) => setHrForm({ ...hrForm, phone: e.target.value })}
            placeholder="+92 300 1234567"
          />

          <FormField
            label="Join Date"
            type="date"
            required
            value={hrForm.joinDate}
            onChange={(e) => setHrForm({ ...hrForm, joinDate: e.target.value })}
          />

          <FormField
            label="Basic Salary (PKR)"
            type="number"
            required
            value={hrForm.basicSalary}
            onChange={(e) => setHrForm({ ...hrForm, basicSalary: Number(e.target.value) })}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Create HR Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
