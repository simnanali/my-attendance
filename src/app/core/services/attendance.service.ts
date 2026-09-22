import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';

import { STORAGE_SERVICE } from './storage/storage.service';
import { IdGeneratorService } from './id-generator.service';
import { DateTimeService } from './date-time.service';
import { AuthService } from './auth.service';
import { AttendanceDay, AttendanceSession } from '../models/attendance.model';

/**
 * Owns the attendance state machine (Check In → Check Out → Check In...)
 * and enforces it HERE, at the business-service layer, using freshly
 * fetched data on every call — never trusting cached UI state. Every
 * read/write is scoped to the currently authenticated user's userId
 * (Sections 40/56): other users' entries in the same monthly file are
 * fetched (the file holds all users) but are never returned to callers
 * or included when persisting changes beyond passthrough preservation.
 *
 * Per the approved Phase 4 decision (Option A), the state machine is
 * scoped to TODAY only: an unclosed session from a previous day never
 * blocks today's Check In. That prior day's open session simply remains
 * visible as unresolved in its own record — attendance is immutable for
 * normal users (Section 19) and there is no correction feature yet.
 */
@Injectable({ providedIn: 'root' })
export class AttendanceService {
    private readonly storage = inject(STORAGE_SERVICE);
    private readonly idGenerator = inject(IdGeneratorService);
    private readonly dateTime = inject(DateTimeService);
    private readonly authService = inject(AuthService);

    private readonly currentDaySubject = new BehaviorSubject<AttendanceDay | null>(null);

    /** Today's attendance day for the current user, or null if nothing recorded yet. */
    readonly currentDay$ = this.currentDaySubject.asObservable();

    /** Loads (or reloads) today's attendance day. Call on component init. */
    loadToday(): Observable<AttendanceDay | null> {
        return this.fetchDayForCurrentUser(this.dateTime.getCurrentDateString()).pipe(
            tap((day) => this.currentDaySubject.next(day))
        );
    }

    checkIn(): Observable<AttendanceDay> {
        const userId = this.requireUserId();
        const { year, month } = this.dateTime.getCurrentYearMonth();
        const today = this.dateTime.getCurrentDateString();

        return this.storage.getAttendance(year, month).pipe(
            switchMap((allDays) => {
                const existingDay = this.findDay(allDays, userId, today);
                const openSession = existingDay ? this.findOpenSession(existingDay) : null;

                if (openSession) {
                    return throwError(
                        () =>
                            new Error(
                                'You are already checked in. Please check out before checking in again.'
                            )
                    );
                }

                return this.idGenerator.generateSessionId().pipe(
                    switchMap((sessionId) => {
                        const newSession: AttendanceSession = {
                            id: sessionId,
                            checkIn: this.dateTime.getCurrentDateTimeIso(),
                            checkOut: null,
                        };

                        if (existingDay) {
                            const updatedDay: AttendanceDay = {
                                ...existingDay,
                                sessions: [...existingDay.sessions, newSession],
                            };
                            return this.saveMergedDay(allDays, updatedDay);
                        }

                        return this.idGenerator.generateAttendanceDayId().pipe(
                            switchMap((dayId) => {
                                const newDay: AttendanceDay = {
                                    id: dayId,
                                    userId,
                                    date: today,
                                    sessions: [newSession],
                                };
                                return this.saveMergedDay(allDays, newDay);
                            })
                        );
                    })
                );
            }),
            tap((day) => this.currentDaySubject.next(day)),
            catchError((err) =>
                throwError(() => new Error(err?.message ?? 'Check-in failed. Please try again.'))
            )
        );
    }

    checkOut(): Observable<AttendanceDay> {
        const userId = this.requireUserId();
        const { year, month } = this.dateTime.getCurrentYearMonth();
        const today = this.dateTime.getCurrentDateString();

        return this.storage.getAttendance(year, month).pipe(
            switchMap((allDays) => {
                const existingDay = this.findDay(allDays, userId, today);
                const openSession = existingDay ? this.findOpenSession(existingDay) : null;

                if (!existingDay || !openSession) {
                    return throwError(
                        () => new Error('You must check in before you can check out.')
                    );
                }

                const updatedSessions = existingDay.sessions.map((session) =>
                    session.id === openSession.id
                        ? { ...session, checkOut: this.dateTime.getCurrentDateTimeIso() }
                        : session
                );
                const updatedDay: AttendanceDay = { ...existingDay, sessions: updatedSessions };
                return this.saveMergedDay(allDays, updatedDay);
            }),
            tap((day) => this.currentDaySubject.next(day)),
            catchError((err) =>
                throwError(() => new Error(err?.message ?? 'Check-out failed. Please try again.'))
            )
        );
    }

    /**
     * Fetches the current user's attendance for an ARBITRARY date (used
     * by the Daily Report, Phase 5). Read-only — does not touch
     * currentDaySubject, which is reserved for "today"'s check-in/out
     * state. Does no calculation of its own; consumers pass the result
     * straight into AttendanceCalculationService.
     */
    getDayForCurrentUser(date: string): Observable<AttendanceDay | null> {
        return this.fetchDayForCurrentUser(date);
    }

    /**
     * Fetches ALL of the current user's attendance days for a given
     * year/month (used by the Monthly Report, Phase 6). Read-only, and
     * filters by userId only (every date) — never returns other users'
     * entries from the same monthly file (Sections 40/56).
     */
    getMonthForCurrentUser(year: number, month: number): Observable<AttendanceDay[]> {
        const userId = this.requireUserId();
        return this.storage
            .getAttendance(year, month)
            .pipe(map((days) => days.filter((d) => d.userId === userId)));
    }

    private fetchDayForCurrentUser(date: string): Observable<AttendanceDay | null> {
        const userId = this.requireUserId();
        const [year, month] = date.split('-').map(Number);

        return this.storage
            .getAttendance(year, month)
            .pipe(map((days) => this.findDay(days, userId, date)));
    }

    private findDay(days: AttendanceDay[], userId: string, date: string): AttendanceDay | null {
        return days.find((d) => d.userId === userId && d.date === date) ?? null;
    }

    private findOpenSession(day: AttendanceDay): AttendanceSession | null {
        return day.sessions.find((s) => s.checkOut === null) ?? null;
    }

    private requireUserId(): string {
        const userId = this.authService.getCurrentUserId();
        if (!userId) {
            throw new Error('You must be logged in to record attendance.');
        }
        return userId;
    }

    /**
     * Writes updatedDay back into the full month array, preserving every
     * other entry (other users, other dates) untouched. This is the only
     * path that ever calls saveAttendance — always appending a new
     * session or closing an open one, never editing/deleting a completed
     * session (attendance is immutable for normal users, Section 19).
     */
    private saveMergedDay(
        allDays: AttendanceDay[],
        updatedDay: AttendanceDay
    ): Observable<AttendanceDay> {
        const { year, month } = this.dateTime.getCurrentYearMonth();
        const otherEntries = allDays.filter((d) => d.id !== updatedDay.id);
        const mergedDays = [...otherEntries, updatedDay];
        return this.storage
            .saveAttendance(year, month, mergedDays)
            .pipe(map(() => updatedDay));
    }
}
