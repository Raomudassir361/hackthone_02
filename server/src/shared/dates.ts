/**
 * Dates and Timezone helpers
 * Dates: store UTC instants; store attendance/leave "day" as YYYY-MM-DD computed in the company timezone.
 */

export function getCompanyTodayString(timezone = 'Asia/Karachi', date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date); // YYYY-MM-DD
}

export function parseISODateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
}

export function formatISODateOnly(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function isValidISODateString(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}
