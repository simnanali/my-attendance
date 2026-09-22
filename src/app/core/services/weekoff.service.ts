import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { STORAGE_SERVICE } from './storage/storage.service';
import { DateTimeService } from './date-time.service';
import { WeekoffDay } from '../models/weekoff.model';

/**
 * Global (not per-user) weekoff configuration — always exactly 7
 * entries, one per JS Date.getDay() value (0=Sunday..6=Saturday).
 * V1 intentionally supports only whole-weekday toggling; advanced
 * patterns (2nd/4th Saturday, per-user config) are explicitly out of
 * scope for this phase but this shape doesn't block adding them later.
 */
@Injectable({ providedIn: 'root' })
export class WeekoffService {
    private readonly storage = inject(STORAGE_SERVICE);
    private readonly dateTime = inject(DateTimeService);

    getConfig(): Observable<WeekoffDay[]> {
        return this.storage.getWeekoffs();
    }

    updateConfig(weekoffs: WeekoffDay[]): Observable<void> {
        return this.storage.saveWeekoffs(weekoffs);
    }

    /** True if the given YYYY-MM-DD date falls on a configured weekoff day. */
    isWeekoff(date: string, weekoffs: WeekoffDay[]): boolean {
        const dayOfWeek = this.dateTime.parseDateOnly(date).getDay();
        return weekoffs.some((w) => w.dayOfWeek === dayOfWeek && w.isWeekoff);
    }
}
