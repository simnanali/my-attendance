/**
 * Handles registration, login, logout, and current-user session state.
 * Full implementation is added in Phase 3 — Registration and Login.
 */

import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { STORAGE_SERVICE } from './storage/storage.service';
import { PasswordHasherService } from './password-hasher.service';
import { IdGeneratorService } from './id-generator.service';
import { DateTimeService } from './date-time.service';
import { User } from '../models/user.model';
import {
    AuthenticatedUser,
    LoginCredentials,
    RegisterPayload,
} from '../models/auth.model';

const AUTH_SESSION_KEY = 'ams_auth_session';

/**
 * Handles registration, login, logout, and exposes the current
 * authenticated user to the rest of the application.
 *
 * NOTE on localStorage usage here: this stores only the current CLIENT
 * SESSION (which user, if any, is logged in right now) — it is NOT a
 * replacement for the approved JSON-file persistence architecture. All
 * actual user/attendance DATA still lives in data/*.json via the
 * Node/Express file-server (StorageService). Keeping a session marker
 * client-side is standard practice (comparable to how a JWT is kept in
 * browser storage) and is unrelated to the "don't silently swap JSON
 * files for localStorage" rule, which concerns business data.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly storage = inject(STORAGE_SERVICE);
    private readonly passwordHasher = inject(PasswordHasherService);
    private readonly idGenerator = inject(IdGeneratorService);
    private readonly dateTime = inject(DateTimeService);

    private readonly currentUserSubject = new BehaviorSubject<AuthenticatedUser | null>(
        this.restoreSession()
    );

    /** Emits the currently authenticated user, or null when logged out. */
    readonly currentUser$ = this.currentUserSubject.asObservable();

    /** Synchronous check used by AuthGuard. */
    isAuthenticated(): boolean {
        return this.currentUserSubject.value !== null;
    }

    /** Synchronous access to the current user's id, for scoping attendance queries in later phases. */
    getCurrentUserId(): string | null {
        return this.currentUserSubject.value?.id ?? null;
    }

    register(payload: RegisterPayload): Observable<void> {
        if (payload.password !== payload.confirmPassword) {
            return throwError(() => new Error('Password and Confirm Password do not match.'));
        }

        return this.storage.getUsers().pipe(
            switchMap((users) => {
                const usernameTaken = users.some(
                    (u) => u.username.toLowerCase() === payload.username.toLowerCase()
                );
                if (usernameTaken) {
                    return throwError(() => new Error('This username is already taken.'));
                }

                const emailTaken = users.some(
                    (u) => u.email.toLowerCase() === payload.email.toLowerCase()
                );
                if (emailTaken) {
                    return throwError(() => new Error('An account with this email already exists.'));
                }

                return this.idGenerator.generateUserId().pipe(
                    switchMap((userId) =>
                        this.passwordHasher.hash(payload.password).pipe(
                            switchMap((passwordHash) => {
                                const newUser: User = {
                                    id: userId,
                                    fullName: payload.fullName,
                                    email: payload.email,
                                    username: payload.username,
                                    passwordHash,
                                    createdAt: this.dateTime.getCurrentDateTimeIso(),
                                };
                                return this.storage.saveUsers([...users, newUser]);
                            })
                        )
                    )
                );
            }),
            catchError((err) =>
                throwError(() => new Error(err?.message ?? 'Registration failed. Please try again.'))
            )
        );
    }

    login(credentials: LoginCredentials): Observable<void> {
        return this.storage.getUsers().pipe(
            switchMap((users) => {
                const matchedUser = users.find(
                    (u) => u.username.toLowerCase() === credentials.username.toLowerCase()
                );

                if (!matchedUser) {
                    return throwError(() => new Error('Invalid username or password.'));
                }

                return this.passwordHasher.verify(credentials.password, matchedUser.passwordHash).pipe(
                    switchMap((isValid) => {
                        if (!isValid) {
                            return throwError(() => new Error('Invalid username or password.'));
                        }
                        const authenticatedUser: AuthenticatedUser = {
                            id: matchedUser.id,
                            fullName: matchedUser.fullName,
                            email: matchedUser.email,
                            username: matchedUser.username,
                            createdAt: matchedUser.createdAt,
                        };
                        this.setSession(authenticatedUser);
                        return of(void 0);
                    })
                );
            }),
            catchError((err) =>
                throwError(() => new Error(err?.message ?? 'Login failed. Please try again.'))
            )
        );
    }

    logout(): void {
        this.currentUserSubject.next(null);
        localStorage.removeItem(AUTH_SESSION_KEY);
    }

    private setSession(user: AuthenticatedUser): void {
        this.currentUserSubject.next(user);
        localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user));
    }

    private restoreSession(): AuthenticatedUser | null {
        const raw = localStorage.getItem(AUTH_SESSION_KEY);
        if (!raw) {
            return null;
        }
        try {
            return JSON.parse(raw) as AuthenticatedUser;
        } catch {
            localStorage.removeItem(AUTH_SESSION_KEY);
            return null;
        }
    }
}