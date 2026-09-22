import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';

import { AuthService } from '../../../core/services/auth.service';
import { DateTimeService } from '../../../core/services/date-time.service';

/**
 * Displays the currently authenticated user's own profile. Reads
 * exclusively from AuthService.currentUser$ — the same source Header
 * uses (Section 25) — never duplicates or independently fetches user
 * data, and AuthenticatedUser never carries passwordHash in the first
 * place (Section 17/39), so there is nothing sensitive to filter here.
 */
@Component({
  imports: [CommonModule],
  selector: 'app-profile',
  styleUrl: './profile.component.scss',
  templateUrl: './profile.component.html',
})

export class ProfileComponent {
  private readonly authService = inject(AuthService);
  private readonly dateTimeService = inject(DateTimeService);

  readonly currentUser = toSignal(this.authService.currentUser$, { initialValue: null });

  memberSinceDisplay(createdAt: string): string {
    return this.dateTimeService.formatIsoDateDisplay(createdAt);
  }
}
