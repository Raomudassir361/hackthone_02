import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { FormField } from '../../components/ui/FormField';
import { Button } from '../../components/ui/Button';
import { StatusBadge, StatusType } from '../../components/ui/StatusBadge';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../context/AuthContextCore';
import { Mail, Calendar, Building, Briefcase, CheckCircle2 } from 'lucide-react';

interface FullProfile {
  _id: string;
  code: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  gender?: string;
  departmentId?: { name: string; code: string };
  designationId?: { title: string };
  joinDate: string;
  status: string;
  basicSalary?: number;
}

export function MyProfileScreen() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      if (!user?.employeeId) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await apiFetch<FullProfile>(`/employees/${user.employeeId}`);
        setProfile(res);
        setPhone(res.phone || '');
        setAddress(res.address || '');
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await apiFetch<FullProfile>('/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ phone, address }),
      });
      setProfile(res);
      setMessage('Contact details updated successfully!');
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <Card className="text-center p-8">
        <h3 className="text-lg font-bold text-navy">No Linked Employee Record</h3>
        <p className="text-sm text-muted mt-2">
          Your account is registered as an administrative login without a personal employee record.
        </p>
      </Card>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="pb-2 border-b border-border">
        <h1 className="text-2xl font-bold text-navy tracking-tight">My Profile</h1>
        <p className="text-sm text-muted mt-1">
          Review your employee record and manage your contact details.
        </p>
      </div>

      {message && (
        <div className="p-3 bg-teal-50 border border-teal-200 rounded-control text-xs text-primary font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Header Profile Badge */}
      <Card className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold">
            {profile.name[0]}
          </div>
          <div>
            <h2 className="text-lg font-bold text-navy">{profile.name}</h2>
            <div className="flex items-center gap-2 text-xs text-muted mt-0.5">
              <span className="font-mono font-bold text-primary">{profile.code}</span>
              <span>·</span>
              <span>{profile.designationId?.title || 'Designation'}</span>
            </div>
          </div>
        </div>

        <StatusBadge status={profile.status as StatusType} />
      </Card>

      {/* Read-Only Employment Information */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Employment Information</CardTitle>
            <CardDescription>
              Job, department, and company parameters set by HR Administration.
            </CardDescription>
          </div>
        </CardHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-bg rounded-control border border-border flex items-center gap-3">
            <Mail className="w-4 h-4 text-muted shrink-0" />
            <div>
              <span className="text-muted block">Work Email</span>
              <span className="font-semibold text-navy">{profile.email}</span>
            </div>
          </div>

          <div className="p-3 bg-bg rounded-control border border-border flex items-center gap-3">
            <Building className="w-4 h-4 text-muted shrink-0" />
            <div>
              <span className="text-muted block">Department</span>
              <span className="font-semibold text-navy">{profile.departmentId?.name || '—'}</span>
            </div>
          </div>

          <div className="p-3 bg-bg rounded-control border border-border flex items-center gap-3">
            <Briefcase className="w-4 h-4 text-muted shrink-0" />
            <div>
              <span className="text-muted block">Designation</span>
              <span className="font-semibold text-navy">{profile.designationId?.title || '—'}</span>
            </div>
          </div>

          <div className="p-3 bg-bg rounded-control border border-border flex items-center gap-3">
            <Calendar className="w-4 h-4 text-muted shrink-0" />
            <div>
              <span className="text-muted block">Official Join Date</span>
              <span className="font-semibold text-navy">{profile.joinDate}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Editable Self-Service Contact Details */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Contact Details</CardTitle>
            <CardDescription>
              Per company policy, employees may update their phone number and residential address.
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+92 300 1234567"
            />

            <FormField
              label="Residential Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Karachi, Pakistan"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" variant="primary" size="sm" isLoading={isSaving}>
              Save Contact Information
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
