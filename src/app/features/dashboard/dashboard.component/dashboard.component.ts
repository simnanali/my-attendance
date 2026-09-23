import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { forkJoin, interval } from 'rxjs';

import { AttendanceService } from '../../../core/services/attendance.service';
import { AttendanceCalculationService } from '../../../core/services/attendance-calculation.service';
import { DateTimeService } from '../../../core/services/date-time.service';
import { NotificationService } from '../../../core/services/notification.service';
import { HolidayService } from '../../../core/services/holiday.service';
import { WeekoffService } from '../../../core/services/weekoff.service';
import { AttendanceRuleService } from '../../../core/services/attendance-rule.service';
import { BarChartComponent } from '../../../shared/components/bar-chart/bar-chart.component/bar-chart.component';
import { AttendanceDay } from '../../../core/models/attendance.model';
import { AttendanceRules } from '../../../core/models/attendance-rule.model';
import { AttendanceStatus } from '../../../core/models/attendance-status.model';

interface TimelineEvent {
  timeDisplay: string;
  label: 'Check In' | 'Check Out' | 'In Progress';
}

type DayContextType = 'holiday' | 'weekoff' | null;

interface DashboardViewModel {
  currentDateDisplay: string;
  currentTimeDisplay: string;
  hasOpenSession: boolean;

  todayWorkingHoursDisplay: string;
  todayInProgressDisplay: string | null;
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

  // Today's Progress (Phase 8B)
  progressPercentage: number;
  progressCompletedPercent: number;
  progressInProgressPercent: number;
  progressActualDisplay: string;
  progressTargetDisplay: string;
  progressRemainingDisplay: string;
  attendanceStatus: AttendanceStatus;
  halfDayMarkerPercent: number;
  fullDayMarkerPercent: number;
  dayContextLabel: string | null;
  dayContextType: DayContextType;
  _calculatedCompletedInprogress: number;
  _calculatedCompletedInprogressDisplay: string;
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
  private readonly ruleService = inject(AttendanceRuleService);
  private readonly holidayService = inject(HolidayService);
  private readonly weekoffService = inject(WeekoffService);
  private readonly dateTimeService = inject(DateTimeService);
  private readonly notificationService = inject(NotificationService);

  readonly isLoading = signal(true);
  readonly isProcessing = signal(false);
  readonly monthDays = signal<AttendanceDay[]>([]);
  readonly attendanceRules = signal<AttendanceRules | null>(null);
  readonly dayContextLabel = signal<string | null>(null);
  readonly dayContextType = signal<DayContextType>(null);

  private readonly currentDay = toSignal<AttendanceDay | null>(
    this.attendanceService.currentDay$,
    { initialValue: null }
  );

  /** Ticks once per second so the clock, any open session's live duration, and today's progress bar stay current. */
  private readonly tick = toSignal(interval(1000), { initialValue: 0 });

  readonly viewModel = computed<DashboardViewModel | null>(() => {
    this.tick();
    const rules = this.attendanceRules();
    if (!rules) {
      return null;
    }

    //return this.buildViewModel(this.currentDay(), this.monthDays(), rules);
    var vmModel = this.buildViewModel(this.currentDay(), this.monthDays(), rules);
    console.log("vmModel: ");
    console.log(vmModel);
    return vmModel;
  });

  ngOnInit(): void {
    const { year } = this.dateTimeService.getCurrentYearMonth();
    const today = this.dateTimeService.getCurrentDateString();

    this.attendanceService.loadToday().subscribe({
      next: () => {
        forkJoin({
          month: this.fetchMonth(),
          rules: this.ruleService.getRules(),
          holidays: this.holidayService.getHolidaysForYear(year),
          weekoffs: this.weekoffService.getConfig(),
        }).subscribe({
          next: ({ month, rules, holidays, weekoffs }) => {
            this.monthDays.set(month);
            this.attendanceRules.set(rules);

            const holidayToday = holidays.find((h) => h.date === today);
            if (holidayToday) {
              this.dayContextLabel.set(`Holiday: ${holidayToday.name}`);
              this.dayContextType.set('holiday');
            } else if (this.weekoffService.isWeekoff(today, weekoffs)) {
              this.dayContextLabel.set('Weekoff');
              this.dayContextType.set('weekoff');
            } else {
              this.dayContextLabel.set(null);
              this.dayContextType.set(null);
            }

            this.isLoading.set(false);
          },
          error: (err: Error) => {
            this.isLoading.set(false);
            this.notificationService.error(err.message);
          },
        });
      },
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
        this.refreshMonth();
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
        this.refreshMonth();
      },
      error: (err: Error) => {
        this.isProcessing.set(false);
        this.notificationService.error(err.message);
      },
    });
  }

  private fetchMonth() {
    const { year, month } = this.dateTimeService.getCurrentYearMonth();
    return this.attendanceService.getMonthForCurrentUser(year, month);
  }

  /** Re-fetches only the monthly attendance days after a check-in/out — rules/holiday/weekoff don't change from that action. */
  private refreshMonth(): void {
    this.fetchMonth().subscribe({
      next: (days) => this.monthDays.set(days),
      error: (err: Error) => this.notificationService.error(err.message),
    });
  }

  private buildViewModel(
    day: AttendanceDay | null,
    monthDays: AttendanceDay[],
    rules: AttendanceRules
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

    const statusResult = this.calculationService.calculateAttendanceStatus(
      dailySummary.totalWorkingMinutes,
      rules
    );
    const progress = this.calculationService.calculateProgress(
      dailySummary.totalWorkingMinutes,
      rules.standardWorkingMinutes
    );

    const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

    // "In Progress" figures — the currently open session's own live
    // duration, kept entirely separate from the finalized
    // totalWorkingMinutes above. Never folded into the official total,
    // status, or remaining-target math; used only for the secondary KPI
    // line and the progress bar's live preview segment (Section 18:
    // preserve the distinction between completed and open-session time).
    const openSession = this.calculationService.getOpenSession(sessions);
    const inProgressMinutes = openSession
      ? this.calculationService.getCurrentSessionDurationMinutes(openSession, now)
      : 0;

    const targetMinutes = rules.standardWorkingMinutes;
    const completedPercent =
      targetMinutes > 0
        ? clampPercent((dailySummary.totalWorkingMinutes / targetMinutes) * 100)
        : 0;
    const combinedMinutes = dailySummary.totalWorkingMinutes + inProgressMinutes;
    const combinedPercent =
      targetMinutes > 0 ? clampPercent((combinedMinutes / targetMinutes) * 100) : 0;
    const inProgressSegmentPercent = Math.max(0, combinedPercent - completedPercent);

    return {
      currentDateDisplay: this.dateTimeService.formatDateDisplay(
        this.dateTimeService.getCurrentDateString()
      ),
      currentTimeDisplay: this.dateTimeService.getCurrentTimeDisplay(),
      hasOpenSession: dailySummary.hasOpenSession,

      todayWorkingHoursDisplay: this.calculationService.formatMinutesAsHoursAndMinutes(
        dailySummary.totalWorkingMinutes
      ),
      todayInProgressDisplay:
        inProgressMinutes > 0
          ? this.calculationService.formatMinutesAsHoursAndMinutes(inProgressMinutes)
          : null,
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

      progressPercentage: progress.percentage,
      progressCompletedPercent: completedPercent,
      progressInProgressPercent: inProgressSegmentPercent,
      progressActualDisplay: this.calculationService.formatMinutesAsHoursAndMinutes(
        dailySummary.totalWorkingMinutes
      ),
      progressTargetDisplay: this.calculationService.formatMinutesAsHoursAndMinutes(
        rules.standardWorkingMinutes
      ),
      progressRemainingDisplay: progress.targetReached
        ? 'Target Completed'
        : `Remaining: ${this.calculationService.formatMinutesAsHoursAndMinutes(progress.remainingMinutes)}`,
      attendanceStatus: statusResult.status,
      halfDayMarkerPercent: clampPercent(
        (rules.halfDayThresholdMinutes / rules.standardWorkingMinutes) * 100
      ),
      fullDayMarkerPercent: clampPercent(
        (rules.fullDayThresholdMinutes / rules.standardWorkingMinutes) * 100
      ),
      dayContextLabel: this.dayContextLabel(),
      dayContextType: this.dayContextType(),

      //new code
      _calculatedCompletedInprogress: dailySummary.totalWorkingMinutes + inProgressMinutes,
      _calculatedCompletedInprogressDisplay:this.calculationService.formatMinutesAsHoursAndMinutes(dailySummary.totalWorkingMinutes + inProgressMinutes)
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