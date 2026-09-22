/**
 * Centralized success/error/info notifications so feature services don't
 * each roll their own toast/alert logic. Full implementation is added
 * alongside the features that first need it, starting Phase 3.
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { AppNotification, NotificationType } from '../models/notification.model';

const AUTO_DISMISS_MS = 4000;

/**
 * Centralized notifications so feature services/components don't each
 * roll their own toast/alert logic. Consumed by ToastComponent
 * (shared/components/toast), mounted once in AppComponent.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
    private readonly notificationsSubject = new BehaviorSubject<AppNotification[]>([]);
    readonly notifications$ = this.notificationsSubject.asObservable();

    private nextId = 1;

    success(message: string): void {
        this.push('success', message);
    }

    error(message: string): void {
        this.push('error', message);
    }

    info(message: string): void {
        this.push('info', message);
    }

    dismiss(id: number): void {
        this.notificationsSubject.next(
            this.notificationsSubject.value.filter((n) => n.id !== id)
        );
    }

    private push(type: NotificationType, message: string): void {
        const notification: AppNotification = { id: this.nextId++, type, message };
        this.notificationsSubject.next([...this.notificationsSubject.value, notification]);
        setTimeout(() => this.dismiss(notification.id), AUTO_DISMISS_MS);
    }
}
