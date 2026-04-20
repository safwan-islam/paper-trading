import { Component, OnInit } from '@angular/core';
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
export class AppComponent implements OnInit {
  liveTrade: string = '';

  get currentUser() { return this.authService.currentUser; }

  get notification(): string {
    return this.realtimeService.lastTradeNotification ||
           this.realtimeService.lastFundsAdded ||
           this.realtimeService.lastPriceAlert;
  }

  get notificationClass(): string {
    if (this.realtimeService.lastPriceAlert) return 'toast-notification toast-alert';
    if (this.realtimeService.lastFundsAdded) return 'toast-notification toast-funds';
    return 'toast-notification toast-trade';
  }

  constructor(
    private readonly authService: AuthService,
    private readonly realtimeService: RealtimeService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    const user = this.authService.currentUser;
    if (user) this.realtimeService.connect(user.id);

    // WebSocket: show global trade broadcast at bottom
    this.realtimeService.onTradeBroadcastCallback((data) => {
      this.liveTrade = data.message;
      setTimeout(() => { this.liveTrade = ''; }, 4000);
    });
  }

  logout(): void {
    this.realtimeService.disconnect();
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }
}
