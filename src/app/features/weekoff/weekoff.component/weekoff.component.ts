import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { WeekoffService } from '../../../core/services/weekoff.service';
import { NotificationService } from '../../../core/services/notification.service';
import { WeekoffDay } from '../../../core/models/weekoff.model';

@Component({
  imports: [CommonModule],
  selector: 'app-weekoff',
  styleUrl: './weekoff.component.scss',
  templateUrl: './weekoff.component.html',
})

export class WeekoffComponent implements OnInit {
  private readonly weekoffService = inject(WeekoffService);
  private readonly notificationService = inject(NotificationService);

  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  /** Local, un-persisted edits — only written back on explicit Save. */
  readonly weekoffs = signal<WeekoffDay[]>([]);

  ngOnInit(): void {
    this.weekoffService.getConfig().subscribe({
      next: (config) => {
        // Displayed Sunday-first→Saturday-last per dayOfWeek order,
        // but the mockup lists Monday first — reorder for display only;
        // the underlying array/storage keeps its natural 0-6 order.
        this.weekoffs.set(this.toMondayFirstOrder(config));
        this.isLoading.set(false);
      },
      error: (err: Error) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.message);
        this.notificationService.error(err.message);
      },
    });
  }

  toggleDay(dayOfWeek: number): void {
    this.weekoffs.update((days) =>
      days.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, isWeekoff: !d.isWeekoff } : d))
    );
  }

  onSave(): void {
    this.isSaving.set(true);
    // Persist in natural dayOfWeek (0-6) order regardless of display order.
    const toSave = [...this.weekoffs()].sort((a, b) => a.dayOfWeek - b.dayOfWeek);

    this.weekoffService.updateConfig(toSave).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.notificationService.success('Weekoff configuration saved successfully.');
      },
      error: (err: Error) => {
        this.isSaving.set(false);
        this.notificationService.error(err.message);
      },
    });
  }

  private toMondayFirstOrder(weekoffs: WeekoffDay[]): WeekoffDay[] {
    const order = [1, 2, 3, 4, 5, 6, 0]; // Monday..Sunday
    return order
      .map((dayOfWeek) => weekoffs.find((w) => w.dayOfWeek === dayOfWeek))
      .filter((w): w is WeekoffDay => w !== undefined);
  }
}
