import {
  Component, computed, inject, signal, OnInit, OnDestroy,
  ElementRef, ViewChild, AfterViewInit, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/auth.service';
import { TradeService } from '../../core/trade.service';
import { CoinPrice } from '../../core/models';
import { createChart, CandlestickSeries, ColorType } from 'lightweight-charts';

@Component({
  selector: 'app-market-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './market-page.component.html',
  styleUrl: './market-page.component.css'
})
export class MarketPageComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('chartContainer') chartContainer!: ElementRef;

  private readonly authService = inject(AuthService);
  private readonly tradeService = inject(TradeService);
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly currentUser = computed(() => this.authService.currentUser());
  readonly localPrices = signal<CoinPrice[]>([]);
  readonly selectedCoin = signal<CoinPrice | null>(null);
  readonly tradeType = signal<'buy' | 'sell'>('buy');
  readonly quantity = signal(0);
  readonly isSubmitting = signal(false);
  readonly tradeError = signal('');
  readonly tradeSuccess = signal('');
  readonly isLoadingPrices = signal(true);
  readonly isLoadingChart = signal(false);
  readonly activeTimeframe = signal('7');
  readonly searchQuery = signal('');

  private chart: any = null;
  private candleSeries: any = null;
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

  readonly TIMEFRAMES = [
    { label: '1D', days: '1' },
    { label: '7D', days: '7' },
    { label: '1M', days: '30' },
    { label: '3M', days: '90' },
  ];

  readonly filteredPrices = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return this.localPrices().filter(c =>
      c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    );
  });

  ngOnInit(): void {
    this.fetchPrices();
    this.pollInterval = setInterval(() => this.fetchPrices(), 15000);
  }

  ngAfterViewInit(): void {
    if (this.selectedCoin()) {
      setTimeout(() => this.initChart(), 100);
    }
  }

  ngOnDestroy(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.destroyChart();
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
        const sel = this.selectedCoin();
        if (sel) {
          const updated = prices.find(p => p.id === sel.id);
          if (updated) this.selectedCoin.set(updated);
        }
      },
      error: () => this.isLoadingPrices.set(false)
    });
  }

  selectCoin(coin: CoinPrice): void {
    this.selectedCoin.set(coin);
    this.tradeError.set('');
    this.tradeSuccess.set('');
    this.quantity.set(0);
    this.destroyChart();
    this.cdr.detectChanges();
    setTimeout(() => {
      this.initChart();
      this.loadCandlestickData(coin.id, this.activeTimeframe());
    }, 100);
  }

  setTimeframe(days: string): void {
    this.activeTimeframe.set(days);
    const coin = this.selectedCoin();
    if (coin) this.loadCandlestickData(coin.id, days);
  }

  initChart(): void {
    if (!this.chartContainer?.nativeElement) return;
    this.destroyChart();

    this.chart = createChart(this.chartContainer.nativeElement, {
      layout: {
        background: { type: ColorType.Solid, color: '#080c18' },
        textColor: '#64748b',
      },
      grid: {
        vertLines: { color: '#1a2540' },
        horzLines: { color: '#1a2540' },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: '#1a2540' },
      timeScale: { borderColor: '#1a2540', timeVisible: true },
      width: this.chartContainer.nativeElement.clientWidth,
      height: 380,
    });

    this.candleSeries = this.chart.addSeries(CandlestickSeries, {
      upColor: '#00d4aa',
      downColor: '#ff4757',
      borderUpColor: '#00d4aa',
      borderDownColor: '#ff4757',
      wickUpColor: '#00d4aa',
      wickDownColor: '#ff4757',
    });
  }

  loadCandlestickData(coinId: string, days: string): void {
    if (!this.candleSeries) return;
    this.isLoadingChart.set(true);

    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`;
    this.http.get<any>(url).subscribe({
      next: (data) => {
        const candles = data.map((d: number[]) => ({
          time: Math.floor(d[0] / 1000) as any,
          open: d[1], high: d[2], low: d[3], close: d[4],
        }));
        if (this.candleSeries && candles.length > 0) {
          this.candleSeries.setData(candles);
          this.chart?.timeScale().fitContent();
        }
        this.isLoadingChart.set(false);
      },
      error: () => this.isLoadingChart.set(false)
    });
  }

  destroyChart(): void {
    if (this.chart) {
      this.chart.remove();
      this.chart = null;
      this.candleSeries = null;
    }
  }

  getTotal(): number {
    const coin = this.selectedCoin();
    if (!coin) return 0;
    return parseFloat((this.quantity() * coin.price).toFixed(2));
  }

  getMaxQty(): number {
    const coin = this.selectedCoin();
    const balance = this.currentUser()?.balance ?? 0;
    if (!coin || coin.price === 0) return 0;
    return parseFloat((balance / coin.price).toFixed(6));
  }

  setQuickAmount(pct: number): void {
    const max = this.getMaxQty();
    this.quantity.set(parseFloat((max * pct).toFixed(6)));
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
        this.tradeSuccess.set(`✅ ${this.tradeType() === 'buy' ? 'Bought' : 'Sold'} ${this.quantity()} ${coin.symbol} at $${coin.price.toLocaleString()}`);
        this.isSubmitting.set(false);
        this.quantity.set(0);
        setTimeout(() => this.tradeSuccess.set(''), 4000);
      },
      error: (err) => {
        this.tradeError.set(err.error?.message ?? 'Trade failed.');
        this.isSubmitting.set(false);
      }
    });
  }
}
