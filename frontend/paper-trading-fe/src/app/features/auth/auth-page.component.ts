import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { RealtimeService } from '../../core/realtime.service';

@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth-page.component.html',
  styleUrl: './auth-page.component.css'
})
export class AuthPageComponent {
  private readonly authService = inject(AuthService);
  private readonly realtimeService = inject(RealtimeService);
  private readonly router = inject(Router);

  readonly isLogin = signal(true);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  name = ''; email = ''; password = '';

  toggleMode(): void {
    this.isLogin.set(!this.isLogin());
    this.errorMessage.set('');
  }

  submit(): void {
    this.errorMessage.set('');
    this.isLoading.set(true);
    const request$ = this.isLogin()
      ? this.authService.login(this.email, this.password)
      : this.authService.register(this.name, this.email, this.password);

    request$.subscribe({
      next: (response) => {
        const data = response.data ?? response;
        this.authService.setToken(data.token);
        this.authService.setCurrentUser(data.user);
        this.realtimeService.connect(data.user.id);
        this.router.navigateByUrl('/dashboard');
      },
      error: (error) => {
        this.errorMessage.set(error.error?.message ?? 'Something went wrong.');
        this.isLoading.set(false);
      }
    });
  }
}
