import { Injectable } from '@angular/core';

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Centralizes all date/time concerns: current date/time, ISO formatting
 * with local timezone offset, display formatting, month-key generation,
 * and day/month navigation with boundary handling. No component or other
 * service should compute dates independently — everything routes through
 * here so behavior stays consistent, and is easy to unit test in one
 * place (Phase 9).
 */
@Injectable({ providedIn: 'root' })
export class DateTimeService {
    /** Current moment as a native Date object. */
    now(): Date {
        return new Date();
    }

    /** Current date as YYYY-MM-DD, in LOCAL time. */
    getCurrentDateString(): string {
        return this.toDateString(this.now());
    }

    /** Converts a Date to YYYY-MM-DD using LOCAL time (not UTC). */
    toDateString(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Full ISO 8601 timestamp WITH the local timezone offset (e.g.
     * "2026-09-16T09:00:00+05:30"), matching the attendance JSON examples.
     * Deliberately does not use Date.toISOString(), which always returns
     * UTC ("Z") and would silently discard the local offset.
     */
    toIsoWithOffset(date: Date): string {
        const pad = (value: number) => String(value).padStart(2, '0');

        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());
        const hours = pad(date.getHours());
        const minutes = pad(date.getMinutes());
        const seconds = pad(date.getSeconds());

        const offsetMinutesTotal = -date.getTimezoneOffset();
        const offsetSign = offsetMinutesTotal >= 0 ? '+' : '-';
        const offsetHours = pad(Math.floor(Math.abs(offsetMinutesTotal) / 60));
        const offsetMinutes = pad(Math.abs(offsetMinutesTotal) % 60);

        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetSign}${offsetHours}:${offsetMinutes}`;
    }

    /** Current moment as a full ISO 8601 string with local offset. */
    getCurrentDateTimeIso(): string {
        return this.toIsoWithOffset(this.now());
    }

    /** Human-readable current time, e.g. "11:32:45 AM". */
    getCurrentTimeDisplay(): string {
        return this.now().toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
        });
    }

    /** Human-readable full date, e.g. "Wednesday, 16 September 2026". */
    formatDateDisplay(dateString: string): string {
        const date = this.parseDateOnly(dateString);
        return date.toLocaleDateString(undefined, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    }

    /** Compact date display for report rows, e.g. "16 Sep 2026". */
    formatShortDate(dateString: string): string {
        const date = this.parseDateOnly(dateString);
        return date.toLocaleDateString(undefined, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    }

    /**
     * Human-readable date portion of a FULL ISO datetime (e.g. a
     * createdAt timestamp), e.g. "16 September 2026". Distinct from
     * formatDateDisplay(), which expects a date-only YYYY-MM-DD string.
     */
    formatIsoDateDisplay(isoString: string): string {
        return new Date(isoString).toLocaleDateString(undefined, {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    }

    /** Full month name for a 1-12 month number, e.g. 9 → "September". */
    getMonthName(month: number): string {
        return MONTH_NAMES[month - 1] ?? '';
    }

    /**
     * Full weekday name for a YYYY-MM-DD date string, e.g. "Sunday".
     * Used by HolidayService to derive Holiday.day from Holiday.date —
     * the Day field must never be entered manually (Section 4.1).
     */
    getDayOfWeekName(dateString: string): string {
        const date = this.parseDateOnly(dateString);
        return date.toLocaleDateString(undefined, { weekday: 'long' });
    }

    /** Parses a YYYY-MM-DD string into a local Date at midnight. */
    parseDateOnly(dateString: string): Date {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day);
    }

    /** Month key used for attendance filenames, e.g. "2026-09". */
    getMonthKey(year: number, month: number): string {
        return `${year}-${String(month).padStart(2, '0')}`;
    }

    /** The {year, month} of "today", used to pick the correct monthly attendance file. */
    getCurrentYearMonth(): { year: number; month: number } {
        const now = this.now();
        return { year: now.getFullYear(), month: now.getMonth() + 1 };
    }

    /** YYYY-MM-DD for the day before the given date; handles month/year boundaries. */
    getPreviousDay(dateString: string): string {
        const date = this.parseDateOnly(dateString);
        date.setDate(date.getDate() - 1);
        return this.toDateString(date);
    }

    /** YYYY-MM-DD for the day after the given date; handles month/year boundaries. */
    getNextDay(dateString: string): string {
        const date = this.parseDateOnly(dateString);
        date.setDate(date.getDate() + 1);
        return this.toDateString(date);
    }

    /** Previous {year, month}, handling the January → previous-December boundary. */
    getPreviousMonth(year: number, month: number): { year: number; month: number } {
        return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
    }

    /** Next {year, month}, handling the December → next-January boundary. */
    getNextMonth(year: number, month: number): { year: number; month: number } {
        return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
    }

    /** True if the given YYYY-MM-DD is strictly after today's local date. */
    isFutureDate(dateString: string): boolean {
        return dateString > this.getCurrentDateString();
    }

    /** True if the given YYYY-MM-DD is today's local date. */
    isToday(dateString: string): boolean {
        return dateString === this.getCurrentDateString();
    }

    /** True if the given {year, month} is strictly after the current year/month. */
    isFutureYearMonth(year: number, month: number): boolean {
        const current = this.getCurrentYearMonth();
        if (year !== current.year) {
            return year > current.year;
        }
        return month > current.month;
    }
}
