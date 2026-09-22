import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

import { AttendanceService } from '../../../core/services/attendance.service';
import { AttendanceCalculationService } from '../../../core/services/attendance-calculation.service';
import { DateTimeService } from '../../../core/services/date-time.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AttendanceDay, AttendanceSession } from '../../../core/models/attendance.model';

interface SessionRowViewModel {
  sessionNumber: number;
  checkInDisplay: string;
  checkOutDisplay: string | null;
  durationDisplay: string;
  status: 'Completed' | 'In Progress';
}

interface DailyReportViewModel {
  dateDisplay: string;
  firstCheckInDisplay: string | null;
  lastCheckOutDisplay: string | null;
  totalSessions: number;
  totalWorkingHoursDisplay: string;
  sessions: SessionRowViewModel[];
  isEmpty: boolean;
}

@Component({
  selector: 'app-daily-report',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './daily-report.component.html',
  styleUrl: './daily-report.component.scss',
})
export class DailyReportComponent implements OnInit {
  private readonly attendanceService = inject(AttendanceService);
  private readonly calculationService = inject(AttendanceCalculationService);
  private readonly dateTimeService = inject(DateTimeService);
  private readonly notificationService = inject(NotificationService);

  readonly todayDate = this.dateTimeService.getCurrentDateString();

  readonly selectedDate = signal<string>(this.todayDate);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly dayData = signal<AttendanceDay | null>(null);

  /**
   * Ticks once per second purely so an open session's live duration
   * stays current in the view. Reading tick() inside the computed
   * below makes the computed re-evaluate every second WITHOUT
   * re-fetching from storage — only dayData() changes trigger a fetch.
   */
  private readonly tick = toSignal(interval(1000), { initialValue: 0 });

  readonly viewModel = computed<DailyReportViewModel>(() => {
    this.tick();
    return this.buildViewModel(this.dayData(), this.selectedDate());
  });

  ngOnInit(): void {
    this.loadDay(this.selectedDate());
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

    this.attendanceService.getDayForCurrentUser(date).subscribe({
      next: (day) => {
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

  private buildViewModel(day: AttendanceDay | null, date: string): DailyReportViewModel {
    const sessions = day?.sessions ?? [];
    const now = this.dateTimeService.now();
    const summary = this.calculationService.getDailySummary(day, now);

    return {
      dateDisplay: this.dateTimeService.formatDateDisplay(date),
      firstCheckInDisplay: summary.firstCheckIn ? this.formatTime(summary.firstCheckIn) : null,
      lastCheckOutDisplay: summary.lastCheckOut ? this.formatTime(summary.lastCheckOut) : null,
      totalSessions: summary.totalSessions,
      totalWorkingHoursDisplay: this.calculationService.formatMinutesAsHoursAndMinutes(
        summary.totalWorkingMinutes
      ),
      sessions: sessions.map((session, index) => this.buildSessionRow(session, index + 1, now)),
      isEmpty: sessions.length === 0,
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
