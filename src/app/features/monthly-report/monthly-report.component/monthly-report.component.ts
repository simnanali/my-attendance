import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

import { AttendanceService } from '../../../core/services/attendance.service';
import { AttendanceCalculationService } from '../../../core/services/attendance-calculation.service';
import { DateTimeService } from '../../../core/services/date-time.service';
import { NotificationService } from '../../../core/services/notification.service';
import { BarChartComponent } from '../../../shared/components/bar-chart/bar-chart.component/bar-chart.component';
import { AttendanceDay } from '../../../core/models/attendance.model';

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
  isEmpty: boolean;
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
  private readonly dateTimeService = inject(DateTimeService);
  private readonly notificationService = inject(NotificationService);

  private readonly currentYearMonth = this.dateTimeService.getCurrentYearMonth();

  readonly selectedYear = signal<number>(this.currentYearMonth.year);
  readonly selectedMonth = signal<number>(this.currentYearMonth.month);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly monthDays = signal<AttendanceDay[]>([]);

  readonly monthOptions: SelectOption[] = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: this.dateTimeService.getMonthName(i + 1),
  }));

  readonly yearOptions: SelectOption[] = Array.from({ length: 6 }, (_, i) => {
    const year = this.currentYearMonth.year - i;
    return { value: year, label: String(year) };
  });

  /** Ticks once per second so an open session on today (if within the selected month) keeps a live duration. */
  private readonly tick = toSignal(interval(1000), { initialValue: 0 });

  readonly viewModel = computed<MonthlyReportViewModel>(() => {
    this.tick();
    return this.buildViewModel(this.monthDays(), this.selectedYear(), this.selectedMonth());
  });

  ngOnInit(): void {
    this.loadMonth(this.selectedYear(), this.selectedMonth());
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

    this.attendanceService.getMonthForCurrentUser(year, month).subscribe({
      next: (days) => {
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
    month: number
  ): MonthlyReportViewModel {
    const now = this.dateTimeService.now();
    const summary = this.calculationService.getMonthlySummary(days, year, month, now);

    const sortedBreakdown = [...summary.dailyBreakdown].sort((a, b) =>
      a.date.localeCompare(b.date)
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
      chartValues: sortedBreakdown.map((entry) =>
        Math.round((entry.totalWorkingMinutes / 60) * 100) / 100
      ),
      isEmpty: sortedBreakdown.length === 0,
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
