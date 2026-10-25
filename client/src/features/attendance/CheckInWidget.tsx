import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge, StatusType } from '../../components/ui/StatusBadge';
import { apiFetch } from '../../lib/api';
import { Clock, CheckCircle2, AlertCircle, LogIn, LogOut, ShieldAlert } from 'lucide-react';

export interface TodayAttendanceRecord {
  _id: string;
  date: string;
  checkInAt: string;
  checkOutAt?: string;
  status: string;
  workedMinutes?: number;
  isWorkingDay: boolean;
}

export interface CheckInWidgetProps {
  initialRecord?: TodayAttendanceRecord | null;
  onStatusChange?: (record: TodayAttendanceRecord) => void;
}

export function CheckInWidget({ initialRecord, onStatusChange }: CheckInWidgetProps) {
  const [record, setRecord] = useState<TodayAttendanceRecord | null>(initialRecord || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCheckedIn = Boolean(record?.checkInAt);
  const isCheckedOut = Boolean(record?.checkOutAt);

  const formatServerTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handleAction = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!isCheckedIn) {
        // Check in
        const res = await apiFetch<TodayAttendanceRecord>('/attendance/check-in', {
          method: 'POST',
          body: JSON.stringify({}),
        });
        setRecord(res);
        if (onStatusChange) onStatusChange(res);
      } else if (!isCheckedOut) {
        // Check out
        const res = await apiFetch<TodayAttendanceRecord>('/attendance/check-out', {
          method: 'POST',
          body: JSON.stringify({}),
        });
        setRecord(res);
        if (onStatusChange) onStatusChange(res);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-5 shadow-sm border-border bg-surface">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Status and Server Timestamp */}
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-navy">Daily Attendance</h3>
              {record && (
                <StatusBadge status={record.status as StatusType} />
              )}
            </div>

            <p className="text-xs text-muted mt-1">
              {!isCheckedIn
                ? 'Ready for today’s shift. Office start: 09:00 (Grace period until 09:15).'
                : !isCheckedOut
                ? `Checked in at ${formatServerTime(record?.checkInAt)}. Server time stamped.`
                : `Shift completed. Checked out at ${formatServerTime(record?.checkOutAt)} (${record?.workedMinutes} mins worked).`}
            </p>

            {record && !record.isWorkingDay && (
              <p className="text-[11px] text-amber-700 font-medium mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Non-working day record (recorded but excluded from attendance rates).</span>
              </p>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div>
          {!isCheckedOut ? (
            <Button
              variant={!isCheckedIn ? 'primary' : 'accent'}
              size="md"
              onClick={handleAction}
              isLoading={isLoading}
              className="w-full sm:w-auto flex items-center gap-2 px-5 py-2.5 shadow-sm"
            >
              {!isCheckedIn ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Check In Now</span>
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4" />
                  <span>Check Out</span>
                </>
              )}
            </Button>
          ) : (
            <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-control bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span>Shift Concluded</span>
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-3 p-2.5 rounded-control bg-red-50 border border-red-200 text-xs text-danger font-medium flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </Card>
  );
}
