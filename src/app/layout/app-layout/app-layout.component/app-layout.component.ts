import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { HeaderComponent } from '../../header/header.component/header.component';
import { SidebarComponent } from '../../sidebar/sidebar.component/sidebar.component';
import { FooterComponent } from '../../footer/footer.component/footer.component';

/**
 * Combines header/sidebar/routed content/footer, and coordinates only
 * the responsive sidebar open/close state. Contains no attendance or
 * authentication business logic (Section 31).
 */
@Component({
  imports: [RouterOutlet, HeaderComponent, SidebarComponent, FooterComponent],
  selector: 'app-app-layout',
  styleUrl: './app-layout.component.scss',
  templateUrl: './app-layout.component.html',
})

export class AppLayoutComponent {
  readonly isSidebarOpen = signal(false);

  toggleSidebar(): void {
    this.isSidebarOpen.update((open) => !open);
  }

  closeSidebar(): void {
    this.isSidebarOpen.set(false);
  }
}
