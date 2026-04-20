import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TradeService } from '../../core/trade.service';
import { RealtimeService } from '../../core/realtime.service';
import { Trade } from '../../core/models';

@Component({
  selector: 'app-history-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './history-page.component.html',
  styleUrl: './history-page.component.css'
})
export class HistoryPageComponent implements OnInit {
  trades: Trade[] = [];
  isLoading: boolean = true;
  pageError: string = '';
  editingId: string | null = null;
  editNote: string = '';

  constructor(
    private readonly tradeService: TradeService,
    private readonly realtimeService: RealtimeService
  ) {}

  ngOnInit(): void {
    this.loadTrades();

    // WebSocket: auto-refresh when a trade is executed
    this.realtimeService.onPortfolioUpdatedCallback(() => {
      this.loadTrades();
    });
  }

  loadTrades(): void {
    this.isLoading = true;
    this.tradeService.getTrades().subscribe({
      next: (response) => {
        this.trades = response.data.trades;
        this.isLoading = false;
      },
      error: (err) => {
        this.pageError = err.error?.message ?? 'Failed to load history.';
        this.isLoading = false;
      }
    });
  }

  startEdit(trade: Trade): void {
    this.editingId = trade._id;
    this.editNote = trade.note ?? '';
  }

  saveNote(id: string): void {
    this.tradeService.updateTrade(id, this.editNote).subscribe({
      next: (response) => {
        this.trades = this.trades.map(t => t._id === id ? response.data.trade : t);
        this.editingId = null;
      },
      error: (err) => { this.pageError = err.error?.message ?? 'Failed to update.'; }
    });
  }

  deleteTrade(id: string): void {
    this.tradeService.deleteTrade(id).subscribe({
      next: () => { this.trades = this.trades.filter(t => t._id !== id); },
      error: (err) => { this.pageError = err.error?.message ?? 'Failed to delete.'; }
    });
  }
}