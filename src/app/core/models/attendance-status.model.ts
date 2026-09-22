export interface AttendanceStatusModel { }

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
 * target. Not explicitly named in the source spec, but needed to
 * return "capped percentage + remaining-or-target-reached" as one
 * cohesive shape rather than three loose return values — flagged as a
 * new shape in Step 1's review.
 */
export interface ProgressResult {
    /** 0-100, never exceeds 100 even if totalWorkingMinutes > standardWorkingMinutes (Section 22). */
    percentage: number;
    /** Minutes remaining until standardWorkingMinutes is reached; 0 once reached/exceeded. */
    remainingMinutes: number;
    /** True once totalWorkingMinutes >= standardWorkingMinutes (Section 23 — show "Target Completed" instead of a negative remaining value). */
    targetReached: boolean;
}
