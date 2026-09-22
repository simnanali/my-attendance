import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/**
 * Prevents navigation to protected routes when no user is logged in.
 *
 * KNOWN LIMITATION (documented since Phase 0): this is client-side
 * only. It stops normal in-app navigation but cannot prevent someone
 * from bypassing the Angular app entirely and calling the JSON
 * file-server directly. Real, server-enforced authorization arrives
 * with the future .NET Web API migration.
 */
export const authGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.isAuthenticated()) {
        return true;
    }

    return router.createUrlTree(['/login']);
};