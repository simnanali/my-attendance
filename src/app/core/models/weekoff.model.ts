export interface WeekoffModel { }

/**
 * dayOfWeek follows JavaScript's native Date.getDay() convention
 * (0 = Sunday ... 6 = Saturday) — matches DateTimeService's existing
 * use of native Date under the hood, so no separate day-numbering
 * scheme is introduced.
 */
export interface WeekoffDay {
    dayOfWeek: number;
    dayName: string;
    isWeekoff: boolean;
}

/** Always exactly 7 entries, one per dayOfWeek (0-6). */
export interface WeekoffsFile {
    weekoffs: WeekoffDay[];
}
