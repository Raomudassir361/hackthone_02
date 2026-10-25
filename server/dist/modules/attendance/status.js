"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timeStringToMinutes = timeStringToMinutes;
exports.isCheckInLate = isCheckInLate;
exports.calculateWorkedMinutes = calculateWorkedMinutes;
exports.isHalfDayWorked = isHalfDayWorked;
exports.determineAttendanceStatus = determineAttendanceStatus;
/**
 * Parses "HH:MM" into minutes since midnight.
 */
function timeStringToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}
/**
 * Given a check-in Date and ruleSnapshot, returns true if check-in is strictly after
 * officeStart + graceMinutes in the company's timezone.
 */
function isCheckInLate(checkInDate, ruleSnapshot, timezone = 'Asia/Karachi') {
    // Format check-in time in company timezone as HH:mm:ss
    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });
    const [hourStr, minStr, secStr] = formatter.format(checkInDate).split(':');
    const checkInSeconds = Number(hourStr) * 3600 + Number(minStr) * 60 + Number(secStr);
    const [startHour, startMin] = ruleSnapshot.officeStart.split(':').map(Number);
    const cutoffSeconds = (startHour * 60 + startMin + ruleSnapshot.graceMinutes) * 60;
    // Late if strictly after the grace cutoff
    return checkInSeconds > cutoffSeconds;
}
/**
 * Determines worked minutes between check-in and check-out.
 */
function calculateWorkedMinutes(checkIn, checkOut) {
    if (!checkOut)
        return 0;
    const diffMs = checkOut.getTime() - checkIn.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60)));
}
/**
 * Returns true if worked minutes is less than halfDayHours * 60
 */
function isHalfDayWorked(workedMinutes, halfDayHours) {
    return workedMinutes < halfDayHours * 60;
}
/**
 * Computes status for a completed or ongoing record:
 * - If no checkOut and not late: 'present' (or 'missing_checkout' when reviewing past days)
 * - If no checkOut and late: 'late'
 * - If checked out and worked < halfDayHours: 'half_day'
 * - If checked out and worked >= halfDayHours: 'late' (if check-in was late) or 'present'
 */
function determineAttendanceStatus(options) {
    const { isLate, hasCheckedOut, workedMinutes, halfDayHours, isPastDay } = options;
    if (!hasCheckedOut) {
        if (isPastDay)
            return 'missing_checkout';
        return isLate ? 'late' : 'present';
    }
    if (isHalfDayWorked(workedMinutes, halfDayHours)) {
        return 'half_day';
    }
    return isLate ? 'late' : 'present';
}
