import { parseISODateOnly, formatISODateOnly } from './dates.js';

export interface WorkingDaysOptions {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  weekendDays?: number[]; // [0, 6] for Sunday, Saturday (0 = Sunday, 6 = Saturday)
  holidayDates?: string[]; // array of 'YYYY-MM-DD'
}

/**
 * Counts working days between startDate and endDate inclusive, skipping weekends and holidays.
 */
export function countWorkingDays(options: WorkingDaysOptions): number {
  const { startDate, endDate, weekendDays = [0, 6], holidayDates = [] } = options;

  const start = parseISODateOnly(startDate);
  const end = parseISODateOnly(endDate);

  if (start.getTime() > end.getTime()) {
    return 0;
  }

  const holidaySet = new Set(holidayDates);
  let count = 0;
  const current = new Date(start);

  while (current.getTime() <= end.getTime()) {
    const dayOfWeek = current.getUTCDay();
    const isoString = formatISODateOnly(current);

    if (!weekendDays.includes(dayOfWeek) && !holidaySet.has(isoString)) {
      count++;
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return count;
}

/**
 * Returns true if a specific date string is a working day given the weekends and holidays.
 */
export function isWorkingDay(dateStr: string, weekendDays = [0, 6], holidayDates: string[] = []): boolean {
  const date = parseISODateOnly(dateStr);
  const dayOfWeek = date.getUTCDay();
  if (weekendDays.includes(dayOfWeek)) {
    return false;
  }
  return !holidayDates.includes(dateStr);
}
