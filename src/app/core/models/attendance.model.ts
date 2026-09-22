export interface AttendanceSession {
  id: string;
  checkIn: string;
  checkOut: string | null;
}

export interface AttendanceDay {
  id: string;
  userId: string;
  date: string;
  sessions: AttendanceSession[];
}

export interface MonthlyAttendanceFile {
  year: number;
  month: number;
  attendance: AttendanceDay[];
}

/**
 * Calculated (not stored) summary of a single day's attendance.
 * Produced by AttendanceCalculationService — see Phase 4.
 */
export interface AttendanceSummary {
  date: string;
  firstCheckIn: string | null;
  lastCheckOut: string | null;
  totalSessions: number;
  completedSessions: number;
  totalWorkingMinutes: number;
  hasOpenSession: boolean;
}

export interface DailyBreakdownEntry {
  date: string;
  firstCheckIn: string | null;
  lastCheckOut: string | null;
  totalSessions: number;
  totalWorkingMinutes: number;
  hasOpenSession: boolean;
}

/** Calculated (not stored) summary of a full month's attendance. */
export interface MonthlySummary {
  year: number;
  month: number;
  totalWorkingDays: number;
  totalSessions: number;
  totalWorkingMinutes: number;
  averageWorkingMinutesPerDay: number;
  dailyBreakdown: DailyBreakdownEntry[];
}
