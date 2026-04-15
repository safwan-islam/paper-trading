import { Component, computed, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/auth.service';
import { TradeService } from '../../core/trade.service';
import { CoinPrice } from '../../core/models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-market-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './market-page.component.html',
  styleUrl: './market-page.component.css'
})
export class MarketPageComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly tradeService = inject(TradeService);
  private readonly http = inject(HttpClient);

  readonly currentUser = computed(() => this.authService.currentUser());
  readonly localPrices = signal<CoinPrice[]>([]);
  readonly selectedCoin = signal<CoinPrice | null>(null);
  readonly tradeType = signal<'buy' | 'sell'>('buy');
  readonly quantity = signal(0);
  readonly isSubmitting = signal(false);
  readonly tradeError = signal('');
  readonly tradeSuccess = signal('');
  readonly isLoadingPrices = signal(true);
  readonly chartPoints = signal<string>('');
  readonly chartLabels = signal<string[]>([]);
  readonly chartMin = signal(0);
  readonly chartMax = signal(0);
  readonly isLoadingChart = signal(false);
  readonly chartPrices = signal<number[]>([]);

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
    this.fetchPrices();
    this.pollInterval = setInterval(() => this.fetchPrices(), 15000);
  }

  ngOnDestroy(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
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
        this.localPrices.set(prices);
        this.isLoadingPrices.set(false);
      },
      error: () => this.isLoadingPrices.set(false)
    });
  }

  fetchChart(coinId: string): void {
    this.isLoadingChart.set(true);
    this.chartPoints.set('');
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=7&interval=daily`;
    this.http.get<any>(url).subscribe({
      next: (data) => {
        const raw: [number, number][] = data.prices ?? [];
        const prices = raw.map(p => p[1]);
        const labels = raw.map(p => new Date(p[0]).toLocaleDateString('en', { month: 'short', day: 'numeric' }));
        this.chartPrices.set(prices);
        this.chartLabels.set(labels);
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        this.chartMin.set(min);
        this.chartMax.set(max);
        const w = 500, h = 160, pad = 10;
        const points = prices.map((p, i) => {
          const x = pad + (i / (prices.length - 1)) * (w - pad * 2);
          const y = h - pad - ((p - min) / (max - min || 1)) * (h - pad * 2);
          return `${x},${y}`;
        }).join(' ');
        this.chartPoints.set(points);
        this.isLoadingChart.set(false);
      },
      error: () => this.isLoadingChart.set(false)
    });
  }

  openTrade(coin: CoinPrice, type: 'buy' | 'sell'): void {
    this.selectedCoin.set(coin);
    this.tradeType.set(type);
    this.quantity.set(0);
    this.tradeError.set('');
    this.tradeSuccess.set('');
    this.fetchChart(coin.id);
  }

  closeTrade(): void { this.selectedCoin.set(null); }

  getTotal(): number {
    const coin = this.selectedCoin();
    if (!coin) return 0;
    return parseFloat((this.quantity() * coin.price).toFixed(2));
  }

  isChartPositive(): boolean {
    const p = this.chartPrices();
    if (p.length < 2) return true;
    return p[p.length - 1] >= p[0];
  }

  submitTrade(): void {
    const coin = this.selectedCoin();
    if (!coin || this.quantity() <= 0) {
      this.tradeError.set('Please enter a valid quantity.');
      return;
    }
    this.tradeError.set('');
    this.isSubmitting.set(true);
    this.tradeService.executeTrade({
      coinId: coin.id, symbol: coin.symbol, name: coin.name,
      type: this.tradeType(), quantity: this.quantity(), price: coin.price
    }).subscribe({
      next: (response) => {
        this.authService.updateBalance(response.data.newBalance);
        this.tradeSuccess.set(`${this.tradeType() === 'buy' ? 'Bought' : 'Sold'} ${this.quantity()} ${coin.symbol}!`);
        this.isSubmitting.set(false);
        setTimeout(() => this.closeTrade(), 1500);
      },
      error: (err) => {
        this.tradeError.set(err.error?.message ?? 'Trade failed.');
        this.isSubmitting.set(false);
      }
    });
  }
}
