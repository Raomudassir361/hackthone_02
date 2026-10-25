"use strict";
/**
 * Dates and Timezone helpers
 * Dates: store UTC instants; store attendance/leave "day" as YYYY-MM-DD computed in the company timezone.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCompanyTodayString = getCompanyTodayString;
exports.parseISODateOnly = parseISODateOnly;
exports.formatISODateOnly = formatISODateOnly;
exports.isValidISODateString = isValidISODateString;
function getCompanyTodayString(timezone = 'Asia/Karachi', date = new Date()) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    return formatter.format(date); // YYYY-MM-DD
}
function parseISODateOnly(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
}
function formatISODateOnly(date) {
    return date.toISOString().split('T')[0];
}
function isValidISODateString(dateStr) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr))
        return false;
    const d = new Date(dateStr);
    return !isNaN(d.getTime());
}
