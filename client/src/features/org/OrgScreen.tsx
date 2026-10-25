import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { FormField } from '../../components/ui/FormField';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContextCore';
import { MapPin, Plus, Trash2 } from 'lucide-react';

interface SettingsData {
  companyName: string;
  timezone: string;
  officeStart: string;
  graceMinutes: number;
  halfDayHours: number;
  weekendDays: number[];
  officeLat: number;
  officeLng: number;
  officeRadiusM: number;
  hraPct: number;
  medicalPct: number;
}

interface Department {
  _id: string;
  name: string;
  code: string;
}

interface Designation {
  _id: string;
  title: string;
}

interface LeaveType {
  _id: string;
  key: string;
  name: string;
  yearlyQuota: number | null;
  isPaid: boolean;
}

interface Holiday {
  _id: string;
  date: string;
  name: string;
}

export function OrgScreen() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [activeTab, setActiveTab] = useState<'rules' | 'departments' | 'designations' | 'leaves' | 'holidays'>('rules');

  // Settings state
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);

  // Lists state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  // Modals state
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [newDept, setNewDept] = useState({ name: '', code: '' });

  const [isDesigModalOpen, setIsDesigModalOpen] = useState(false);
  const [newDesig, setNewDesig] = useState({ title: '' });

  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ date: '', name: '' });

  const loadAll = async () => {
    try {
      const [s, dept, des, lt, hol] = await Promise.all([
        apiFetch<SettingsData>('/settings'),
        apiFetch<Department[]>('/departments'),
        apiFetch<Designation[]>('/designations'),
        apiFetch<LeaveType[]>('/leave-types'),
        apiFetch<Holiday[]>('/holidays'),
      ]);
      setSettings(s);
      setDepartments(dept);
      setDesignations(des);
      setLeaveTypes(lt);
      setHolidays(hol);
    } catch (err) {
      console.error('Failed to load organization data:', err);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings || !isAdmin) return;
    setIsSavingSettings(true);
    setSettingsMsg(null);
    try {
      const updated = await apiFetch<SettingsData>('/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      setSettings(updated);
      setSettingsMsg('Company rules updated successfully!');
    } catch (err: unknown) {
      setSettingsMsg(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!settings) return;
        setSettings({
          ...settings,
          officeLat: Number(pos.coords.latitude.toFixed(6)),
          officeLng: Number(pos.coords.longitude.toFixed(6)),
        });
      },
      (err) => {
        alert(`Location access denied or unavailable: ${err.message}`);
      }
    );
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await apiFetch<Department>('/departments', {
        method: 'POST',
        body: JSON.stringify(newDept),
      });
      setDepartments((prev) => [...prev, created]);
      setIsDeptModalOpen(false);
      setNewDept({ name: '', code: '' });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error creating department');
    }
  };

  const handleDeleteDepartment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return;
    try {
      await apiFetch(`/departments/${id}`, { method: 'DELETE' });
      setDepartments((prev) => prev.filter((d) => d._id !== id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleCreateDesignation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await apiFetch<Designation>('/designations', {
        method: 'POST',
        body: JSON.stringify(newDesig),
      });
      setDesignations((prev) => [...prev, created]);
      setIsDesigModalOpen(false);
      setNewDesig({ title: '' });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error creating designation');
    }
  };

  const handleCreateHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await apiFetch<Holiday>('/holidays', {
        method: 'POST',
        body: JSON.stringify(newHoliday),
      });
      setHolidays((prev) => [...prev, created]);
      setIsHolidayModalOpen(false);
      setNewHoliday({ date: '', name: '' });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error creating holiday');
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    try {
      await apiFetch(`/holidays/${id}`, { method: 'DELETE' });
      setHolidays((prev) => prev.filter((h) => h._id !== id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold text-navy tracking-tight">Organization Setup</h1>
          <p className="text-sm text-muted mt-1">
            Configure office hours, attendance geolocation radius, departments and leave policies.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border space-x-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('rules')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'rules'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted hover:text-navy'
          }`}
        >
          Company & Rules
        </button>
        <button
          onClick={() => setActiveTab('departments')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'departments'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted hover:text-navy'
          }`}
        >
          Departments ({departments.length})
        </button>
        <button
          onClick={() => setActiveTab('designations')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'designations'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted hover:text-navy'
          }`}
        >
          Designations ({designations.length})
        </button>
        <button
          onClick={() => setActiveTab('leaves')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'leaves'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted hover:text-navy'
          }`}
        >
          Leave Types ({leaveTypes.length})
        </button>
        <button
          onClick={() => setActiveTab('holidays')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'holidays'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted hover:text-navy'
          }`}
        >
          Holidays ({holidays.length})
        </button>
      </div>

      {/* Tab 1: Rules */}
      {activeTab === 'rules' && settings && (
        <Card className="max-w-3xl">
          <CardHeader>
            <div>
              <CardTitle>Attendance & Payroll Rules</CardTitle>
              <CardDescription>
                Updates apply to new attendance and payroll calculations (with rule snapshots preserved).
              </CardDescription>
            </div>
          </CardHeader>

          {settingsMsg && (
            <div className="mb-4 p-3 rounded-control bg-teal-50 border border-teal-200 text-xs text-primary font-medium">
              {settingsMsg}
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Company Name"
                disabled={!isAdmin}
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
              />

              <FormField
                label="Company Timezone"
                disabled={!isAdmin}
                value={settings.timezone}
                onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              />

              <FormField
                label="Office Start Time (HH:MM)"
                disabled={!isAdmin}
                value={settings.officeStart}
                onChange={(e) => setSettings({ ...settings, officeStart: e.target.value })}
              />

              <FormField
                label="Grace Period (Minutes)"
                type="number"
                disabled={!isAdmin}
                value={settings.graceMinutes}
                onChange={(e) => setSettings({ ...settings, graceMinutes: Number(e.target.value) })}
              />

              <FormField
                label="Half Day Min Hours"
                type="number"
                disabled={!isAdmin}
                value={settings.halfDayHours}
                onChange={(e) => setSettings({ ...settings, halfDayHours: Number(e.target.value) })}
              />

              <FormField
                label="Office Radius (Meters)"
                type="number"
                disabled={!isAdmin}
                value={settings.officeRadiusM}
                onChange={(e) => setSettings({ ...settings, officeRadiusM: Number(e.target.value) })}
              />
            </div>

            {/* Geolocation Section */}
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-navy/80">
                  Office Location Coordinates
                </span>
                {isAdmin && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleUseCurrentLocation}
                    className="flex items-center gap-1.5"
                  >
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span>Use My Current Location</span>
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="Office Latitude"
                  type="number"
                  step="any"
                  disabled={!isAdmin}
                  value={settings.officeLat}
                  onChange={(e) => setSettings({ ...settings, officeLat: Number(e.target.value) })}
                />
                <FormField
                  label="Office Longitude"
                  type="number"
                  step="any"
                  disabled={!isAdmin}
                  value={settings.officeLng}
                  onChange={(e) => setSettings({ ...settings, officeLng: Number(e.target.value) })}
                />
              </div>
            </div>

            {isAdmin && (
              <div className="pt-4 flex justify-end">
                <Button type="submit" variant="primary" isLoading={isSavingSettings}>
                  Save Rule Changes
                </Button>
              </div>
            )}
          </form>
        </Card>
      )}

      {/* Tab 2: Departments */}
      {activeTab === 'departments' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted">Manage functional units across the organization.</p>
            {isAdmin && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsDeptModalOpen(true)}
                className="flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Department</span>
              </Button>
            )}
          </div>

          <DataTable
            columns={[
              { key: 'name', header: 'Department Name' },
              { key: 'code', header: 'Code' },
              {
                key: 'actions',
                header: 'Actions',
                render: (row) =>
                  isAdmin ? (
                    <button
                      onClick={() => handleDeleteDepartment(row._id)}
                      className="text-red-500 hover:text-red-700 p-1 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : null,
              },
            ]}
            data={departments}
            emptyTitle="No Departments Added"
            emptyDescription="Create your first department (e.g., Engineering, HR, Sales)."
          />
        </div>
      )}

      {/* Tab 3: Designations */}
      {activeTab === 'designations' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted">Manage company job titles and positions.</p>
            {isAdmin && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsDesigModalOpen(true)}
                className="flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Designation</span>
              </Button>
            )}
          </div>

          <DataTable
            columns={[
              { key: 'title', header: 'Designation Title' },
            ]}
            data={designations}
            emptyTitle="No Designations Added"
            emptyDescription="Add positions (e.g. Senior Software Engineer, HR Specialist)."
          />
        </div>
      )}

      {/* Tab 4: Leave Types */}
      {activeTab === 'leaves' && (
        <div className="space-y-4">
          <p className="text-sm text-muted">Standard leave quotas configured for all team members.</p>
          <DataTable
            columns={[
              { key: 'key', header: 'Key' },
              { key: 'name', header: 'Leave Name' },
              {
                key: 'yearlyQuota',
                header: 'Yearly Quota',
                render: (r) => (r.yearlyQuota == null ? 'Unlimited' : `${r.yearlyQuota} days`),
              },
              {
                key: 'isPaid',
                header: 'Paid Leave',
                render: (r) => (r.isPaid ? 'Yes' : 'No'),
              },
            ]}
            data={leaveTypes}
          />
        </div>
      )}

      {/* Tab 5: Holidays */}
      {activeTab === 'holidays' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted">Public and company holidays (excluded from leave deductions).</p>
            {isAdmin && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsHolidayModalOpen(true)}
                className="flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Holiday</span>
              </Button>
            )}
          </div>

          <DataTable
            columns={[
              { key: 'date', header: 'Date (YYYY-MM-DD)' },
              { key: 'name', header: 'Holiday Name' },
              {
                key: 'actions',
                header: 'Actions',
                render: (row) =>
                  isAdmin ? (
                    <button
                      onClick={() => handleDeleteHoliday(row._id)}
                      className="text-red-500 hover:text-red-700 p-1 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : null,
              },
            ]}
            data={holidays}
            emptyTitle="No Holidays Added"
            emptyDescription="Add public holidays to ensure correct working-day calculations."
          />
        </div>
      )}

      {/* Add Dept Modal */}
      <Modal
        isOpen={isDeptModalOpen}
        onClose={() => setIsDeptModalOpen(false)}
        title="Add Department"
      >
        <form onSubmit={handleCreateDepartment} className="space-y-4">
          <FormField
            label="Department Name"
            required
            value={newDept.name}
            onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
            placeholder="e.g. Engineering"
          />
          <FormField
            label="Department Code"
            required
            value={newDept.code}
            onChange={(e) => setNewDept({ ...newDept, code: e.target.value })}
            placeholder="e.g. ENG"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsDeptModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Department
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Desig Modal */}
      <Modal
        isOpen={isDesigModalOpen}
        onClose={() => setIsDesigModalOpen(false)}
        title="Add Designation"
      >
        <form onSubmit={handleCreateDesignation} className="space-y-4">
          <FormField
            label="Designation Title"
            required
            value={newDesig.title}
            onChange={(e) => setNewDesig({ title: e.target.value })}
            placeholder="e.g. Lead Developer"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsDesigModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Designation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Holiday Modal */}
      <Modal
        isOpen={isHolidayModalOpen}
        onClose={() => setIsHolidayModalOpen(false)}
        title="Add Public Holiday"
      >
        <form onSubmit={handleCreateHoliday} className="space-y-4">
          <FormField
            label="Holiday Date"
            type="date"
            required
            value={newHoliday.date}
            onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
          />
          <FormField
            label="Holiday Name"
            required
            value={newHoliday.name}
            onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
            placeholder="e.g. Pakistan Day"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsHolidayModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Holiday
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
