import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/auth.service';
import { RealtimeService } from './core/realtime.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  private readonly authService = inject(AuthService);
  private readonly realtimeService = inject(RealtimeService);
  private readonly router = inject(Router);

  readonly currentUser = computed(() => this.authService.currentUser());
  readonly tradeNotification = computed(() => this.realtimeService.lastTradeNotification());

  constructor() {
    const user = this.authService.currentUser();
    if (user) {
      this.realtimeService.connect(user.id);
    }
  }

  logout(): void {
    this.realtimeService.disconnect();
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }
}
