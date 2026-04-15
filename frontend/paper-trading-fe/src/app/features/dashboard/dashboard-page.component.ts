import { Component, computed, inject, signal, DestroyRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../core/auth.service';
import { PortfolioService } from '../../core/portfolio.service';
import { Position, CoinPrice } from '../../core/models';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.css'
})
export class DashboardPageComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly portfolioService = inject(PortfolioService);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  readonly currentUser = computed(() => this.authService.currentUser());
  readonly positions = signal<Position[]>([]);
  readonly prices = signal<CoinPrice[]>([]);
  readonly isLoading = signal(true);
  readonly isReloading = signal(false);
  readonly pageError = signal('');
  readonly sparklines = signal<Record<string, string>>({});

  private pollInterval: any;

  readonly COINS = [
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
    { id: 'solana', symbol: 'SOL', name: 'Solana' },
    { id: 'binancecoin', symbol: 'BNB', name: 'BNB' },
    { id: 'cardano', symbol: 'ADA', name: 'Cardano' },
    { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin' },
    { id: 'ripple', symbol: 'XRP', name: 'XRP' },
    { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche' },
  ];

  ngOnInit(): void {
    this.loadDashboard();
    this.fetchPrices();
    this.pollInterval = setInterval(() => this.fetchPrices(), 15000);
    this.destroyRef.onDestroy(() => {
      if (this.pollInterval) clearInterval(this.pollInterval);
    });
  }

  ngOnDestroy(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
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
        this.loadSparklines(portfolio.data.positions);
      },
      error: (err) => this.pageError.set(err.error?.message ?? 'Failed to load dashboard.')
    });
  }

  reloadBalance(): void {
    this.isReloading.set(true);
    forkJoin({
      me: this.authService.fetchMe(),
      portfolio: this.portfolioService.getPortfolio()
    }).pipe(finalize(() => this.isReloading.set(false))).subscribe({
      next: ({ me, portfolio }) => {
        this.authService.setCurrentUser(me.data.user);
        this.positions.set(portfolio.data.positions);
      },
      error: (err) => this.pageError.set(err.error?.message ?? 'Failed to reload.')
    });
  }

  fetchPrices(): void {
    const ids = this.COINS.map(c => c.id).join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
    this.http.get<any>(url).subscribe({
      next: (data) => {
        const prices: CoinPrice[] = this.COINS.map(coin => ({
          id: coin.id, symbol: coin.symbol, name: coin.name,
          price: data[coin.id]?.usd ?? 0,
          change24h: data[coin.id]?.usd_24h_change ?? 0,
        }));
        this.prices.set(prices);
      }
    });
  }

  loadSparklines(positions: Position[]): void {
    positions.forEach(pos => {
      const url = `https://api.coingecko.com/api/v3/coins/${pos.coinId}/market_chart?vs_currency=usd&days=7&interval=daily`;
      this.http.get<any>(url).subscribe({
        next: (data) => {
          const raw: [number, number][] = data.prices ?? [];
          const pts = raw.map(p => p[1]);
          if (pts.length < 2) return;
          const min = Math.min(...pts);
          const max = Math.max(...pts);
          const w = 120, h = 40;
          const points = pts.map((p, i) => {
            const x = (i / (pts.length - 1)) * w;
            const y = h - ((p - min) / (max - min || 1)) * h;
            return `${x},${y}`;
          }).join(' ');
          this.sparklines.update(s => ({ ...s, [pos.coinId]: points }));
        }
      });
    });
  }

  isSparklinePositive(coinId: string): boolean {
    return true; // simplified
  }

  getCurrentPrice(coinId: string): number {
    return this.prices().find(p => p.id === coinId)?.price ?? 0;
  }

  getChange24h(coinId: string): number {
    return this.prices().find(p => p.id === coinId)?.change24h ?? 0;
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
    return this.positions().reduce((sum, p) => sum + this.getPositionValue(p), 0);
  }

  getTotalPnl(): number {
    return (this.currentUser()?.balance ?? 0) + this.getTotalPortfolioValue() - 10000;
  }

  goToMarket(): void { this.router.navigateByUrl('/market'); }

  removePosition(id: string): void {
    this.portfolioService.deletePosition(id).subscribe({
      next: () => this.positions.set(this.positions().filter(p => p._id !== id)),
      error: (err) => this.pageError.set(err.error?.message ?? 'Failed to remove position.')
    });
  }
}
