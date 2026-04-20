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

  private cbsPriceUpdate: ((p: CoinPrice[]) => void)[] = [];
  private cbsPortfolioUpdated: ((d: any) => void)[] = [];
  private cbsFundsAdded: ((d: any) => void)[] = [];
  private cbsPriceAlert: ((d: any) => void)[] = [];
  private cbsTradeBroadcast: ((d: any) => void)[] = [];
  private cbsOnlineCount: ((d: any) => void)[] = [];

  connect(userId: string): void {
    if (this.socket?.connected) return;
    this.socket = io(environment.apiUrl, { transports: ['websocket'] });

    this.socket.on('connect', () => { this.socket?.emit('join', userId); });

    this.socket.on('price:update', (data: { prices: CoinPrice[] }) => {
      this.prices = data.prices;
      this.cbsPriceUpdate.forEach(cb => cb(data.prices));
    });

    this.socket.on('trade:executed', (data: { message: string }) => {
      this.lastTradeNotification = data.message;
      setTimeout(() => { this.lastTradeNotification = ''; }, 4000);
    });

    this.socket.on('price:alert', (data: any) => {
      this.lastPriceAlert = data.message;
      this.cbsPriceAlert.forEach(cb => cb(data));
      setTimeout(() => { this.lastPriceAlert = ''; }, 5000);
    });

    this.socket.on('portfolio:updated', (data: any) => {
      this.cbsPortfolioUpdated.forEach(cb => cb(data.data));
    });

    this.socket.on('funds:added', (data: any) => {
      this.lastFundsAdded = data.message;
      this.cbsFundsAdded.forEach(cb => cb(data.data));
      setTimeout(() => { this.lastFundsAdded = ''; }, 4000);
    });

    this.socket.on('online:count', (data: { count: number }) => {
      this.onlineCount = data.count;
      this.cbsOnlineCount.forEach(cb => cb(data));
    });

    this.socket.on('trade:broadcast', (data: any) => {
      this.cbsTradeBroadcast.forEach(cb => cb(data));
    });
  }

  onPriceUpdateCallback(cb: (p: CoinPrice[]) => void) { this.cbsPriceUpdate.push(cb); }
  onPortfolioUpdatedCallback(cb: (d: any) => void) { this.cbsPortfolioUpdated.push(cb); }
  onFundsAddedCallback(cb: (d: any) => void) { this.cbsFundsAdded.push(cb); }
  onPriceAlertCallback(cb: (d: any) => void) { this.cbsPriceAlert.push(cb); }
  onTradeBroadcastCallback(cb: (d: any) => void) { this.cbsTradeBroadcast.push(cb); }
  onOnlineCountCallback(cb: (d: any) => void) { this.cbsOnlineCount.push(cb); }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.cbsPriceUpdate = [];
    this.cbsPortfolioUpdated = [];
    this.cbsFundsAdded = [];
    this.cbsPriceAlert = [];
    this.cbsTradeBroadcast = [];
    this.cbsOnlineCount = [];
  }
}