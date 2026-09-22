export interface AttendanceRuleModel { }

/**
 * All thresholds stored in MINUTES (Section 17) to avoid decimal-hour
 * rounding/comparison problems. standardWorkingMinutes is the TARGET
 * (e.g. 480 = 8h) — it is NOT a status threshold; only
 * fullDayThresholdMinutes and halfDayThresholdMinutes drive Full Day /
 * Half Day / Absent classification (Section 15).
 */
export interface AttendanceRules {
    standardWorkingMinutes: number;
    fullDayThresholdMinutes: number;
    halfDayThresholdMinutes: number;
}

export interface AttendanceRulesFile {
    attendanceRules: AttendanceRules;
}
