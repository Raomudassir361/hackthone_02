import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContextCore';
import { CheckInWidget, TodayAttendanceRecord } from './CheckInWidget';
import { MyAttendanceCalendar } from './MyAttendanceCalendar';
import { AttendanceBoard } from './AttendanceBoard';
import { apiFetch } from '../../lib/api';

export function AttendanceScreen() {
  const { user } = useAuth();
  const isHrOrAdmin = user?.role === 'hr' || user?.role === 'admin';
  const [todayRecord, setTodayRecord] = useState<TodayAttendanceRecord | null>(null);

  // If user has employee role or is HR with linked employee, load today's attendance state
  useEffect(() => {
    async function loadToday() {
      if (!user?.employeeId) return;
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const res = await apiFetch<{ rows: Array<{ employee: { id: string }; date: string; checkInAt?: string; checkOutAt?: string; status: string; workedMinutes?: number; isWorkingDay?: boolean }> }>(
          `/attendance/board?date=${todayStr}`
        );
        const myRow = res.rows.find((r) => r.employee.id === user.employeeId);
        if (myRow && myRow.checkInAt) {
          setTodayRecord({
            _id: myRow.employee.id,
            date: myRow.date,
            checkInAt: myRow.checkInAt,
            checkOutAt: myRow.checkOutAt,
            status: myRow.status,
            workedMinutes: myRow.workedMinutes,
            isWorkingDay: myRow.isWorkingDay ?? true,
          });
        }
      } catch (err) {
        console.error('Failed to load today record:', err);
      }
    }
    loadToday();
  }, [user]);

  return (
    <div className="space-y-6">
      {/* If current user has a linked employee account (Employee or HR), provide the CheckInWidget */}
      {user?.employeeId && (
        <CheckInWidget
          initialRecord={todayRecord}
          onStatusChange={(updated) => setTodayRecord(updated)}
        />
      )}

      {/* Render Attendance Board for HR/Admin, or Calendar for Employees */}
      {isHrOrAdmin ? (
        <AttendanceBoard />
      ) : (
        <MyAttendanceCalendar />
      )}
    </div>
  );
}
