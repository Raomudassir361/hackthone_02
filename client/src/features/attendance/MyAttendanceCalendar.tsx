import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge, StatusType } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { FormField } from '../../components/ui/FormField';
import { apiFetch } from '../../lib/api';
import { ChevronLeft, ChevronRight, CalendarDays, PlusCircle, CheckCircle2 } from 'lucide-react';

interface CalendarDay {
  date: string;
  dayOfWeek: number;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
  status: string;
  checkInAt?: string;
  checkOutAt?: string;
  workedMinutes?: number;
}

interface CalendarResponse {
  month: string;
  employee: { id: string; name: string; code: string };
  days: CalendarDay[];
}

export function MyAttendanceCalendar() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [calendarData, setCalendarData] = useState<CalendarResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  // Correction Modal
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);
  const [correctionMsg, setCorrectionMsg] = useState<string | null>(null);

  const loadMonthData = async (month: string) => {
    setIsLoading(true);
    try {
      const res = await apiFetch<CalendarResponse>(`/attendance/calendar?month=${month}`);
      setCalendarData(res);
    } catch (err) {
      console.error('Failed to load attendance calendar:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMonthData(currentMonth);
  }, [currentMonth]);

  const changeMonth = (delta: number) => {
    const [y, m] = currentMonth.split('-').map(Number);
    const date = new Date(y, m - 1 + delta, 1);
    const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    setCurrentMonth(newMonth);
  };

  const handleDayClick = (day: CalendarDay) => {
    setSelectedDay(day);
  };

  const handleRequestCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDay) return;
    setIsSubmittingCorrection(true);
    setCorrectionMsg(null);
    try {
      await apiFetch('/attendance/corrections', {
        method: 'POST',
        body: JSON.stringify({
          date: selectedDay.date,
          reason: correctionReason,
        }),
      });
      setCorrectionMsg('Attendance correction request submitted to HR!');
      setCorrectionReason('');
      setTimeout(() => {
        setIsCorrectionModalOpen(false);
        setCorrectionMsg(null);
      }, 1500);
    } catch (err: unknown) {
      setCorrectionMsg(err instanceof Error ? err.message : 'Failed to request correction');
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Month Navigator Header */}
      <div className="flex items-center justify-between p-3 bg-surface rounded-card border border-border">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-bold text-navy">
            Monthly Attendance View ({currentMonth})
          </h3>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => changeMonth(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs font-semibold px-2 text-navy">{currentMonth}</span>
          <Button variant="outline" size="sm" onClick={() => changeMonth(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card className="p-4 overflow-hidden">
        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-muted uppercase pb-2 border-b border-border">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Days cells */}
        {isLoading ? (
          <div className="py-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1.5 pt-2">
            {/* Blank padding for first day offset */}
            {calendarData?.days[0] &&
              Array.from({ length: calendarData.days[0].dayOfWeek }).map((_, i) => (
                <div key={`blank-${i}`} className="min-h-[70px] bg-bg/30 rounded-control" />
              ))}

            {calendarData?.days.map((day) => {
              const dayNum = parseInt(day.date.split('-')[2], 10);
              const isSelected = selectedDay?.date === day.date;

              return (
                <div
                  key={day.date}
                  onClick={() => handleDayClick(day)}
                  className={`min-h-[70px] p-1.5 rounded-control border text-left cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                      : 'border-border hover:bg-bg/60 bg-surface'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-navy">{dayNum}</span>
                    {day.isHoliday && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-purple-100 text-accent font-semibold truncate max-w-[50px]">
                        Holiday
                      </span>
                    )}
                  </div>

                  <div className="mt-1">
                    {day.status !== 'future' && day.status !== 'weekend' && (
                      <StatusBadge
                        status={day.status as StatusType}
                        className="text-[10px] px-1.5 py-0"
                      />
                    )}
                    {day.status === 'weekend' && (
                      <span className="text-[10px] text-muted italic">Weekend</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Selected Day Details Card */}
      {selectedDay && (
        <Card className="p-4 border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-navy flex items-center gap-2">
              <span>{selectedDay.date} Details</span>
              <StatusBadge status={selectedDay.status as StatusType} />
            </h4>
            <div className="text-xs text-muted mt-1 space-x-3">
              <span>Check In: {selectedDay.checkInAt ? new Date(selectedDay.checkInAt).toLocaleTimeString() : 'None'}</span>
              <span>·</span>
              <span>Check Out: {selectedDay.checkOutAt ? new Date(selectedDay.checkOutAt).toLocaleTimeString() : 'None'}</span>
              <span>·</span>
              <span>Worked: {selectedDay.workedMinutes || 0} mins</span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCorrectionModalOpen(true)}
            className="flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5 text-primary" />
            <span>Request Correction</span>
          </Button>
        </Card>
      )}

      {/* Request Correction Modal */}
      <Modal
        isOpen={isCorrectionModalOpen}
        onClose={() => setIsCorrectionModalOpen(false)}
        title="Request Attendance Correction"
        description={`Submit a formal adjustment request for ${selectedDay?.date}.`}
      >
        <form onSubmit={handleRequestCorrection} className="space-y-4">
          {correctionMsg && (
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-control text-xs text-primary font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              <span>{correctionMsg}</span>
            </div>
          )}

          <FormField
            label="Date"
            disabled
            value={selectedDay?.date || ''}
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-navy/80 mb-1">
              Reason for Correction
            </label>
            <textarea
              required
              rows={3}
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              placeholder="e.g. Card scanner was offline at main lobby gate..."
              className="w-full rounded-control border border-border bg-surface p-2.5 text-xs text-navy focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCorrectionModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmittingCorrection}>
              Submit to HR
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
