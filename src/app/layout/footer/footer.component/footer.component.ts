import { Component } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-footer',
  styleUrl: './footer.component.scss',
  templateUrl: './footer.component.html',
})

export class FooterComponent {
  readonly currentYear = new Date().getFullYear();
  readonly appVersion = '1.0.0';
}
