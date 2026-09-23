import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { HolidayService } from '../../../core/services/holiday.service';
import { DateTimeService } from '../../../core/services/date-time.service';
import { NotificationService } from '../../../core/services/notification.service';
import { HOLIDAY_TYPES, Holiday } from '../../../core/models/holiday.model';

@Component({
  imports: [CommonModule, ReactiveFormsModule],
  selector: 'app-holidays',
  styleUrl: './holidays.component.scss',
  templateUrl: './holidays.component.html',
})
export class HolidaysComponent implements OnInit {
  private readonly holidayService = inject(HolidayService);
  private readonly dateTimeService = inject(DateTimeService);
  private readonly notificationService = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  readonly holidayTypes = HOLIDAY_TYPES;

  private readonly currentYear = this.dateTimeService.getCurrentYearMonth().year;
  readonly yearOptions: number[] = Array.from(
    { length: 6 },
    (_, i) => this.currentYear - 2 + i
  );

  readonly selectedYear = signal<number>(this.currentYear);
  readonly selectedType = signal<string>('All');
  readonly searchTerm = signal<string>('');

  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly holidays = signal<Holiday[]>([]);

  readonly isFormOpen = signal(false);
  readonly editingHoliday = signal<Holiday | null>(null);
  readonly isSaving = signal(false);
  readonly formError = signal<string | null>(null);

  readonly deletingId = signal<string | null>(null);

  readonly form = this.fb.group({
    date: this.fb.control('', [Validators.required]),
    name: this.fb.control('', [Validators.required]),
    type: this.fb.control(HOLIDAY_TYPES[0], [Validators.required]),
  });

  get dateControl() {
    return this.form.get('date');
  }
  get nameControl() {
    return this.form.get('name');
  }

  readonly derivedDayDisplay = computed(() => {
    const dateValue = this.form.get('date')?.value;
    return dateValue ? this.dateTimeService.getDayOfWeekName(dateValue) : '—';
  });

  readonly filteredHolidays = computed(() => {
    const type = this.selectedType();
    const search = this.searchTerm().trim().toLowerCase();

    return this.holidays()
      .filter((h) => type === 'All' || h.type === type)
      .filter((h) => !search || h.name.toLowerCase().includes(search))
      .sort((a, b) => a.date.localeCompare(b.date));
  });

  ngOnInit(): void {
    this.loadYear(this.selectedYear());
  }

  onYearChange(year: number): void {
    this.selectedYear.set(year);
    this.loadYear(year);
  }

  onTypeChange(type: string): void {
    this.selectedType.set(type);
  }

  onSearchChange(term: string): void {
    this.searchTerm.set(term);
  }

  onAddClick(): void {
    this.editingHoliday.set(null);
    this.formError.set(null);
    this.form.reset({ date: '', name: '', type: HOLIDAY_TYPES[0] });
    this.isFormOpen.set(true);
  }

  onEditClick(holiday: Holiday): void {
    this.editingHoliday.set(holiday);
    this.formError.set(null);
    this.form.reset({ date: holiday.date, name: holiday.name, type: holiday.type });
    this.isFormOpen.set(true);
  }

  onCancelForm(): void {
    this.isFormOpen.set(false);
    this.editingHoliday.set(null);
    this.formError.set(null);
  }

  onSubmitForm(): void {
    this.formError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const { date, name, type } = this.form.getRawValue();
    const editing = this.editingHoliday();

    const request$ = editing
      ? this.holidayService.updateHoliday(editing.id, date!, name!, type!)
      : this.holidayService.addHoliday(date!, name!, type!);

    request$.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.notificationService.success(
          editing ? 'Holiday updated successfully.' : 'Holiday added successfully.'
        );
        this.isFormOpen.set(false);
        this.editingHoliday.set(null);
        this.loadYear(this.selectedYear());
      },
      error: (err: Error) => {
        this.isSaving.set(false);
        this.formError.set(err.message);
      },
    });
  }

  onDeleteClick(id: string): void {
    this.deletingId.set(id);
  }

  onCancelDelete(): void {
    this.deletingId.set(null);
  }

  onConfirmDelete(id: string): void {
    this.holidayService.deleteHoliday(id).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.notificationService.success('Holiday deleted successfully.');
        this.loadYear(this.selectedYear());
      },
      error: (err: Error) => {
        this.deletingId.set(null);
        this.notificationService.error(err.message);
      },
    });
  }

  formatDate(dateString: string): string {
    return this.dateTimeService.formatShortDate(dateString);
  }

  private loadYear(year: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.holidayService.getHolidaysForYear(year).subscribe({
      next: (holidays) => {
        this.holidays.set(holidays);
        this.isLoading.set(false);
      },
      error: (err: Error) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.message);
        this.notificationService.error(err.message);
      },
    });
  }
}