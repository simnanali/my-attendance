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

interface TimelineEvent {
  timeDisplay: string;
  label: 'Check In' | 'Check Out' | 'In Progress';
}

interface DashboardViewModel {
  currentDateDisplay: string;
  currentTimeDisplay: string;
  hasOpenSession: boolean;

  todayWorkingHoursDisplay: string;
  todaySessions: number;
  firstCheckInDisplay: string;
  currentStatusDisplay: 'Checked In' | 'Checked Out';

  timeline: TimelineEvent[];
  isTodayEmpty: boolean;

  monthlyWorkingDays: number;
  monthlyTotalHoursDisplay: string;
  monthlyAverageHoursDisplay: string;
  chartLabels: string[];
  chartValues: number[];
  hasMonthlyData: boolean;
}

@Component({
  imports: [CommonModule, BarChartComponent],
  selector: 'app-dashboard',
  styleUrl: './dashboard.component.scss',
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private readonly attendanceService = inject(AttendanceService);
  private readonly calculationService = inject(AttendanceCalculationService);
  private readonly dateTimeService = inject(DateTimeService);
  private readonly notificationService = inject(NotificationService);

  readonly isLoading = signal(true);
  readonly isProcessing = signal(false);
  readonly monthDays = signal<AttendanceDay[]>([]);

  private readonly currentDay = toSignal<AttendanceDay | null>(
    this.attendanceService.currentDay$,
    { initialValue: null }
  );

  /** Ticks once per second so the clock and any open session's live duration stay current. */
  private readonly tick = toSignal(interval(1000), { initialValue: 0 });

  readonly viewModel = computed<DashboardViewModel>(() => {
    this.tick();
    return this.buildViewModel(this.currentDay(), this.monthDays());
  });

  ngOnInit(): void {
    this.attendanceService.loadToday().subscribe({
      next: () => this.loadMonth(),
      error: (err: Error) => {
        this.isLoading.set(false);
        this.notificationService.error(err.message);
      },
    });
  }

  onCheckIn(): void {
    this.isProcessing.set(true);
    this.attendanceService.checkIn().subscribe({
      next: () => {
        this.isProcessing.set(false);
        this.notificationService.success('Checked in successfully.');
        this.loadMonth();
      },
      error: (err: Error) => {
        this.isProcessing.set(false);
        this.notificationService.error(err.message);
      },
    });
  }

  onCheckOut(): void {
    this.isProcessing.set(true);
    this.attendanceService.checkOut().subscribe({
      next: () => {
        this.isProcessing.set(false);
        this.notificationService.success('Checked out successfully.');
        this.loadMonth();
      },
      error: (err: Error) => {
        this.isProcessing.set(false);
        this.notificationService.error(err.message);
      },
    });
  }

  private loadMonth(): void {
    const { year, month } = this.dateTimeService.getCurrentYearMonth();
    this.attendanceService.getMonthForCurrentUser(year, month).subscribe({
      next: (days) => {
        this.monthDays.set(days);
        this.isLoading.set(false);
      },
      error: (err: Error) => {
        this.isLoading.set(false);
        this.notificationService.error(err.message);
      },
    });
  }

  private buildViewModel(
    day: AttendanceDay | null,
    monthDays: AttendanceDay[]
  ): DashboardViewModel {
    const now = this.dateTimeService.now();
    const sessions = day?.sessions ?? [];
    const dailySummary = this.calculationService.getDailySummary(day, now);

    const { year, month } = this.dateTimeService.getCurrentYearMonth();
    const monthlySummary = this.calculationService.getMonthlySummary(
      monthDays,
      year,
      month,
      now
    );
    const sortedBreakdown = [...monthlySummary.dailyBreakdown].sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    const timeline: TimelineEvent[] = [];
    for (const session of sessions) {
      timeline.push({ timeDisplay: this.formatTime(session.checkIn), label: 'Check In' });
      if (session.checkOut) {
        timeline.push({ timeDisplay: this.formatTime(session.checkOut), label: 'Check Out' });
      } else {
        timeline.push({ timeDisplay: 'Current', label: 'In Progress' });
      }
    }

    return {
      currentDateDisplay: this.dateTimeService.formatDateDisplay(
        this.dateTimeService.getCurrentDateString()
      ),
      currentTimeDisplay: this.dateTimeService.getCurrentTimeDisplay(),
      hasOpenSession: dailySummary.hasOpenSession,

      todayWorkingHoursDisplay: this.calculationService.formatMinutesAsHoursAndMinutes(
        dailySummary.totalWorkingMinutes
      ),
      todaySessions: dailySummary.totalSessions,
      firstCheckInDisplay: dailySummary.firstCheckIn
        ? this.formatTime(dailySummary.firstCheckIn)
        : '—',
      currentStatusDisplay: dailySummary.hasOpenSession ? 'Checked In' : 'Checked Out',

      timeline,
      isTodayEmpty: sessions.length === 0,

      monthlyWorkingDays: monthlySummary.totalWorkingDays,
      monthlyTotalHoursDisplay: this.calculationService.formatMinutesAsHoursAndMinutes(
        monthlySummary.totalWorkingMinutes
      ),
      monthlyAverageHoursDisplay: this.calculationService.formatMinutesAsHoursAndMinutes(
        Math.round(monthlySummary.averageWorkingMinutesPerDay)
      ),
      chartLabels: sortedBreakdown.map((entry) => String(Number(entry.date.split('-')[2]))),
      chartValues: sortedBreakdown.map(
        (entry) => Math.round((entry.totalWorkingMinutes / 60) * 100) / 100
      ),
      hasMonthlyData: sortedBreakdown.length > 0,
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
