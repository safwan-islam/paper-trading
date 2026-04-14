import { Component, computed, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../core/auth.service';
import { PortfolioService } from '../../core/portfolio.service';
import { RealtimeService } from '../../core/realtime.service';
import { Position } from '../../core/models';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.css'
})
export class DashboardPageComponent {
  private readonly authService = inject(AuthService);
  private readonly portfolioService = inject(PortfolioService);
  private readonly realtimeService = inject(RealtimeService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly currentUser = computed(() => this.authService.currentUser());
  readonly prices = computed(() => this.realtimeService.prices());
  readonly positions = signal<Position[]>([]);
  readonly isLoading = signal(true);
  readonly pageError = signal('');

  constructor() {
    this.loadDashboard();
    this.destroyRef.onDestroy(() => {});
  }

  loadDashboard(): void {
    this.isLoading.set(true);
    forkJoin({
      me: this.authService.fetchMe(),
      portfolio: this.portfolioService.getPortfolio()
    }).pipe(finalize(() => this.isLoading.set(false))).subscribe({
      next: ({ me, portfolio }) => {
        this.authService.setCurrentUser(me.data.user);
        this.positions.set(portfolio.data.positions);
      },
      error: (err) => this.pageError.set(err.error?.message ?? 'Failed to load dashboard.')
    });
  }

  getCurrentPrice(coinId: string): number {
    return this.prices().find(p => p.id === coinId)?.price ?? 0;
  }

  getPositionValue(pos: Position): number {
    return this.getCurrentPrice(pos.coinId) * pos.quantity;
  }

  getPositionPnl(pos: Position): number {
    return this.getPositionValue(pos) - (pos.avgBuyPrice * pos.quantity);
  }

  getTotalPortfolioValue(): number {
    return this.positions().reduce((sum, p) => sum + this.getPositionValue(p), 0);
  }

  getTotalPnl(): number {
    const cash = this.currentUser()?.balance ?? 0;
    return cash + this.getTotalPortfolioValue() - 10000;
  }

  goToMarket(): void {
    this.router.navigateByUrl('/market');
  }

  removePosition(id: string): void {
    this.portfolioService.deletePosition(id).subscribe({
      next: () => this.positions.set(this.positions().filter(p => p._id !== id)),
      error: (err) => this.pageError.set(err.error?.message ?? 'Failed to remove position.')
    });
  }
}
