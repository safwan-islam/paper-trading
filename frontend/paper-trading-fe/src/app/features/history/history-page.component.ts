import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TradeService } from '../../core/trade.service';
import { Trade } from '../../core/models';

@Component({
  selector: 'app-history-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './history-page.component.html',
  styleUrl: './history-page.component.css'
})
export class HistoryPageComponent {
  private readonly tradeService = inject(TradeService);

  readonly trades = signal<Trade[]>([]);
  readonly isLoading = signal(true);
  readonly pageError = signal('');
  readonly editingId = signal<string | null>(null);
  readonly editNote = signal('');

  constructor() {
    this.loadTrades();
  }

  loadTrades(): void {
    this.isLoading.set(true);
    this.tradeService.getTrades().subscribe({
      next: (response) => {
        this.trades.set(response.data.trades);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.pageError.set(err.error?.message ?? 'Failed to load trade history.');
        this.isLoading.set(false);
      }
    });
  }

  startEdit(trade: Trade): void {
    this.editingId.set(trade._id);
    this.editNote.set(trade.note ?? '');
  }

  saveNote(id: string): void {
    this.tradeService.updateTrade(id, this.editNote()).subscribe({
      next: (response) => {
        this.trades.set(this.trades().map(t => t._id === id ? response.data.trade : t));
        this.editingId.set(null);
      },
      error: (err) => this.pageError.set(err.error?.message ?? 'Failed to update note.')
    });
  }

  deleteTrade(id: string): void {
    this.tradeService.deleteTrade(id).subscribe({
      next: () => this.trades.set(this.trades().filter(t => t._id !== id)),
      error: (err) => this.pageError.set(err.error?.message ?? 'Failed to delete trade.')
    });
  }
}
