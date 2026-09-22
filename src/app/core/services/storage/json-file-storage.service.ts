import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { StorageService } from './storage.service';
import { User, UsersFile } from '../../models/user.model';
import {
    AttendanceDay,
    MonthlyAttendanceFile,
} from '../../models/attendance.model';
import { AppSettings } from '../../models/settings.model';
import { EntityIdType } from '../../models/counters.model';
import { Holiday, HolidaysFile } from '../../models/holiday.model';
import { WeekoffDay, WeekoffsFile } from '../../models/weekoff.model';
import { AttendanceRules, AttendanceRulesFile } from '../../models/attendance-rule.model';
import { API_BASE_URL } from '../../utils/api-config';

/**
 * Concrete StorageService implementation backed by the Node/Express
 * JSON file-server (see /server at the project root). This is the
 * approved V1 persistence mechanism — real files under /data, not
 * localStorage. This class contains NO business logic: it only shapes
 * HTTP requests/responses to match the StorageService contract.
 */
@Injectable({ providedIn: 'root' })
export class JsonFileStorageService implements StorageService {
    private readonly http = inject(HttpClient);

    getUsers(): Observable<User[]> {
        return this.http
            .get<UsersFile>(`${API_BASE_URL}/users`)
            .pipe(map((file) => file.users));
    }

    saveUsers(users: User[]): Observable<void> {
        return this.http.put<void>(`${API_BASE_URL}/users`, { users });
    }

    getAttendance(year: number, month: number): Observable<AttendanceDay[]> {
        const paddedMonth = String(month).padStart(2, '0');
        return this.http
            .get<MonthlyAttendanceFile>(
                `${API_BASE_URL}/attendance/${year}/${paddedMonth}`
            )
            .pipe(map((file) => file.attendance));
    }

    saveAttendance(
        year: number,
        month: number,
        attendance: AttendanceDay[]
    ): Observable<void> {
        const paddedMonth = String(month).padStart(2, '0');
        return this.http.put<void>(
            `${API_BASE_URL}/attendance/${year}/${paddedMonth}`,
            { attendance }
        );
    }

    getSettings(): Observable<AppSettings> {
        return this.http.get<AppSettings>(`${API_BASE_URL}/settings`);
    }

    saveSettings(settings: AppSettings): Observable<void> {
        return this.http.put<void>(`${API_BASE_URL}/settings`, settings);
    }

    getHolidays(): Observable<Holiday[]> {
        return this.http
            .get<HolidaysFile>(`${API_BASE_URL}/holidays`)
            .pipe(map((file) => file.holidays));
    }

    saveHolidays(holidays: Holiday[]): Observable<void> {
        return this.http.put<void>(`${API_BASE_URL}/holidays`, { holidays });
    }

    getWeekoffs(): Observable<WeekoffDay[]> {
        return this.http
            .get<WeekoffsFile>(`${API_BASE_URL}/weekoffs`)
            .pipe(map((file) => file.weekoffs));
    }

    saveWeekoffs(weekoffs: WeekoffDay[]): Observable<void> {
        return this.http.put<void>(`${API_BASE_URL}/weekoffs`, { weekoffs });
    }

    getAttendanceRules(): Observable<AttendanceRules> {
        return this.http
            .get<AttendanceRulesFile>(`${API_BASE_URL}/attendance-rules`)
            .pipe(map((file) => file.attendanceRules));
    }

    saveAttendanceRules(rules: AttendanceRules): Observable<void> {
        return this.http.put<void>(`${API_BASE_URL}/attendance-rules`, rules);
    }

    generateId(type: EntityIdType): Observable<string> {
        return this.http
            .post<{ id: string }>(`${API_BASE_URL}/ids/next`, { type })
            .pipe(map((res) => res.id));
    }
}