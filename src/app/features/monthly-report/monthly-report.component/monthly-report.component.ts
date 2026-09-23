import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { forkJoin, interval, of } from 'rxjs';
import { tap } from 'rxjs/operators';

import { AttendanceService } from '../../../core/services/attendance.service';
import { AttendanceCalculationService } from '../../../core/services/attendance-calculation.service';
import { AttendanceRuleService } from '../../../core/services/attendance-rule.service';
import { HolidayService } from '../../../core/services/holiday.service';
import { WeekoffService } from '../../../core/services/weekoff.service';
import { DateTimeService } from '../../../core/services/date-time.service';
import { NotificationService } from '../../../core/services/notification.service';
import { BarChartComponent } from '../../../shared/components/bar-chart/bar-chart.component/bar-chart.component';
import { AttendanceDay } from '../../../core/models/attendance.model';
import { AttendanceRules } from '../../../core/models/attendance-rule.model';
import { Holiday } from '../../../core/models/holiday.model';
import { WeekoffDay } from '../../../core/models/weekoff.model';

interface DailyRowViewModel {
  dateDisplay: string;
  firstInDisplay: string;
  lastOutDisplay: string;
  sessions: number;
  workingHoursDisplay: string;
  hasOpenSession: boolean;
}

interface MonthlyReportViewModel {
  totalWorkingDays: number;
  totalSessions: number;
  totalWorkingHoursDisplay: string;
  averageWorkingHoursPerDayDisplay: string;
  rows: DailyRowViewModel[];
  chartLabels: string[];
  chartValues: number[];
  todayChartIndex: number | undefined;
  isEmpty: boolean;

  fullDayCount: number;
  halfDayCount: number;
  absentCount: number;
  holidayCount: number;
  weekoffCount: number;
}

interface SelectOption {
  value: number;
  label: string;
}

@Component({
  imports: [CommonModule, BarChartComponent],
  selector: 'app-monthly-report',
  styleUrl: './monthly-report.component.scss',
  templateUrl: './monthly-report.component.html',
})
export class MonthlyReportComponent implements OnInit {
  private readonly attendanceService = inject(AttendanceService);
  private readonly calculationService = inject(AttendanceCalculationService);
  private readonly ruleService = inject(AttendanceRuleService);
  private readonly holidayService = inject(HolidayService);
  private readonly weekoffService = inject(WeekoffService);
  private readonly dateTimeService = inject(DateTimeService);
  private readonly notificationService = inject(NotificationService);

  private readonly currentYearMonth = this.dateTimeService.getCurrentYearMonth();
  private readonly todayDateStr = this.dateTimeService.getCurrentDateString();

  readonly selectedYear = signal<number>(this.currentYearMonth.year);
  readonly selectedMonth = signal<number>(this.currentYearMonth.month);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly monthDays = signal<AttendanceDay[]>([]);
  readonly attendanceRules = signal<AttendanceRules | null>(null);
  readonly weekoffs = signal<WeekoffDay[]>([]);

  /** Cached per year, since holidays are only re-fetched when the viewed year changes. */
  private readonly holidaysCache = signal<{ year: number; holidays: Holiday[] } | null>(null);

  readonly monthOptions: SelectOption[] = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: this.dateTimeService.getMonthName(i + 1),
  }));

  readonly yearOptions: SelectOption[] = Array.from({ length: 6 }, (_, i) => {
    const year = this.currentYearMonth.year - i;
    return { value: year, label: String(year) };
  });

  /** Ticks once per second so today's bar (if it includes an open session) keeps a live duration. */
  private readonly tick = toSignal(interval(1000), { initialValue: 0 });

  readonly viewModel = computed<MonthlyReportViewModel | null>(() => {
    this.tick();
    const rules = this.attendanceRules();
    const cache = this.holidaysCache();
    if (!rules || !cache || cache.year !== this.selectedYear()) {
      return null;
    }
    return this.buildViewModel(
      this.monthDays(),
      this.selectedYear(),
      this.selectedMonth(),
      rules,
      cache.holidays,
      this.weekoffs()
    );
  });

  ngOnInit(): void {
    forkJoin({
      rules: this.ruleService.getRules(),
      weekoffs: this.weekoffService.getConfig(),
    }).subscribe({
      next: ({ rules, weekoffs }) => {
        this.attendanceRules.set(rules);
        this.weekoffs.set(weekoffs);
        this.loadMonth(this.selectedYear(), this.selectedMonth());
      },
      error: (err: Error) => {
        this.isLoading.set(false);
        this.notificationService.error(err.message);
      },
    });
  }

  onMonthSelect(month: number): void {
    this.navigateTo(this.selectedYear(), month);
  }

  onYearSelect(year: number): void {
    this.navigateTo(year, this.selectedMonth());
  }

  onPreviousMonth(): void {
    const { year, month } = this.dateTimeService.getPreviousMonth(
      this.selectedYear(),
      this.selectedMonth()
    );
    this.navigateTo(year, month);
  }

  onNextMonth(): void {
    if (this.isNextDisabled()) {
      return;
    }
    const { year, month } = this.dateTimeService.getNextMonth(
      this.selectedYear(),
      this.selectedMonth()
    );
    this.navigateTo(year, month);
  }

  /** Disabled once the selected year/month is the current one — attendance cannot exist for a future month. */
  isNextDisabled(): boolean {
    return (
      this.selectedYear() === this.currentYearMonth.year &&
      this.selectedMonth() === this.currentYearMonth.month
    );
  }

  private navigateTo(year: number, month: number): void {
    // A future month can be reached by combining selects (e.g. picking
    // next year while still on December); clamp back to the current
    // month rather than silently querying/rendering an impossible period.
    if (this.dateTimeService.isFutureYearMonth(year, month)) {
      year = this.currentYearMonth.year;
      month = this.currentYearMonth.month;
    }
    this.selectedYear.set(year);
    this.selectedMonth.set(month);
    this.loadMonth(year, month);
  }

  private loadMonth(year: number, month: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const cache = this.holidaysCache();
    const holidays$ =
      cache && cache.year === year
        ? of(cache.holidays)
        : this.holidayService
            .getHolidaysForYear(year)
            .pipe(tap((holidays) => this.holidaysCache.set({ year, holidays })));

    forkJoin({
      days: this.attendanceService.getMonthForCurrentUser(year, month),
      holidays: holidays$,
    }).subscribe({
      next: ({ days }) => {
        this.monthDays.set(days);
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
    days: AttendanceDay[],
    year: number,
    month: number,
    rules: AttendanceRules,
    holidays: Holiday[],
    weekoffs: WeekoffDay[]
  ): MonthlyReportViewModel {
    const now = this.dateTimeService.now();
    const summary = this.calculationService.getMonthlySummary(days, year, month, now);

    const sortedBreakdown = [...summary.dailyBreakdown].sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    const todayIndexRaw = sortedBreakdown.findIndex((entry) => entry.date === this.todayDateStr);

    const chartValues = sortedBreakdown.map((entry) => {
      let minutes = entry.totalWorkingMinutes;
      // Only today's bar gets the live in-progress top-up — every
      // other day's value is finalized and stays exactly as
      // getMonthlySummary() computed it.
      if (entry.date === this.todayDateStr && entry.hasOpenSession) {
        const todayDay = days.find((d) => d.date === this.todayDateStr);
        const openSession = todayDay
          ? this.calculationService.getOpenSession(todayDay.sessions)
          : null;
        if (openSession) {
          minutes += this.calculationService.getCurrentSessionDurationMinutes(openSession, now);
        }
      }
      return Math.round((minutes / 60) * 100) / 100;
    });

    const counts = this.calculationService.getMonthlyAttendanceCounts(
      days,
      year,
      month,
      now,
      rules,
      holidays,
      weekoffs
    );

    return {
      totalWorkingDays: summary.totalWorkingDays,
      totalSessions: summary.totalSessions,
      totalWorkingHoursDisplay: this.calculationService.formatMinutesAsHoursAndMinutes(
        summary.totalWorkingMinutes
      ),
      averageWorkingHoursPerDayDisplay: this.calculationService.formatMinutesAsHoursAndMinutes(
        Math.round(summary.averageWorkingMinutesPerDay)
      ),
      rows: sortedBreakdown.map((entry) => ({
        dateDisplay: this.dateTimeService.formatShortDate(entry.date),
        firstInDisplay: entry.firstCheckIn ? this.formatTime(entry.firstCheckIn) : '—',
        lastOutDisplay: entry.lastCheckOut ? this.formatTime(entry.lastCheckOut) : '—',
        sessions: entry.totalSessions,
        workingHoursDisplay: this.calculationService.formatMinutesAsHoursAndMinutes(
          entry.totalWorkingMinutes
        ),
        hasOpenSession: entry.hasOpenSession,
      })),
      chartLabels: sortedBreakdown.map((entry) => String(Number(entry.date.split('-')[2]))),
      chartValues,
      todayChartIndex: todayIndexRaw >= 0 ? todayIndexRaw : undefined,
      isEmpty: sortedBreakdown.length === 0,
      fullDayCount: counts.fullDayCount,
      halfDayCount: counts.halfDayCount,
      absentCount: counts.absentCount,
      holidayCount: counts.holidayCount,
      weekoffCount: counts.weekoffCount,
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
