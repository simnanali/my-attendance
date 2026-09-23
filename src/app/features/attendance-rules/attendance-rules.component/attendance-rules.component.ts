import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AttendanceRuleService } from '../../../core/services/attendance-rule.service';
import { AttendanceCalculationService } from '../../../core/services/attendance-calculation.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AttendanceRules } from '../../../core/models/attendance-rule.model';

@Component({
  imports: [CommonModule],
  selector: 'app-attendance-rules',
  styleUrl: './attendance-rules.component.scss',
  templateUrl: './attendance-rules.component.html',
})

export class AttendanceRulesComponent implements OnInit {
  private readonly ruleService = inject(AttendanceRuleService);
  private readonly calculationService = inject(AttendanceCalculationService);
  private readonly notificationService = inject(NotificationService);

  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly formError = signal<string | null>(null);

  readonly standardHours = signal(8);
  readonly standardMinutes = signal(0);
  readonly fullDayHours = signal(6);
  readonly fullDayMinutes = signal(0);
  readonly halfDayHours = signal(4);
  readonly halfDayMinutes = signal(0);

  readonly standardTotalMinutes = computed(
    () => this.standardHours() * 60 + this.standardMinutes()
  );
  readonly fullDayTotalMinutes = computed(
    () => this.fullDayHours() * 60 + this.fullDayMinutes()
  );
  readonly halfDayTotalMinutes = computed(
    () => this.halfDayHours() * 60 + this.halfDayMinutes()
  );

  readonly standardDisplay = computed(() =>
    this.calculationService.formatMinutesAsHoursAndMinutes(this.standardTotalMinutes())
  );
  readonly fullDayDisplay = computed(() =>
    this.calculationService.formatMinutesAsHoursAndMinutes(this.fullDayTotalMinutes())
  );
  readonly halfDayDisplay = computed(() =>
    this.calculationService.formatMinutesAsHoursAndMinutes(this.halfDayTotalMinutes())
  );

  ngOnInit(): void {
    this.ruleService.getRules().subscribe({
      next: (rules) => {
        this.applyRules(rules);
        this.isLoading.set(false);
      },
      error: (err: Error) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.message);
        this.notificationService.error(err.message);
      },
    });
  }

  updateStandardHours(value: string): void {
    this.standardHours.set(this.clampHours(+value));
  }
  updateStandardMinutes(value: string): void {
    this.standardMinutes.set(this.clampMinutes(+value));
  }
  updateFullDayHours(value: string): void {
    this.fullDayHours.set(this.clampHours(+value));
  }
  updateFullDayMinutes(value: string): void {
    this.fullDayMinutes.set(this.clampMinutes(+value));
  }
  updateHalfDayHours(value: string): void {
    this.halfDayHours.set(this.clampHours(+value));
  }
  updateHalfDayMinutes(value: string): void {
    this.halfDayMinutes.set(this.clampMinutes(+value));
  }

  onSave(): void {
    this.formError.set(null);

    const rules: AttendanceRules = {
      standardWorkingMinutes: this.standardTotalMinutes(),
      fullDayThresholdMinutes: this.fullDayTotalMinutes(),
      halfDayThresholdMinutes: this.halfDayTotalMinutes(),
    };

    this.isSaving.set(true);
    this.ruleService.saveRules(rules).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.notificationService.success('Attendance rules saved successfully.');
      },
      error: (err: Error) => {
        this.isSaving.set(false);
        this.formError.set(err.message);
      },
    });
  }

  private applyRules(rules: AttendanceRules): void {
    this.standardHours.set(Math.floor(rules.standardWorkingMinutes / 60));
    this.standardMinutes.set(rules.standardWorkingMinutes % 60);
    this.fullDayHours.set(Math.floor(rules.fullDayThresholdMinutes / 60));
    this.fullDayMinutes.set(rules.fullDayThresholdMinutes % 60);
    this.halfDayHours.set(Math.floor(rules.halfDayThresholdMinutes / 60));
    this.halfDayMinutes.set(rules.halfDayThresholdMinutes % 60);
  }

  private clampHours(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(23, Math.floor(value)));
  }

  private clampMinutes(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(59, Math.floor(value)));
  }
}

