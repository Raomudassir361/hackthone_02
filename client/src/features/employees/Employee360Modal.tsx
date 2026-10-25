import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { StatusBadge, StatusType } from '../../components/ui/StatusBadge';
import { FormField } from '../../components/ui/FormField';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../context/AuthContextCore';
import { CreditCard, Mail, Phone, MapPin, Calendar } from 'lucide-react';

export interface EmployeeOverview {
  _id: string;
  code: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  gender?: string;
  departmentId?: { _id: string; name: string; code: string };
  designationId?: { _id: string; title: string };
  joinDate: string;
  exitDate?: string;
  status: string;
  basicSalary: number;
}

interface SalaryData {
  basic: number;
  hra: number;
  medical: number;
  gross: number;
}

export interface Employee360ModalProps {
  employee: EmployeeOverview | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateSuccess?: () => void;
}

export function Employee360Modal({ employee, isOpen, onClose, onUpdateSuccess }: Employee360ModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'salary'>('overview');
  const [salary, setSalary] = useState<SalaryData | null>(null);
  const [editSalary, setEditSalary] = useState<number>(0);
  const [isUpdatingSalary, setIsUpdatingSalary] = useState(false);
  const [salaryMsg, setSalaryMsg] = useState<string | null>(null);

  const isHr = user?.role === 'hr';
  const isSelf = user?.employeeId === employee?._id;

  const loadSalary = async () => {
    if (!employee) return;
    try {
      const res = await apiFetch<SalaryData>(`/employees/${employee._id}/salary`);
      setSalary(res);
      setEditSalary(res.basic);
    } catch (err) {
      console.error('Failed to load salary:', err);
    }
  };

  const handleUpdateSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    setIsUpdatingSalary(true);
    setSalaryMsg(null);
    try {
      const res = await apiFetch<SalaryData>(`/employees/${employee._id}/salary`, {
        method: 'PUT',
        body: JSON.stringify({ basicSalary: editSalary }),
      });
      setSalary(res);
      setSalaryMsg('Salary structure updated successfully!');
      if (onUpdateSuccess) onUpdateSuccess();
    } catch (err: unknown) {
      setSalaryMsg(err instanceof Error ? err.message : 'Failed to update salary');
    } finally {
      setIsUpdatingSalary(false);
    }
  };

  if (!employee) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${employee.name} (${employee.code})`}
      description="Employee 360 profile overview and compensation management."
      className="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex border-b border-border space-x-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-navy'
            }`}
          >
            Overview & Details
          </button>
          <button
            onClick={() => {
              setActiveTab('salary');
              loadSalary();
            }}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'salary'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-navy'
            }`}
          >
            Compensation & Salary
          </button>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between p-3 bg-bg rounded-control border border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                  {employee.name[0]}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-navy">{employee.name}</h4>
                  <p className="text-xs text-muted">
                    {employee.designationId?.title || 'No Designation'} · {employee.departmentId?.name || 'No Dept'}
                  </p>
                </div>
              </div>
              <StatusBadge status={employee.status as StatusType} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-control border border-border flex items-start gap-2">
                <Mail className="w-4 h-4 text-muted shrink-0 mt-0.5" />
                <div>
                  <span className="text-muted block">Email Address</span>
                  <span className="font-semibold text-navy">{employee.email}</span>
                </div>
              </div>

              <div className="p-3 rounded-control border border-border flex items-start gap-2">
                <Phone className="w-4 h-4 text-muted shrink-0 mt-0.5" />
                <div>
                  <span className="text-muted block">Phone</span>
                  <span className="font-semibold text-navy">{employee.phone || 'Not provided'}</span>
                </div>
              </div>

              <div className="p-3 rounded-control border border-border flex items-start gap-2">
                <Calendar className="w-4 h-4 text-muted shrink-0 mt-0.5" />
                <div>
                  <span className="text-muted block">Join Date</span>
                  <span className="font-semibold text-navy">{employee.joinDate}</span>
                </div>
              </div>

              <div className="p-3 rounded-control border border-border flex items-start gap-2">
                <MapPin className="w-4 h-4 text-muted shrink-0 mt-0.5" />
                <div>
                  <span className="text-muted block">Work / Home Address</span>
                  <span className="font-semibold text-navy">{employee.address || 'Not provided'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'salary' && (
          <div className="space-y-4 pt-1">
            {salaryMsg && (
              <div className="p-2.5 rounded-control bg-teal-50 border border-teal-200 text-xs text-primary font-medium">
                {salaryMsg}
              </div>
            )}

            {salary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-3 bg-bg rounded-control border border-border">
                  <span className="text-[10px] text-muted uppercase font-bold tracking-wider">Basic</span>
                  <div className="text-sm font-bold text-navy mt-1">
                    PKR {salary.basic.toLocaleString()}
                  </div>
                </div>

                <div className="p-3 bg-bg rounded-control border border-border">
                  <span className="text-[10px] text-muted uppercase font-bold tracking-wider">HRA (40%)</span>
                  <div className="text-sm font-bold text-navy mt-1">
                    PKR {salary.hra.toLocaleString()}
                  </div>
                </div>

                <div className="p-3 bg-bg rounded-control border border-border">
                  <span className="text-[10px] text-muted uppercase font-bold tracking-wider">Medical (10%)</span>
                  <div className="text-sm font-bold text-navy mt-1">
                    PKR {salary.medical.toLocaleString()}
                  </div>
                </div>

                <div className="p-3 bg-primary/10 rounded-control border border-primary/20">
                  <span className="text-[10px] text-primary uppercase font-bold tracking-wider">Gross (1.5x)</span>
                  <div className="text-sm font-bold text-primary mt-1">
                    PKR {salary.gross.toLocaleString()}
                  </div>
                </div>
              </div>
            )}

            {isHr && !isSelf ? (
              <form onSubmit={handleUpdateSalary} className="space-y-3 pt-2 border-t border-border">
                <h5 className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-primary" />
                  <span>Update Salary Structure</span>
                </h5>
                <FormField
                  label="Monthly Basic Salary (PKR)"
                  type="number"
                  min="0"
                  required
                  value={editSalary}
                  onChange={(e) => setEditSalary(Number(e.target.value))}
                />
                <div className="flex justify-end">
                  <Button type="submit" variant="primary" size="sm" isLoading={isUpdatingSalary}>
                    Update Salary
                  </Button>
                </div>
              </form>
            ) : isSelf ? (
              <p className="text-xs text-muted italic pt-2">
                Note: You cannot edit your own salary structure.
              </p>
            ) : (
              <p className="text-xs text-muted italic pt-2">
                Salary structure is managed exclusively by the HR Department.
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
