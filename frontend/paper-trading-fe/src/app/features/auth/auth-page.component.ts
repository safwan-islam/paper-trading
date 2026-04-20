import { Component } from '@angular/core';
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
  isLogin: boolean = true;
  isLoading: boolean = false;
  errorMessage: string = '';
  name: string = '';
  email: string = '';
  password: string = '';

  constructor(
    private readonly authService: AuthService,
    private readonly realtimeService: RealtimeService,
    private readonly router: Router
  ) {}

  toggleMode(): void {
    this.isLogin = !this.isLogin;
    this.errorMessage = '';
  }

  submit(): void {
    this.errorMessage = '';
    this.isLoading = true;

    const request$ = this.isLogin
      ? this.authService.login(this.email, this.password)
      : this.authService.register(this.name, this.email, this.password);

    request$.subscribe({
      next: (response) => {
        this.authService.setToken(response.data.token);
        this.authService.setCurrentUser(response.data.user);
        this.realtimeService.connect(response.data.user.id);
        this.router.navigateByUrl('/dashboard');
      },
      error: (error) => {
        this.errorMessage = error.error?.message ?? 'Something went wrong.';
        this.isLoading = false;
      }
    });
  }
}
