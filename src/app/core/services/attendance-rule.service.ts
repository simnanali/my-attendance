import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';

import { STORAGE_SERVICE } from './storage/storage.service';
import { AttendanceRules } from '../models/attendance-rule.model';
import { validateAttendanceRules } from '../utils/validators';

/**
 * Runs validateAttendanceRules() BEFORE ever calling storage — the
 * Node/Express server's own re-check (Step 3) is a second line of
 * defense, not the primary one; this service is where the business
 * rule actually lives, consistent with keeping the server limited to
 * file I/O plus narrow defensive primitives.
 */
@Injectable({ providedIn: 'root' })
export class AttendanceRuleService {
    private readonly storage = inject(STORAGE_SERVICE);

    getRules(): Observable<AttendanceRules> {
        return this.storage.getAttendanceRules();
    }

    saveRules(rules: AttendanceRules): Observable<void> {
        const validationError = validateAttendanceRules(rules);
        if (validationError) {
            return throwError(() => new Error(validationError));
        }
        return this.storage.saveAttendanceRules(rules);
    }
}