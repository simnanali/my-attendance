import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { passwordsMatchValidator } from '../../../../core/utils/validators';

@Component({
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  selector: 'app-register.component',
  styleUrl: './register.component.scss',
  templateUrl: './register.component.html',
})

export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.group(
    {
      fullName: this.fb.control('', [Validators.required]),
      email: this.fb.control('', [Validators.required, Validators.email]),
      username: this.fb.control('', [Validators.required]),
      password: this.fb.control('', [Validators.required, Validators.minLength(6)]),
      confirmPassword: this.fb.control('', [Validators.required]),
    },
    { validators: passwordsMatchValidator() }
  );

  get fullName() { return this.form.get('fullName'); }
  get email() { return this.form.get('email'); }
  get username() { return this.form.get('username'); }
  get password() { return this.form.get('password'); }
  get confirmPassword() { return this.form.get('confirmPassword'); }

  onSubmit(): void {
    this.errorMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const { fullName, email, username, password, confirmPassword } = this.form.getRawValue();

    this.authService
      .register({
        fullName: fullName!,
        email: email!,
        username: username!,
        password: password!,
        confirmPassword: confirmPassword!,
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.notificationService.success('Registration successful. Please log in.');
          this.router.navigate(['/login']);
        },
        error: (err: Error) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err.message);
          this.notificationService.error(err.message);
        },
      });
  }
}
