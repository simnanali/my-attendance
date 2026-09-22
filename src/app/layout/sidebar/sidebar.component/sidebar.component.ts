import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

/**
 * Navigation UI only. Logout DELEGATES to AuthService.logout() — no
 * authentication logic lives here (Section 7/31).
 */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  @Input() isOpen = false;
  @Output() closeSidebar = new EventEmitter<void>();

  readonly navItems: NavItem[] = [
    { label: 'Dashboard', icon: '🏠', route: '/dashboard' },
    { label: 'My Attendance', icon: '🕐', route: '/attendance' },
    { label: 'Daily Report', icon: '📅', route: '/daily-report' },
    { label: 'Monthly Report', icon: '📊', route: '/monthly-report' },
    { label: 'My Profile', icon: '👤', route: '/profile' },
  ];

  isRouteActive(route: string): boolean {
    return this.router.url === route || this.router.url.startsWith(route + '/');
  }

  onNavClick(): void {
    this.closeSidebar.emit();
  }

  onBackdropClick(): void {
    this.closeSidebar.emit();
  }

  onLogout(): void {
    this.authService.logout();
    this.notificationService.success('Logged out successfully.');
    this.closeSidebar.emit();
    this.router.navigate(['/login']);
  }
}
