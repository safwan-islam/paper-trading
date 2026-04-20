import {
  Component, OnInit, OnDestroy,
  ElementRef, ViewChild, AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/auth.service';
import { TradeService } from '../../core/trade.service';
import { RealtimeService } from '../../core/realtime.service';
import { CoinPrice } from '../../core/models';
import { createChart, CandlestickSeries, ColorType } from 'lightweight-charts';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-market-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './market-page.component.html',
  styleUrl: './market-page.component.css'
})
export class MarketPageComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('chartContainer') chartContainer!: ElementRef;

  prices: CoinPrice[] = [];
  selectedCoin: CoinPrice | null = null;
  tradeType: 'buy' | 'sell' = 'buy';
  quantity: number = 0;
  isSubmitting: boolean = false;
  tradeError: string = '';
  tradeSuccess: string = '';
  isLoadingPrices: boolean = true;
  isLoadingChart: boolean = false;
  activeTimeframe: string = '7';
  searchQuery: string = '';

  private chart: any = null;
  private candleSeries: any = null;

  readonly TIMEFRAMES = [
    { label: '1D', days: '1' }, { label: '7D', days: '7' },
    { label: '1M', days: '30' }, { label: '3M', days: '90' },
  ];

  get currentUser() { return this.authService.currentUser; }

  get filteredPrices(): CoinPrice[] {
    const q = this.searchQuery.toLowerCase();
    return this.prices.filter(c =>
      c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    );
  }

  constructor(
    private readonly authService: AuthService,
    private readonly tradeService: TradeService,
    private readonly realtimeService: RealtimeService,
    private readonly http: HttpClient
  ) {}

  ngOnInit(): void {
    // Listen to WebSocket prices - updates every second
    this.realtimeService.onPriceUpdateCallback((prices) => {
      if (prices?.length > 0 && prices[0].price > 0) {
        this.prices = prices;
        this.isLoadingPrices = false;
        if (this.selectedCoin) {
          const updated = prices.find(p => p.id === this.selectedCoin!.id);
          if (updated) this.selectedCoin = updated;
        }
      }
    });

    // Initial fallback via HTTP
    this.http.get<any>(`${environment.apiUrl}/prices`).subscribe({
      next: (response) => {
        const prices = response.data.prices;
        if (prices?.length > 0 && prices[0].price > 0) {
          this.prices = prices;
          this.isLoadingPrices = false;
        }
      }
    });
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.destroyChart();
  }

  selectCoin(coin: CoinPrice): void {
    this.selectedCoin = coin;
    this.tradeError = '';
    this.tradeSuccess = '';
    this.quantity = 0;
    this.destroyChart();
    setTimeout(() => {
      this.initChart();
      this.loadChartData(coin.id, this.activeTimeframe);
    }, 100);
  }

  setTimeframe(days: string): void {
    this.activeTimeframe = days;
    if (this.selectedCoin) {
      if (this.candleSeries) { this.chart?.removeSeries(this.candleSeries); this.candleSeries = null; }
      this.loadChartData(this.selectedCoin.id, days);
    }
  }

  initChart(): void {
    if (!this.chartContainer?.nativeElement) return;
    this.destroyChart();
    this.chart = createChart(this.chartContainer.nativeElement, {
      layout: { background: { type: ColorType.Solid, color: '#0a0a0f' }, textColor: '#606078' },
      grid: { vertLines: { color: '#222230' }, horzLines: { color: '#222230' } },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: '#222230' },
      timeScale: { borderColor: '#222230', timeVisible: true },
      width: this.chartContainer.nativeElement.clientWidth,
      height: this.chartContainer.nativeElement.clientHeight || 380,
    });
  }

  loadChartData(coinId: string, days: string): void {
    if (!this.chart) return;
    this.isLoadingChart = true;
    if (this.candleSeries) { this.chart.removeSeries(this.candleSeries); this.candleSeries = null; }

    this.candleSeries = this.chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e', downColor: '#ef4444',
      borderUpColor: '#22c55e', borderDownColor: '#ef4444',
      wickUpColor: '#22c55e', wickDownColor: '#ef4444',
    });

    this.http.get<any>(`${environment.apiUrl}/chart/${coinId}?days=${days}`).subscribe({
      next: (response) => {
        const candles = response.data.candles;
        if (this.candleSeries && candles?.length > 0) {
          this.candleSeries.setData(candles);
          this.chart?.timeScale().fitContent();
        }
        this.isLoadingChart = false;
      },
      error: () => { this.isLoadingChart = false; }
    });
  }

  destroyChart(): void {
    if (this.chart) { this.chart.remove(); this.chart = null; this.candleSeries = null; }
  }

  getTotal(): number {
    if (!this.selectedCoin) return 0;
    return parseFloat((this.quantity * this.selectedCoin.price).toFixed(2));
  }

  setQuickAmount(pct: number): void {
    const balance = this.currentUser?.balance ?? 0;
    const price = this.selectedCoin?.price ?? 0;
    if (price === 0) return;
    this.quantity = parseFloat(((balance / price) * pct).toFixed(6));
  }

  submitTrade(): void {
    if (!this.selectedCoin || this.quantity <= 0) {
      this.tradeError = 'Please enter a valid quantity.';
      return;
    }
    this.tradeError = '';
    this.isSubmitting = true;
    this.tradeService.executeTrade({
      coinId: this.selectedCoin.id, symbol: this.selectedCoin.symbol,
      name: this.selectedCoin.name, type: this.tradeType,
      quantity: this.quantity, price: this.selectedCoin.price
    }).subscribe({
      next: (response) => {
        this.authService.updateBalance(response.data.newBalance);
        this.tradeSuccess = `${this.tradeType === 'buy' ? 'Bought' : 'Sold'} ${this.quantity} ${this.selectedCoin!.symbol}`;
        this.isSubmitting = false;
        this.quantity = 0;
        setTimeout(() => { this.tradeSuccess = ''; }, 3000);
      },
      error: (err) => {
        this.tradeError = err.error?.message ?? 'Trade failed.';
        this.isSubmitting = false;
      }
    });
  }
}