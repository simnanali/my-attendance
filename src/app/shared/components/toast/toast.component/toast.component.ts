import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  imports: [CommonModule],
  selector: 'app-toast',
  styleUrl: './toast.component.scss',
  templateUrl: './toast.component.html',
})
export class ToastComponent {
  private readonly notificationService = inject(NotificationService);
  readonly notifications$ = this.notificationService.notifications$;

  dismiss(id: number): void {
    this.notificationService.dismiss(id);
  }
}

