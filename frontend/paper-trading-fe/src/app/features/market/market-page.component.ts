import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { TradeService } from '../../core/trade.service';
import { RealtimeService } from '../../core/realtime.service';
import { CoinPrice } from '../../core/models';

@Component({
  selector: 'app-market-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './market-page.component.html',
  styleUrl: './market-page.component.css'
})
export class MarketPageComponent {
  private readonly authService = inject(AuthService);
  private readonly tradeService = inject(TradeService);
  private readonly realtimeService = inject(RealtimeService);

  readonly prices = computed(() => this.realtimeService.prices());
  readonly currentUser = computed(() => this.authService.currentUser());
  readonly selectedCoin = signal<CoinPrice | null>(null);
  readonly tradeType = signal<'buy' | 'sell'>('buy');
  readonly quantity = signal(0);
  readonly isSubmitting = signal(false);
  readonly tradeError = signal('');
  readonly tradeSuccess = signal('');

  openTrade(coin: CoinPrice, type: 'buy' | 'sell'): void {
    this.selectedCoin.set(coin);
    this.tradeType.set(type);
    this.quantity.set(0);
    this.tradeError.set('');
    this.tradeSuccess.set('');
  }

  closeTrade(): void {
    this.selectedCoin.set(null);
  }

  getTotal(): number {
    const coin = this.selectedCoin();
    if (!coin) return 0;
    return parseFloat((this.quantity() * coin.price).toFixed(2));
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
      coinId: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      type: this.tradeType(),
      quantity: this.quantity(),
      price: coin.price
    }).subscribe({
      next: (response) => {
        this.authService.updateBalance(response.data.newBalance);
        this.tradeSuccess.set(`${this.tradeType() === 'buy' ? 'Bought' : 'Sold'} ${this.quantity()} ${coin.symbol} successfully!`);
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
