import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { API_BASE_URL } from '../utils/api-config';

/**
 * Delegates password hashing/verification to the Node/Express helper
 * server, which uses bcryptjs (real salted hashing). This is a
 * deliberate, approved exception to Phase 2's "server does file I/O
 * only" framing: hashing is a cryptographic primitive, not attendance
 * business logic, and performing it server-side (rather than in the
 * browser) is what makes it genuine security rather than obfuscation.
 * A future .NET migration replaces this with BCrypt.Net server-side —
 * no Angular changes required beyond swapping the StorageService/HTTP
 * target.
 */
@Injectable({ providedIn: 'root' })
export class PasswordHasherService {
    private readonly http = inject(HttpClient);

    hash(plainPassword: string): Observable<string> {
        return this.http
            .post<{ hash: string }>(`${API_BASE_URL}/auth/hash`, { password: plainPassword })
            .pipe(map((res) => res.hash));
    }

    verify(plainPassword: string, hash: string): Observable<boolean> {
        return this.http
            .post<{ valid: boolean }>(`${API_BASE_URL}/auth/verify`, { password: plainPassword, hash })
            .pipe(map((res) => res.valid));
    }
}