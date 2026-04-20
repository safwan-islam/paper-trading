import { Injectable } from '@angular/core';
import { Socket, io } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { CoinPrice } from './models';

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private socket: Socket | null = null;

  prices: CoinPrice[] = [];
  lastTradeNotification: string = '';
  lastFundsAdded: string = '';
  lastPriceAlert: string = '';
  onlineCount: number = 0;

  private cbPriceUpdate: ((p: CoinPrice[]) => void) | null = null;
  private cbPortfolioUpdated: ((d: any) => void) | null = null;
  private cbFundsAdded: ((d: any) => void) | null = null;
  private cbPriceAlert: ((d: any) => void) | null = null;
  private cbTradeBroadcast: ((d: any) => void) | null = null;
  private cbOnlineCount: ((d: any) => void) | null = null;

  connect(userId: string): void {
    if (this.socket?.connected) return;
    this.socket = io(environment.apiUrl, { transports: ['websocket'] });

    this.socket.on('connect', () => { this.socket?.emit('join', userId); });

    // WS1: price:update
    this.socket.on('price:update', (data: { prices: CoinPrice[] }) => {
      this.prices = data.prices;
      if (this.cbPriceUpdate) this.cbPriceUpdate(data.prices);
    });

    // WS2: trade:executed (private)
    this.socket.on('trade:executed', (data: { message: string }) => {
      this.lastTradeNotification = data.message;
      setTimeout(() => { this.lastTradeNotification = ''; }, 4000);
    });

    // WS3: price:alert
    this.socket.on('price:alert', (data: any) => {
      this.lastPriceAlert = data.message;
      if (this.cbPriceAlert) this.cbPriceAlert(data);
      setTimeout(() => { this.lastPriceAlert = ''; }, 5000);
    });

    // WS4: portfolio:updated (private)
    this.socket.on('portfolio:updated', (data: any) => {
      if (this.cbPortfolioUpdated) this.cbPortfolioUpdated(data.data);
    });

    // WS5: funds:added (private)
    this.socket.on('funds:added', (data: any) => {
      this.lastFundsAdded = data.message;
      if (this.cbFundsAdded) this.cbFundsAdded(data.data);
      setTimeout(() => { this.lastFundsAdded = ''; }, 4000);
    });

    // WS6: online:count (public)
    this.socket.on('online:count', (data: { count: number }) => {
      this.onlineCount = data.count;
      if (this.cbOnlineCount) this.cbOnlineCount(data);
    });

    // WS7: trade:broadcast (public feed)
    this.socket.on('trade:broadcast', (data: any) => {
      if (this.cbTradeBroadcast) this.cbTradeBroadcast(data);
    });
  }

  onPriceUpdateCallback(cb: (p: CoinPrice[]) => void) { this.cbPriceUpdate = cb; }
  onPortfolioUpdatedCallback(cb: (d: any) => void) { this.cbPortfolioUpdated = cb; }
  onFundsAddedCallback(cb: (d: any) => void) { this.cbFundsAdded = cb; }
  onPriceAlertCallback(cb: (d: any) => void) { this.cbPriceAlert = cb; }
  onTradeBroadcastCallback(cb: (d: any) => void) { this.cbTradeBroadcast = cb; }
  onOnlineCountCallback(cb: (d: any) => void) { this.cbOnlineCount = cb; }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }
}
