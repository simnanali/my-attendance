import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { User } from '../../models/user.model';
import { AttendanceDay } from '../../models/attendance.model';
import { AppSettings } from '../../models/settings.model';
import { EntityIdType } from '../../models/counters.model';
import { Holiday } from '../../models/holiday.model';
import { WeekoffDay } from '../../models/weekoff.model';
import { AttendanceRules } from '../../models/attendance-rule.model';

/**
 * Abstraction over persistence. Feature services depend on this interface,
 * never on a concrete implementation, so the underlying storage mechanism
 * (JSON-file server, localStorage fallback, or eventually a .NET Web API)
 * can be swapped without changing any feature/business logic.
 *
 * Concrete implementations (JsonFileStorageService, LocalStorageFallback
 * Service) are added in Phase 2 — Models and JSON Storage.
 */
export interface StorageService {
  getUsers(): Observable<User[]>;
  saveUsers(users: User[]): Observable<void>;

  getAttendance(year: number, month: number): Observable<AttendanceDay[]>;
  saveAttendance(
    year: number,
    month: number,
    attendance: AttendanceDay[]
  ): Observable<void>;

  getSettings(): Observable<AppSettings>;
  saveSettings(settings: AppSettings): Observable<void>;

  getHolidays(): Observable<Holiday[]>;
  saveHolidays(holidays: Holiday[]): Observable<void>;

  getWeekoffs(): Observable<WeekoffDay[]>;
  saveWeekoffs(weekoffs: WeekoffDay[]): Observable<void>;

  getAttendanceRules(): Observable<AttendanceRules>;
  saveAttendanceRules(rules: AttendanceRules): Observable<void>;

  /**
   * Returns the next unique ID for the given entity type. In V1 this is
   * backed by data/counters.json on the JSON file-server. A future .NET
   * + SQL Server implementation would likely not need this method at
   * all (identity columns assign IDs on insert) — that difference is
   * expected and confined entirely to whichever StorageService
   * implementation is active.
   */
  generateId(type: EntityIdType): Observable<string>;
}

export const STORAGE_SERVICE = new InjectionToken<StorageService>(
  'StorageService'
);