import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { NotificationService } from '../../../core/services/notification.service';

/**
 * Header UI only. Current-user display comes from AuthService.currentUser$
 * (same source Profile uses, Section 25); logout DELEGATES to
 * AuthService.logout() rather than reimplementing session clearing
 * (Section 6/31) — this component only orchestrates the notification
 * and navigation that follow.
 */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly themeServiceRef = inject(ThemeService);

  /** Reflects whether the mobile sidebar is currently open, for aria-expanded on the hamburger button. */
  @Input() sidebarOpenInput = false;
  @Output() menuToggle = new EventEmitter<void>();

  readonly currentUser = toSignal(this.authService.currentUser$, { initialValue: null });
  readonly theme = this.themeServiceRef.theme;

  sidebarOpen(): boolean {
    return this.sidebarOpenInput;
  }

  onHamburgerClick(): void {
    this.menuToggle.emit();
  }

  onThemeToggle(): void {
    this.themeServiceRef.toggleTheme();
  }

  onLogout(): void {
    this.authService.logout();
    this.notificationService.success('Logged out successfully.');
    this.router.navigate(['/login']);
  }
}
