import { Injectable } from '@angular/core';
import {
    AttendanceDay,
    AttendanceSession,
    AttendanceSummary,
    DailyBreakdownEntry,
    MonthlySummary,
} from '../models/attendance.model';
import { AttendanceRules } from '../models/attendance-rule.model';
import {
    AttendanceStatusResult,
    MonthlyAttendanceCounts,
    ProgressResult,
} from '../models/attendance-status.model';
import { Holiday } from '../models/holiday.model';
import { WeekoffDay } from '../models/weekoff.model';

const MINUTES_PER_HOUR = 60;

/**
 * All attendance math lives here, and ONLY here — pure functions, no
 * injected I/O dependencies (beyond an explicit `now: Date` parameter
 * where "current time" matters, or plain data parameters like
 * AttendanceRules/Holiday[]/WeekoffDay[] where configured state
 * matters), so every calculation is independently unit-testable
 * without mocking storage or HTTP.
 *
 * CRITICAL RULE (Sections 17/55): total working time is ALWAYS the sum
 * of each completed session's own duration — NEVER
 * (lastCheckOut - firstCheckIn). This file is the single place that
 * rule is implemented; every other phase (daily/monthly report,
 * dashboard, charts) must reuse these methods rather than
 * recalculating totals independently.
 *
 * Phase 8B note: calculateAttendanceStatus()/calculateProgress() take
 * AttendanceRules as a plain parameter rather than this service
 * injecting AttendanceRuleService/storage itself — approved decision,
 * keeps this service dependency-free like every method before it.
 * getMonthlyAttendanceCounts() follows the same pattern with
 * Holiday[]/WeekoffDay[].
 */
@Injectable({ providedIn: 'root' })
export class AttendanceCalculationService {
    /**
     * Duration of a COMPLETED session, in minutes. Returns null for an
     * open session (checkOut === null) — open sessions are not finalized
     * and must never contribute to totals. Use
     * getCurrentSessionDurationMinutes() for a live, in-progress duration.
     */
    calculateSessionDurationMinutes(session: AttendanceSession): number | null {
        if (session.checkOut === null) {
            return null;
        }
        const checkInMs = new Date(session.checkIn).getTime();
        const checkOutMs = new Date(session.checkOut).getTime();
        return Math.round((checkOutMs - checkInMs) / 60000);
    }

    /**
     * Live duration, in minutes, of an OPEN session as of `now`. Purely
     * for display ("In Progress — 45m so far") — never included in
     * finalized totals.
     */
    getCurrentSessionDurationMinutes(session: AttendanceSession, now: Date): number {
        if (session.checkOut !== null) {
            return 0;
        }
        const checkInMs = new Date(session.checkIn).getTime();
        return Math.max(0, Math.round((now.getTime() - checkInMs) / 60000));
    }

    /**
     * Sum of each COMPLETED session's duration. This is the ONLY correct
     * way to compute total working time.
     */
    calculateTotalWorkingMinutes(sessions: AttendanceSession[]): number {
        return sessions.reduce((total, session) => {
            const duration = this.calculateSessionDurationMinutes(session);
            return duration !== null ? total + duration : total;
        }, 0);
    }

    formatMinutesAsHoursAndMinutes(totalMinutes: number): string {
        const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
        const minutes = totalMinutes % MINUTES_PER_HOUR;
        return `${hours}h ${String(minutes).padStart(2, '0')}m`;
    }

    getFirstCheckIn(sessions: AttendanceSession[]): string | null {
        if (sessions.length === 0) {
            return null;
        }
        return sessions.reduce(
            (earliest, session) => (session.checkIn < earliest ? session.checkIn : earliest),
            sessions[0].checkIn
        );
    }

    /** Latest checkOut among COMPLETED sessions only; null if none are completed. */
    getLastCheckOut(sessions: AttendanceSession[]): string | null {
        const completedCheckOuts = sessions
            .map((s) => s.checkOut)
            .filter((checkOut): checkOut is string => checkOut !== null);

        if (completedCheckOuts.length === 0) {
            return null;
        }
        return completedCheckOuts.reduce((latest, current) =>
            current > latest ? current : latest
        );
    }

    getTotalSessions(sessions: AttendanceSession[]): number {
        return sessions.length;
    }

    getOpenSession(sessions: AttendanceSession[]): AttendanceSession | null {
        return sessions.find((s) => s.checkOut === null) ?? null;
    }

    /**
     * Builds the full calculated summary for a single day. `day` may be
     * null (no attendance recorded yet) — callers must render that as an
     * empty state, not an error.
     */
    getDailySummary(day: AttendanceDay | null, now: Date): AttendanceSummary {
        const sessions = day?.sessions ?? [];
        return {
            date: day?.date ?? '',
            firstCheckIn: this.getFirstCheckIn(sessions),
            lastCheckOut: this.getLastCheckOut(sessions),
            totalSessions: this.getTotalSessions(sessions),
            completedSessions: sessions.filter((s) => s.checkOut !== null).length,
            totalWorkingMinutes: this.calculateTotalWorkingMinutes(sessions),
            hasOpenSession: this.getOpenSession(sessions) !== null,
        };
    }

    /**
     * Aggregates a month's worth of AttendanceDay records (already scoped
     * to a single user by the caller) into a MonthlySummary. Reuses
     * getDailySummary() per day rather than re-deriving first-check-in/
     * last-check-out/duration logic — this method only aggregates.
     *
     * "Total Working Days" = number of distinct dates with at least one
     * recorded session — NOT a count of calendar days in the month, and
     * NOT the same thing as getMonthlyAttendanceCounts() below.
     */
    getMonthlySummary(
        days: AttendanceDay[],
        year: number,
        month: number,
        now: Date
    ): MonthlySummary {
        const dailyBreakdown: DailyBreakdownEntry[] = days.map((day) => {
            const daySummary = this.getDailySummary(day, now);
            return {
                date: day.date,
                firstCheckIn: daySummary.firstCheckIn,
                lastCheckOut: daySummary.lastCheckOut,
                totalSessions: daySummary.totalSessions,
                totalWorkingMinutes: daySummary.totalWorkingMinutes,
                hasOpenSession: daySummary.hasOpenSession,
            };
        });

        const totalWorkingDays = dailyBreakdown.length;
        const totalSessions = dailyBreakdown.reduce((sum, entry) => sum + entry.totalSessions, 0);
        const totalWorkingMinutes = dailyBreakdown.reduce(
            (sum, entry) => sum + entry.totalWorkingMinutes,
            0
        );
        const averageWorkingMinutesPerDay =
            totalWorkingDays > 0 ? totalWorkingMinutes / totalWorkingDays : 0;

        return {
            year,
            month,
            totalWorkingDays,
            totalSessions,
            totalWorkingMinutes,
            averageWorkingMinutesPerDay,
            dailyBreakdown,
        };
    }

    /**
     * Classifies totalWorkingMinutes against the configured thresholds
     * (Section 15). standardWorkingMinutes (the TARGET) plays no role in
     * this classification — only fullDayThresholdMinutes and
     * halfDayThresholdMinutes decide FULL_DAY/HALF_DAY/ABSENT. Boundaries
     * are inclusive on the lower end (>= threshold), per the worked
     * examples in Section 15 (e.g. exactly 6h is Full Day, exactly 4h is
     * Half Day).
     */
    calculateAttendanceStatus(
        totalWorkingMinutes: number,
        rules: AttendanceRules
    ): AttendanceStatusResult {
        const status =
            totalWorkingMinutes >= rules.fullDayThresholdMinutes
                ? 'FULL_DAY'
                : totalWorkingMinutes >= rules.halfDayThresholdMinutes
                    ? 'HALF_DAY'
                    : 'ABSENT';

        return {
            status,
            totalWorkingMinutes,
            standardWorkingMinutes: rules.standardWorkingMinutes,
            remainingTargetMinutes: this.calculateRemainingTargetMinutes(
                totalWorkingMinutes,
                rules.standardWorkingMinutes
            ),
        };
    }

    /**
     * Minutes remaining until standardWorkingMinutes (the target) is
     * reached. Never negative — once the target is met or exceeded,
     * returns 0 rather than a negative "remaining" value (Section 23:
     * "Target Completed" instead of a negative number is the caller's
     * job to render based on this being 0).
     */
    calculateRemainingTargetMinutes(
        totalWorkingMinutes: number,
        standardWorkingMinutes: number
    ): number {
        return Math.max(0, standardWorkingMinutes - totalWorkingMinutes);
    }

    /**
     * Progress toward standardWorkingMinutes, capped at 100% even when
     * totalWorkingMinutes exceeds the target (Section 22) — the actual
     * worked total is NOT clamped, only the displayed percentage is.
     */
    calculateProgress(totalWorkingMinutes: number, standardWorkingMinutes: number): ProgressResult {
        const remainingMinutes = this.calculateRemainingTargetMinutes(
            totalWorkingMinutes,
            standardWorkingMinutes
        );
        const targetReached = totalWorkingMinutes >= standardWorkingMinutes;

        const rawPercentage =
            standardWorkingMinutes > 0 ? (totalWorkingMinutes / standardWorkingMinutes) * 100 : 0;
        const percentage = Math.min(100, Math.max(0, Math.round(rawPercentage)));

        return { percentage, remainingMinutes, targetReached };
    }

    /**
     * Iterates every calendar day of the given month UP TO AND
     * INCLUDING today (never a future day), classifying each one as:
     * a Holiday (if present in `holidays`), a Weekoff (if its
     * day-of-week is configured as one in `weekoffs`), or — for every
     * remaining "normal" day — Full Day / Half Day / Absent via
     * calculateAttendanceStatus(). Holiday/Weekoff days are excluded
     * from the Full/Half/Absent counts entirely (never counted as an
     * attendance absence, extending Section 26's dashboard rule to
     * Monthly Report). A day with zero recorded sessions and no
     * holiday/weekoff configured correctly counts as Absent — this is
     * the whole point of this method versus getMonthlySummary(), whose
     * dailyBreakdown only contains days that actually have a session.
     */
    getMonthlyAttendanceCounts(
        days: AttendanceDay[],
        year: number,
        month: number,
        now: Date,
        rules: AttendanceRules,
        holidays: Holiday[],
        weekoffs: WeekoffDay[]
    ): MonthlyAttendanceCounts {
        const daysInMonth = new Date(year, month, 0).getDate();
        const todayStr = this.toLocalDateString(now);
        const holidayDates = new Set(holidays.map((h) => h.date));

        let fullDayCount = 0;
        let halfDayCount = 0;
        let absentCount = 0;
        let holidayCount = 0;
        let weekoffCount = 0;

        for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

            // Never count a day later than today.
            if (dateStr > todayStr) {
                continue;
            }

            if (holidayDates.has(dateStr)) {
                holidayCount++;
                continue;
            }

            if (this.isWeekoffDate(dateStr, weekoffs)) {
                weekoffCount++;
                continue;
            }

            const day = days.find((d) => d.date === dateStr) ?? null;
            const summary = this.getDailySummary(day, now);
            const status = this.calculateAttendanceStatus(summary.totalWorkingMinutes, rules).status;

            if (status === 'FULL_DAY') {
                fullDayCount++;
            } else if (status === 'HALF_DAY') {
                halfDayCount++;
            } else {
                absentCount++;
            }
        }

        return {
            fullDayCount,
            halfDayCount,
            absentCount,
            holidayCount,
            weekoffCount,
            workingDaysConsidered: fullDayCount + halfDayCount + absentCount,
        };
    }

    /** Local (not UTC) day-of-week check, matching DateTimeService's own date-only parsing convention. */
    private isWeekoffDate(dateString: string, weekoffs: WeekoffDay[]): boolean {
        const [year, month, day] = dateString.split('-').map(Number);
        const dayOfWeek = new Date(year, month - 1, day).getDay();
        return weekoffs.some((w) => w.dayOfWeek === dayOfWeek && w.isWeekoff);
    }

    private toLocalDateString(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}
