import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';

import { STORAGE_SERVICE } from './storage/storage.service';
import { ThemeMode } from '../models/settings.model';

const THEME_ATTRIBUTE = 'data-theme';
const DEFAULT_THEME: ThemeMode = 'light';

/**
 * Owns light/dark theme state: applying it to the document, persisting
 * it, and initializing it on startup. Persists via the EXISTING
 * StorageService (data/settings.json through the Node/Express helper)
 * rather than localStorage — this is the same JSON-file architecture
 * already approved for users/attendance, applied to the one remaining
 * piece of app state (Section 3/35).
 */
@Injectable({ providedIn: 'root' })

export class ThemeService {
    private readonly storage = inject(STORAGE_SERVICE);

    private readonly themeSignal = signal<ThemeMode>(DEFAULT_THEME);
    readonly theme = this.themeSignal.asReadonly();

    /**
     * Loads the persisted theme and applies it. Run via provideAppInitializer
     * (see app.config.ts) so the correct theme is set BEFORE the app
     * renders, avoiding a light-then-dark flash on startup.
     */
    init(): Observable<void> {
        return this.storage.getSettings().pipe(
            tap((settings) => this.applyTheme(settings.theme)),
            map(() => void 0),
            catchError(() => {
                this.applyTheme(DEFAULT_THEME);
                return of(void 0);
            })
        );
    }

    toggleTheme(): void {
        const nextTheme: ThemeMode = this.themeSignal() === 'light' ? 'dark' : 'light';
        this.applyTheme(nextTheme);
        this.storage.saveSettings({ theme: nextTheme }).subscribe();
    }

    private applyTheme(theme: ThemeMode): void {
        this.themeSignal.set(theme);
        document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);
    }
}
