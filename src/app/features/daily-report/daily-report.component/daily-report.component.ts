import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { forkJoin, interval, of } from 'rxjs';
import { tap } from 'rxjs/operators';

import { AttendanceService } from '../../../core/services/attendance.service';
import { AttendanceCalculationService } from '../../../core/services/attendance-calculation.service';
import { DateTimeService } from '../../../core/services/date-time.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AttendanceRuleService } from '../../../core/services/attendance-rule.service';
import { HolidayService } from '../../../core/services/holiday.service';
import { WeekoffService } from '../../../core/services/weekoff.service';
import { AttendanceDay, AttendanceSession } from '../../../core/models/attendance.model';
import { AttendanceRules } from '../../../core/models/attendance-rule.model';
import { AttendanceStatus } from '../../../core/models/attendance-status.model';
import { Holiday } from '../../../core/models/holiday.model';
import { WeekoffDay } from '../../../core/models/weekoff.model';

interface SessionRowViewModel {
  sessionNumber: number;
  checkInDisplay: string;
  checkOutDisplay: string | null;
  durationDisplay: string;
  status: 'Completed' | 'In Progress';
}

type DayType = 'holiday' | 'weekoff' | 'working';

interface DailyReportViewModel {
  dateDisplay: string;
  firstCheckInDisplay: string | null;
  lastCheckOutDisplay: string | null;
  totalSessions: number;
  totalWorkingHoursDisplay: string;
  sessions: SessionRowViewModel[];
  isEmpty: boolean;
  attendanceStatus: AttendanceStatus | null;
  showInProgress: boolean;
  dayTypeLabel: string;
  dayType: DayType;
}

@Component({
  selector: 'app-daily-report',
  imports: [CommonModule],
  templateUrl: './daily-report.component.html',
  styleUrl: './daily-report.component.scss',
})
export class DailyReportComponent implements OnInit {
  private readonly attendanceService = inject(AttendanceService);
  private readonly calculationService = inject(AttendanceCalculationService);
  private readonly ruleService = inject(AttendanceRuleService);
  private readonly holidayService = inject(HolidayService);
  private readonly weekoffService = inject(WeekoffService);
  private readonly dateTimeService = inject(DateTimeService);
  private readonly notificationService = inject(NotificationService);

  readonly todayDate = this.dateTimeService.getCurrentDateString();

  readonly selectedDate = signal<string>(this.todayDate);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly dayData = signal<AttendanceDay | null>(null);
  readonly attendanceRules = signal<AttendanceRules | null>(null);
  readonly weekoffs = signal<WeekoffDay[]>([]);

  /** Cached per year, since holidays are only re-fetched when the viewed date's year changes. */
  private readonly holidaysCache = signal<{ year: number; holidays: Holiday[] } | null>(null);

  /**
   * Ticks once per second purely so an open session's live duration
   * stays current in the view. Reading tick() inside the computed
   * below makes the computed re-evaluate every second WITHOUT
   * re-fetching from storage — only dayData()/attendanceRules() changes
   * trigger a fetch.
   */
  private readonly tick = toSignal(interval(1000), { initialValue: 0 });

  readonly viewModel = computed<DailyReportViewModel | null>(() => {
    this.tick();
    const rules = this.attendanceRules();
    const cache = this.holidaysCache();
    const date = this.selectedDate();
    const year = Number(date.split('-')[0]);
    if (!rules || !cache || cache.year !== year) {
      return null;
    }
    return this.buildViewModel(this.dayData(), date, rules, cache.holidays, this.weekoffs());
  });

  ngOnInit(): void {
    // Rules and weekoff configuration are global, so fetched once and
    // reused across date navigation. Holidays are year-scoped and
    // cached/re-fetched only when the viewed date's year changes
    // (see loadDay()).
    forkJoin({
      rules: this.ruleService.getRules(),
      weekoffs: this.weekoffService.getConfig(),
    }).subscribe({
      next: ({ rules, weekoffs }) => {
        this.attendanceRules.set(rules);
        this.weekoffs.set(weekoffs);
        this.loadDay(this.selectedDate());
      },
      error: (err: Error) => {
        this.isLoading.set(false);
        this.notificationService.error(err.message);
        this.loadDay(this.selectedDate());
      },
    });
  }

  onDateChange(newDate: string): void {
    if (!newDate || newDate > this.todayDate) {
      return;
    }
    this.selectedDate.set(newDate);
    this.loadDay(newDate);
  }

  onPreviousDay(): void {
    const previous = this.dateTimeService.getPreviousDay(this.selectedDate());
    this.selectedDate.set(previous);
    this.loadDay(previous);
  }

  onNextDay(): void {
    if (this.isNextDisabled()) {
      return;
    }
    const next = this.dateTimeService.getNextDay(this.selectedDate());
    this.selectedDate.set(next);
    this.loadDay(next);
  }

  /** Disabled once the selected date is today — attendance cannot exist for a future date. */
  isNextDisabled(): boolean {
    return this.dateTimeService.isToday(this.selectedDate());
  }

  private loadDay(date: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const year = Number(date.split('-')[0]);
    const cache = this.holidaysCache();
    const holidays$ =
      cache && cache.year === year
        ? of(cache.holidays)
        : this.holidayService
          .getHolidaysForYear(year)
          .pipe(tap((holidays) => this.holidaysCache.set({ year, holidays })));

    forkJoin({
      day: this.attendanceService.getDayForCurrentUser(date),
      holidays: holidays$,
    }).subscribe({
      next: ({ day }) => {
        this.dayData.set(day);
        this.isLoading.set(false);
      },
      error: (err: Error) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.message);
        this.notificationService.error(err.message);
      },
    });
  }

  private buildViewModel(
    day: AttendanceDay | null,
    date: string,
    rules: AttendanceRules,
    holidays: Holiday[],
    weekoffs: WeekoffDay[]
  ): DailyReportViewModel {
    const sessions = day?.sessions ?? [];
    const now = this.dateTimeService.now();
    const summary = this.calculationService.getDailySummary(day, now);
    const isEmpty = sessions.length === 0;

    // Status only computed/shown for a day with at least one session.
    // "In Progress" overrides the display ONLY when viewing TODAY with
    // an open session — a stale open session from a past, un-checked-
    // out day still shows its real Full Day/Half Day/Absent
    // classification, never "In Progress" forever (approved Option A).
    const attendanceStatus = !isEmpty
      ? this.calculationService.calculateAttendanceStatus(summary.totalWorkingMinutes, rules).status
      : null;

    const isViewingToday = this.dateTimeService.isToday(date);
    const showInProgress = !isEmpty && isViewingToday && summary.hasOpenSession;

    const holiday = holidays.find((h) => h.date === date);
    let dayType: DayType;
    let dayTypeLabel: string;
    if (holiday) {
      dayType = 'holiday';
      dayTypeLabel = `Holiday: ${holiday.name}`;
    } else if (this.weekoffService.isWeekoff(date, weekoffs)) {
      dayType = 'weekoff';
      dayTypeLabel = 'Weekoff';
    } else {
      dayType = 'working';
      dayTypeLabel = 'Working Day';
    }

    return {
      dateDisplay: this.dateTimeService.formatDateDisplay(date),
      firstCheckInDisplay: summary.firstCheckIn ? this.formatTime(summary.firstCheckIn) : null,
      lastCheckOutDisplay: summary.lastCheckOut ? this.formatTime(summary.lastCheckOut) : null,
      totalSessions: summary.totalSessions,
      totalWorkingHoursDisplay: this.calculationService.formatMinutesAsHoursAndMinutes(
        summary.totalWorkingMinutes
      ),
      sessions: sessions.map((session, index) => this.buildSessionRow(session, index + 1, now)),
      isEmpty,
      attendanceStatus,
      showInProgress,
      dayTypeLabel,
      dayType,
    };
  }

  private buildSessionRow(
    session: AttendanceSession,
    sessionNumber: number,
    now: Date
  ): SessionRowViewModel {
    const isOpen = session.checkOut === null;
    const durationMinutes = isOpen
      ? this.calculationService.getCurrentSessionDurationMinutes(session, now)
      : this.calculationService.calculateSessionDurationMinutes(session) ?? 0;

    return {
      sessionNumber,
      checkInDisplay: this.formatTime(session.checkIn),
      checkOutDisplay: session.checkOut ? this.formatTime(session.checkOut) : null,
      durationDisplay: this.calculationService.formatMinutesAsHoursAndMinutes(durationMinutes),
      status: isOpen ? 'In Progress' : 'Completed',
    };
  }

  private formatTime(isoString: string): string {
    return new Date(isoString).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }
}
