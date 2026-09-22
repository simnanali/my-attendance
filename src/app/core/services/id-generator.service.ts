import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { STORAGE_SERVICE } from './storage/storage.service';

/**
 * Thin, typed wrapper around StorageService.generateId(). Feature
 * services depend on this rather than calling STORAGE_SERVICE directly
 * for ID generation, so the "how" of ID generation (currently: ask the
 * JSON file-server for the next counter value) stays fully encapsulated
 * here and never leaks into feature services.
 */
@Injectable({ providedIn: 'root' })
export class IdGeneratorService {
  private readonly storage = inject(STORAGE_SERVICE);

  generateUserId(): Observable<string> {
    return this.storage.generateId('user');
  }

  generateAttendanceDayId(): Observable<string> {
    return this.storage.generateId('attendanceDay');
  }

  generateSessionId(): Observable<string> {
    return this.storage.generateId('session');
  }

  generateHolidayId(): Observable<string> {
    return this.storage.generateId('holiday');
  }
}