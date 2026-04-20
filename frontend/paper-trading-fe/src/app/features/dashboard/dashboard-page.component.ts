import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../core/auth.service';
import { PortfolioService } from '../../core/portfolio.service';
import { TradeService } from '../../core/trade.service';
import { RealtimeService } from '../../core/realtime.service';
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
  confirmPosition: Position | null = null;
  isClosing: boolean = false;
  realizedPnl: number = 0;

  get currentUser() { return this.authService.currentUser; }
  get onlineCount() { return this.realtimeService.onlineCount; }

  constructor(
    private readonly authService: AuthService,
    private readonly portfolioService: PortfolioService,
    private readonly tradeService: TradeService,
    private readonly realtimeService: RealtimeService,
    private readonly router: Router,
    private readonly http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
    this.loadRealizedPnl();

    this.realtimeService.onPriceUpdateCallback((prices) => {
      if (prices?.length > 0 && prices[0].price > 0) {
        this.prices = prices;
      }
    });

    this.realtimeService.onPortfolioUpdatedCallback((data) => {
      this.authService.updateBalance(data.balance);
      this.loadDashboard();
      this.loadRealizedPnl();
    });
  }

  ngOnDestroy(): void {}

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
      error: (err) => { this.pageError = err.error?.message ?? 'Failed to load.'; }
    });
  }

  loadRealizedPnl(): void {
    this.tradeService.getTrades().subscribe({
      next: (response) => {
        const trades = response.data.trades;
        let pnl = 0;
        trades.forEach((trade: any) => {
          if (trade.type === 'sell') {
            pnl += trade.total;
          } else {
            pnl -= trade.total;
          }
        });
        this.realizedPnl = parseFloat(pnl.toFixed(2));
      }
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

  loadSparklines(positions: Position[]): void {
    positions.forEach(pos => {
      this.http.get<any>(`${environment.apiUrl}/chart/${pos.coinId}?days=7`).subscribe({
        next: (response) => {
          const candles = response.data.candles ?? [];
          if (candles.length < 2) return;
          const pts = candles.map((c: any) => c.close);
          const min = Math.min(...pts), max = Math.max(...pts);
          const points = pts.map((p: number, i: number) => {
            const x = (i / (pts.length - 1)) * 80;
            const y = 32 - ((p - min) / (max - min || 1)) * 32;
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
    return cost === 0 ? 0 : (this.getPositionPnl(pos) / cost) * 100;
  }

  getTotalPortfolioValue(): number {
    return this.positions.reduce((sum, p) => sum + this.getPositionValue(p), 0);
  }

  getTotalPnl(): number {
    return this.positions.reduce((sum, p) => sum + this.getPositionPnl(p), 0);
  }

  openCloseModal(pos: Position): void {
    this.confirmPosition = pos;
  }

  cancelClose(): void {
    this.confirmPosition = null;
  }

  closePosition(): void {
    const pos = this.confirmPosition;
    if (!pos) return;
    const price = this.getCurrentPrice(pos.coinId);
    if (price === 0) {
      this.pageError = 'Price not available. Try again.';
      this.confirmPosition = null;
      return;
    }
    this.isClosing = true;
    this.tradeService.executeTrade({
      coinId: pos.coinId, symbol: pos.symbol, name: pos.name,
      type: 'sell', quantity: pos.quantity, price
    }).subscribe({
      next: (response) => {
        this.authService.updateBalance(response.data.newBalance);
        this.positions = this.positions.filter(p => p._id !== pos._id);
        this.confirmPosition = null;
        this.isClosing = false;
        this.loadRealizedPnl();
      },
      error: (err) => {
        this.pageError = err.error?.message ?? 'Failed to close position.';
        this.confirmPosition = null;
        this.isClosing = false;
      }
    });
  }

  goToMarket(): void { this.router.navigateByUrl('/market'); }
}