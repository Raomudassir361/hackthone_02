import React, { useState, useEffect } from 'react';
import { apiFetch, API_BASE } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { StatusBadge, StatusType } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { FormField } from '../../components/ui/FormField';
import { CsvImportModal } from './CsvImportModal';
import { Employee360Modal, EmployeeOverview } from './Employee360Modal';
import { useAuth } from '../../context/AuthContextCore';
import {
  UserPlus,
  Upload,
  Download,
  Search,
  Filter,
  KeyRound,
  Copy,
  Check,
} from 'lucide-react';

interface PaginatedEmployees {
  data: EmployeeOverview[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface Department {
  _id: string;
  name: string;
}

interface Designation {
  _id: string;
  title: string;
}

export function EmployeesScreen() {
  const { user } = useAuth();
  const isHrOrAdmin = user?.role === 'hr' || user?.role === 'admin';

  const [employees, setEmployees] = useState<EmployeeOverview[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeOverview | null>(null);

  // Temporary password display
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Add Employee Form State
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    departmentId: '',
    designationId: '',
    joinDate: new Date().toISOString().split('T')[0],
    basicSalary: 60000,
    status: 'active',
  });

  const loadData = React.useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: '15',
      });
      if (search) queryParams.set('search', search);
      if (selectedDept) queryParams.set('departmentId', selectedDept);
      if (selectedStatus) queryParams.set('status', selectedStatus);

      const res = await apiFetch<PaginatedEmployees>(`/employees?${queryParams.toString()}`);
      setEmployees(res.data);
      setPagination({
        page: res.pagination.page,
        totalPages: res.pagination.totalPages,
        total: res.pagination.total,
      });
    } catch (err) {
      console.error('Failed to load employees:', err);
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedDept, selectedStatus]);

  const loadFilters = async () => {
    try {
      const [depts, desigs] = await Promise.all([
        apiFetch<Department[]>('/departments'),
        apiFetch<Designation[]>('/designations'),
      ]);
      setDepartments(depts);
      setDesignations(desigs);
      if (depts.length > 0) setAddForm((prev) => ({ ...prev, departmentId: depts[0]._id }));
      if (desigs.length > 0) setAddForm((prev) => ({ ...prev, designationId: desigs[0]._id }));
    } catch (err) {
      console.error('Failed to load filters:', err);
    }
  };

  useEffect(() => {
    loadFilters();
  }, []);

  useEffect(() => {
    loadData(1);
  }, [loadData]);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch<{
        employee: EmployeeOverview;
        temporaryPassword: string;
      }>('/employees', {
        method: 'POST',
        body: JSON.stringify(addForm),
      });

      setIsAddModalOpen(false);
      setTempPassword(res.temporaryPassword);
      setAddForm({
        name: '',
        email: '',
        phone: '',
        address: '',
        departmentId: departments[0]?._id || '',
        designationId: designations[0]?._id || '',
        joinDate: new Date().toISOString().split('T')[0],
        basicSalary: 60000,
        status: 'active',
      });
      loadData(1);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to create employee');
    }
  };

  const handleExportCsv = () => {
    const token = localStorage.getItem('hcm_token');
    const url = `${API_BASE}/employees/export`;
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = 'employees.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch((err) => alert(`Export error: ${err.message}`));
  };

  const copyPassword = () => {
    if (!tempPassword) return;
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold text-navy tracking-tight">Employees Directory</h1>
          <p className="text-sm text-muted mt-1">
            Total team headcount: <span className="font-semibold text-navy">{pagination.total}</span>
          </p>
        </div>

        {isHrOrAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCsvModalOpen(true)}
              className="flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5 text-primary" />
              <span>Import CSV</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Employee</span>
            </Button>
          </div>
        )}
      </div>

      {/* Temporary Password Box */}
      {tempPassword && (
        <Card className="p-4 bg-teal-50 border-teal-300">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-sm font-bold text-teal-900 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-primary" />
                Employee Account Login Created (One-Time Temporary Password)
              </h4>
              <p className="text-xs text-teal-800 mt-1">
                Share this login credential with the newly registered employee. They must change it upon their first sign-in.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <code className="px-3 py-1.5 bg-surface rounded-control border border-teal-300 font-mono text-sm font-bold text-navy select-all">
                  {tempPassword}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyPassword}
                  className="bg-white border-teal-300 text-teal-900 flex items-center gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </Button>
              </div>
            </div>
            <button
              onClick={() => setTempPassword(null)}
              className="text-teal-700 hover:text-teal-900 text-xs font-semibold p-1"
            >
              Dismiss
            </button>
          </div>
        </Card>
      )}

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted" />
          <input
            type="text"
            placeholder="Search by name, employee code or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-control border border-border bg-surface text-sm text-navy placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-muted hidden sm:block shrink-0" />
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 rounded-control border border-border bg-surface text-xs font-semibold text-navy focus:outline-none focus:border-primary"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-control border border-border bg-surface text-xs font-semibold text-navy focus:outline-none focus:border-primary"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="probation">Probation</option>
            <option value="inactive">Inactive</option>
            <option value="exited">Exited</option>
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <DataTable
        columns={[
          {
            key: 'code',
            header: 'Code',
            render: (e) => <span className="font-mono font-bold text-xs text-primary">{e.code}</span>,
          },
          {
            key: 'name',
            header: 'Employee Name',
            render: (e) => (
              <div>
                <span className="font-semibold text-navy block">{e.name}</span>
                <span className="text-xs text-muted block">{e.email}</span>
              </div>
            ),
          },
          {
            key: 'department',
            header: 'Department',
            render: (e) => (
              <span className="text-xs text-navy/90 font-medium">
                {e.departmentId?.name || '—'}
              </span>
            ),
          },
          {
            key: 'designation',
            header: 'Designation',
            render: (e) => (
              <span className="text-xs text-muted font-medium">
                {e.designationId?.title || '—'}
              </span>
            ),
          },
          {
            key: 'joinDate',
            header: 'Join Date',
            render: (e) => <span className="text-xs text-navy">{e.joinDate}</span>,
          },
          {
            key: 'status',
            header: 'Status',
            render: (e) => <StatusBadge status={e.status as StatusType} />,
          },
        ]}
        data={employees}
        isLoading={isLoading}
        onRowClick={(emp) => setSelectedEmployee(emp)}
        pagination={{
          page: pagination.page,
          totalPages: pagination.totalPages,
          onPageChange: (newPage) => loadData(newPage),
        }}
        emptyTitle="No Employees Found"
        emptyDescription="Start building your team by clicking 'Add Employee' or using the CSV import tool."
      />

      {/* Add Employee Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Employee"
        description="Creates employee record and workplace account credentials."
        className="max-w-xl"
      >
        <form onSubmit={handleCreateEmployee} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Full Name"
              required
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              placeholder="e.g. Tariq Mehmood"
            />

            <FormField
              label="Work Email"
              type="email"
              required
              value={addForm.email}
              onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
              placeholder="tariq@company.com"
            />

            <FormField
              label="Phone Number"
              value={addForm.phone}
              onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
              placeholder="+92 300 1234567"
            />

            <FormField
              label="Home / Work Address"
              value={addForm.address}
              onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
              placeholder="Karachi, Pakistan"
            />

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-navy/80 mb-1">
                Department
              </label>
              <select
                required
                value={addForm.departmentId}
                onChange={(e) => setAddForm({ ...addForm, departmentId: e.target.value })}
                className="w-full rounded-control border border-border bg-surface px-3 py-2 text-sm text-navy focus:outline-none focus:border-primary"
              >
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-navy/80 mb-1">
                Designation
              </label>
              <select
                required
                value={addForm.designationId}
                onChange={(e) => setAddForm({ ...addForm, designationId: e.target.value })}
                className="w-full rounded-control border border-border bg-surface px-3 py-2 text-sm text-navy focus:outline-none focus:border-primary"
              >
                {designations.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </div>

            <FormField
              label="Join Date"
              type="date"
              required
              value={addForm.joinDate}
              onChange={(e) => setAddForm({ ...addForm, joinDate: e.target.value })}
            />

            <FormField
              label="Monthly Basic Salary (PKR)"
              type="number"
              min="0"
              required
              value={addForm.basicSalary}
              onChange={(e) => setAddForm({ ...addForm, basicSalary: Number(e.target.value) })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Register Employee
            </Button>
          </div>
        </form>
      </Modal>

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onImportSuccess={() => loadData(1)}
      />

      {/* Employee 360 Modal */}
      <Employee360Modal
        employee={selectedEmployee}
        isOpen={Boolean(selectedEmployee)}
        onClose={() => setSelectedEmployee(null)}
        onUpdateSuccess={() => loadData(pagination.page)}
      />
    </div>
  );
}
