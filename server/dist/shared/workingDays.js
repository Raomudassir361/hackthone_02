"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.countWorkingDays = countWorkingDays;
exports.isWorkingDay = isWorkingDay;
const dates_js_1 = require("./dates.js");
/**
 * Counts working days between startDate and endDate inclusive, skipping weekends and holidays.
 */
function countWorkingDays(options) {
    const { startDate, endDate, weekendDays = [0, 6], holidayDates = [] } = options;
    const start = (0, dates_js_1.parseISODateOnly)(startDate);
    const end = (0, dates_js_1.parseISODateOnly)(endDate);
    if (start.getTime() > end.getTime()) {
        return 0;
    }
    const holidaySet = new Set(holidayDates);
    let count = 0;
    const current = new Date(start);
    while (current.getTime() <= end.getTime()) {
        const dayOfWeek = current.getUTCDay();
        const isoString = (0, dates_js_1.formatISODateOnly)(current);
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
function isWorkingDay(dateStr, weekendDays = [0, 6], holidayDates = []) {
    const date = (0, dates_js_1.parseISODateOnly)(dateStr);
    const dayOfWeek = date.getUTCDay();
    if (weekendDays.includes(dayOfWeek)) {
        return false;
    }
    return !holidayDates.includes(dateStr);
}
