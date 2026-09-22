import { ApplicationConfig, provideZoneChangeDetection, provideAppInitializer, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { routes } from './app.routes';
import { STORAGE_SERVICE } from './core/services/storage/storage.service';
import { JsonFileStorageService } from './core/services/storage/json-file-storage.service';
import { ThemeService } from './core/services/theme.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
    { provide: STORAGE_SERVICE, useClass: JsonFileStorageService },
    // Applies the persisted theme BEFORE the app renders, avoiding a
    // light-then-dark flash on startup.
    provideAppInitializer(() => firstValueFrom(inject(ThemeService).init())),
  ],
};
