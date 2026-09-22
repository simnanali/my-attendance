import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, switchMap, throwError } from 'rxjs';

import { STORAGE_SERVICE } from './storage/storage.service';
import { IdGeneratorService } from './id-generator.service';
import { DateTimeService } from './date-time.service';
import { Holiday } from '../models/holiday.model';

/**
 * CRUD + filtering for holidays. Duplicate-date rejection happens HERE
 * (fetch-then-check-then-write), the same pattern AuthService already
 * uses for username/email uniqueness — not left to the UI or the
 * server (the server's role stays limited to file I/O, per the
 * project's established convention).
 */
@Injectable({ providedIn: 'root' })
export class HolidayService {
  private readonly storage = inject(STORAGE_SERVICE);
  private readonly idGenerator = inject(IdGeneratorService);
  private readonly dateTime = inject(DateTimeService);

  getHolidays(): Observable<Holiday[]> {
    return this.storage.getHolidays();
  }

  getHolidaysForYear(year: number): Observable<Holiday[]> {
    const prefix = `${year}-`;
    return this.getHolidays().pipe(
      map((holidays) => holidays.filter((h) => h.date.startsWith(prefix)))
    );
  }

  addHoliday(date: string, name: string, type: string): Observable<Holiday> {
    return this.getHolidays().pipe(
      switchMap((holidays) => {
        if (holidays.some((h) => h.date === date)) {
          return throwError(
            () => new Error('A holiday is already configured for this date.')
          );
        }

        return this.idGenerator.generateHolidayId().pipe(
          switchMap((id) => {
            const newHoliday: Holiday = {
              id,
              date,
              day: this.dateTime.getDayOfWeekName(date),
              name,
              type,
            };
            return this.storage
              .saveHolidays([...holidays, newHoliday])
              .pipe(map(() => newHoliday));
          })
        );
      }),
      catchError((err) =>
        throwError(() => new Error(err?.message ?? 'Failed to add holiday.'))
      )
    );
  }

  updateHoliday(
    id: string,
    date: string,
    name: string,
    type: string
  ): Observable<Holiday> {
    return this.getHolidays().pipe(
      switchMap((holidays) => {
        const duplicate = holidays.some((h) => h.date === date && h.id !== id);
        if (duplicate) {
          return throwError(
            () => new Error('A holiday is already configured for this date.')
          );
        }

        const updated: Holiday = {
          id,
          date,
          day: this.dateTime.getDayOfWeekName(date),
          name,
          type,
        };
        const merged = holidays.map((h) => (h.id === id ? updated : h));
        return this.storage.saveHolidays(merged).pipe(map(() => updated));
      }),
      catchError((err) =>
        throwError(() => new Error(err?.message ?? 'Failed to update holiday.'))
      )
    );
  }

  deleteHoliday(id: string): Observable<void> {
    return this.getHolidays().pipe(
      switchMap((holidays) => {
        const filtered = holidays.filter((h) => h.id !== id);
        return this.storage.saveHolidays(filtered);
      }),
      catchError(() =>
        throwError(() => new Error('Failed to delete holiday. Please try again.'))
      )
    );
  }
}