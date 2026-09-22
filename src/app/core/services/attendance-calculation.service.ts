/**
 * Pure calculation logic: session durations, totals, first check-in,
 * last check-out, daily/monthly summaries. No I/O — fully unit-testable
 * in isolation. Full implementation is added starting in Phase 4.
 */

import { Injectable } from '@angular/core';
import {
    AttendanceDay,
    AttendanceSession,
    AttendanceSummary,
    DailyBreakdownEntry,
    MonthlySummary,
} from '../models/attendance.model';

const MINUTES_PER_HOUR = 60;

/**
 * All attendance math lives here, and ONLY here — pure functions, no
 * injected I/O dependencies (beyond an explicit `now: Date` parameter
 * where "current time" matters), so every calculation is independently
 * unit-testable (Phase 9) without mocking storage or HTTP.
 *
 * CRITICAL RULE (Sections 17/55): total working time is ALWAYS the sum
 * of each completed session's own duration — NEVER
 * (lastCheckOut - firstCheckIn). This file is the single place that
 * rule is implemented; every other phase (daily/monthly report,
 * dashboard, charts) must reuse these methods rather than
 * recalculating totals independently.
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
     * recorded session (Section 23) — NOT a count of calendar days in
     * the month.
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
}