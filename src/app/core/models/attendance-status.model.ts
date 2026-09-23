export type AttendanceStatus = 'FULL_DAY' | 'HALF_DAY' | 'ABSENT';

/** Result of classifying a day's total working minutes against configured AttendanceRules. */
export interface AttendanceStatusResult {
    status: AttendanceStatus;
    totalWorkingMinutes: number;
    standardWorkingMinutes: number;
    remainingTargetMinutes: number;
}

/**
 * Result of computing progress toward the standard working-minutes
 * target.
 */
export interface ProgressResult {
    /** 0-100, never exceeds 100 even if totalWorkingMinutes > standardWorkingMinutes. */
    percentage: number;
    /** Minutes remaining until standardWorkingMinutes is reached; 0 once reached/exceeded. */
    remainingMinutes: number;
    /** True once totalWorkingMinutes >= standardWorkingMinutes. */
    targetReached: boolean;
}

/**
 * Month-wide Full Day / Half Day / Absent counts, plus Holiday/Weekoff
 * counts, produced by getMonthlyAttendanceCounts(). Every calendar day
 * up to today is classified into exactly one bucket — Holiday and
 * Weekoff days are excluded from Full/Half/Absent entirely (they are
 * never counted as an attendance absence). Future days are never
 * counted at all. workingDaysConsidered = fullDayCount + halfDayCount
 * + absentCount, so the five counts together account for every
 * calendar day considered.
 */
export interface MonthlyAttendanceCounts {
    fullDayCount: number;
    halfDayCount: number;
    absentCount: number;
    holidayCount: number;
    weekoffCount: number;
    workingDaysConsidered: number;
}