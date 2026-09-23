import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from '../../src/app/shared/components/toast/toast.component/toast.component'
import { PageTitleService } from './core/services/page-title.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})

export class App {
  protected readonly title = signal('attendance-management');

  constructor(private pageTitleService: PageTitleService) {}
}
