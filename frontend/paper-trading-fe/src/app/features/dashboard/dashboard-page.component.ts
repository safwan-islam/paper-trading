import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../core/auth.service';
import { PortfolioService } from '../../core/portfolio.service';
import { Position, CoinPrice } from '../../core/models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.css'
})
export class DashboardPageComponent implements OnInit, OnDestroy {
  positions: Position[] = [];
  prices: CoinPrice[] = [];
  sparklines: Record<string, string> = {};
  isLoading: boolean = true;
  isReloading: boolean = false;
  pageError: string = '';

  private pricesInterval: any;

  get currentUser() {
    return this.authService.currentUser();
  }

  constructor(
    private readonly authService: AuthService,
    private readonly portfolioService: PortfolioService,
    private readonly router: Router,
    private readonly http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
    this.fetchPrices();
    this.pricesInterval = setInterval(() => this.fetchPrices(), 10000);
  }

  ngOnDestroy(): void {
    if (this.pricesInterval) clearInterval(this.pricesInterval);
  }

  loadDashboard(): void {
    this.isLoading = true;
    forkJoin({
      me: this.authService.fetchMe(),
      portfolio: this.portfolioService.getPortfolio()
    }).pipe(finalize(() => { this.isLoading = false; })).subscribe({
      next: ({ me, portfolio }) => {
        this.authService.setCurrentUser(me.data.user);
        this.positions = portfolio.data.positions;
        this.loadSparklines(portfolio.data.positions);
      },
      error: (err) => { this.pageError = err.error?.message ?? 'Failed to load dashboard.'; }
    });
  }

  reloadBalance(): void {
    this.isReloading = true;
    forkJoin({
      me: this.authService.fetchMe(),
      portfolio: this.portfolioService.getPortfolio()
    }).pipe(finalize(() => { this.isReloading = false; })).subscribe({
      next: ({ me, portfolio }) => {
        this.authService.setCurrentUser(me.data.user);
        this.positions = portfolio.data.positions;
      },
      error: (err) => { this.pageError = err.error?.message ?? 'Failed to reload.'; }
    });
  }

  fetchPrices(): void {
    this.http.get<any>(`${environment.apiUrl}/prices`).subscribe({
      next: (response) => {
        const prices: CoinPrice[] = response.data.prices;
        if (prices && prices.length > 0 && prices[0].price > 0) {
          this.prices = prices;
        }
      }
    });
  }

  loadSparklines(positions: Position[]): void {
    positions.forEach(pos => {
      this.http.get<any>(`${environment.apiUrl}/chart/${pos.coinId}?days=7`).subscribe({
        next: (response) => {
          const candles = response.data.candles ?? [];
          if (candles.length < 2) return;
          const pts = candles.map((c: any) => c.close);
          const min = Math.min(...pts);
          const max = Math.max(...pts);
          const w = 120, h = 40;
          const points = pts.map((p: number, i: number) => {
            const x = (i / (pts.length - 1)) * w;
            const y = h - ((p - min) / (max - min || 1)) * h;
            return `${x},${y}`;
          }).join(' ');
          this.sparklines[pos.coinId] = points;
        }
      });
    });
  }

  getCurrentPrice(coinId: string): number {
    return this.prices.find(p => p.id === coinId)?.price ?? 0;
  }

  getChange24h(coinId: string): number {
    return this.prices.find(p => p.id === coinId)?.change24h ?? 0;
  }

  getPositionValue(pos: Position): number {
    return this.getCurrentPrice(pos.coinId) * pos.quantity;
  }

  getPositionPnl(pos: Position): number {
    return this.getPositionValue(pos) - (pos.avgBuyPrice * pos.quantity);
  }

  getPositionPnlPct(pos: Position): number {
    const cost = pos.avgBuyPrice * pos.quantity;
    if (cost === 0) return 0;
    return (this.getPositionPnl(pos) / cost) * 100;
  }

  getTotalPortfolioValue(): number {
    return this.positions.reduce((sum, p) => sum + this.getPositionValue(p), 0);
  }

  getTotalPnl(): number {
    return (this.currentUser?.balance ?? 0) + this.getTotalPortfolioValue() - 10000;
  }

  goToMarket(): void {
    this.router.navigateByUrl('/market');
  }

  removePosition(id: string): void {
    this.portfolioService.deletePosition(id).subscribe({
      next: () => { this.positions = this.positions.filter(p => p._id !== id); },
      error: (err) => { this.pageError = err.error?.message ?? 'Failed to remove position.'; }
    });
  }
}