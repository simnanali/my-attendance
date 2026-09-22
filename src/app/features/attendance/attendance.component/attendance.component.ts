import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subject, combineLatest, timer } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';

import { AttendanceService } from '../../../core/services/attendance.service';
import { AttendanceCalculationService } from '../../../core/services/attendance-calculation.service';
import { DateTimeService } from '../../../core/services/date-time.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AttendanceDay, AttendanceSession } from '../../../core/models/attendance.model';

interface SessionViewModel {
  id: string;
  checkInDisplay: string;
  checkOutDisplay: string | null;
  durationDisplay: string;
  isOpen: boolean;
}

interface AttendanceViewModel {
  currentDateDisplay: string;
  currentTimeDisplay: string;
  hasOpenSession: boolean;
  totalWorkingMinutesDisplay: string;
  totalSessions: number;
  sessions: SessionViewModel[];
}

@Component({
  imports: [CommonModule],
  selector: 'app-attendance',
  styleUrl: './attendance.component.scss',
  templateUrl: './attendance.component.html',
})
export class AttendanceComponent implements OnInit, OnDestroy {
  private readonly attendanceService = inject(AttendanceService);
  private readonly calculationService = inject(AttendanceCalculationService);
  private readonly dateTimeService = inject(DateTimeService);
  private readonly notificationService = inject(NotificationService);

  private readonly destroy$ = new Subject<void>();

  readonly isLoading = signal(true);
  readonly isProcessing = signal(false);

  viewModel$!: Observable<AttendanceViewModel>;

  ngOnInit(): void {
    this.attendanceService.loadToday().subscribe({
      next: () => this.isLoading.set(false),
      error: () => this.isLoading.set(false),
    });

    // timer(0, 1000) re-runs buildViewModel every second so an open
    // session's live duration and the clock stay current, without
    // re-fetching from storage each tick (only currentDay$ changes
    // trigger a fresh fetch; the timer just re-renders from the same data).
    this.viewModel$ = combineLatest([
      this.attendanceService.currentDay$,
      timer(0, 1000),
    ]).pipe(
      map(([day]) => this.buildViewModel(day)),
      takeUntil(this.destroy$)
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onCheckIn(): void {
    this.isProcessing.set(true);
    this.attendanceService.checkIn().subscribe({
      next: () => {
        this.isProcessing.set(false);
        this.notificationService.success('Welcome!, Checked in successfully.');
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
        this.notificationService.success('Great!, Checked out successfully.');
      },
      error: (err: Error) => {
        this.isProcessing.set(false);
        this.notificationService.error(err.message);
      },
    });
  }

  private buildViewModel(day: AttendanceDay | null): AttendanceViewModel {
    const now = this.dateTimeService.now();
    const sessions = day?.sessions ?? [];
    const openSession = this.calculationService.getOpenSession(sessions);
    const totalWorkingMinutes = this.calculationService.calculateTotalWorkingMinutes(sessions);

    return {
      currentDateDisplay: this.dateTimeService.formatDateDisplay(
        this.dateTimeService.getCurrentDateString()
      ),
      currentTimeDisplay: this.dateTimeService.getCurrentTimeDisplay(),
      hasOpenSession: openSession !== null,
      totalWorkingMinutesDisplay:
        this.calculationService.formatMinutesAsHoursAndMinutes(totalWorkingMinutes),
      totalSessions: sessions.length,
      sessions: sessions.map((session) => this.buildSessionViewModel(session, now)),
    };
  }

  private buildSessionViewModel(session: AttendanceSession, now: Date): SessionViewModel {
    const isOpen = session.checkOut === null;
    const durationMinutes = isOpen
      ? this.calculationService.getCurrentSessionDurationMinutes(session, now)
      : this.calculationService.calculateSessionDurationMinutes(session) ?? 0;

    return {
      id: session.id,
      checkInDisplay: this.formatTime(session.checkIn),
      checkOutDisplay: session.checkOut ? this.formatTime(session.checkOut) : null,
      durationDisplay: this.calculationService.formatMinutesAsHoursAndMinutes(durationMinutes),
      isOpen,
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