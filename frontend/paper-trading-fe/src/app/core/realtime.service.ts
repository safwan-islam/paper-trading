import { Injectable, signal } from '@angular/core';
import { Socket, io } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { CoinPrice } from './models';

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private socket: Socket | null = null;
  readonly prices = signal<CoinPrice[]>([]);
  readonly lastTradeNotification = signal<string>('');

  connect(userId: string): void {
    if (this.socket?.connected) return;

    this.socket = io(environment.apiUrl, { transports: ['websocket'] });

    this.socket.on('connect', () => {
      this.socket?.emit('join', userId);
    });

    this.socket.on('price:update', (data: { prices: CoinPrice[] }) => {
      this.prices.set(data.prices);
    });

    this.socket.on('trade:executed', (data: { message: string; data: { trade: any } }) => {
      this.lastTradeNotification.set(data.message);
      setTimeout(() => this.lastTradeNotification.set(''), 4000);
    });
  }

  disconnect(): void {
    this.socket?.off('price:update');
    this.socket?.off('trade:executed');
    this.socket?.disconnect();
    this.socket = null;
  }

  getPriceForCoin(coinId: string): CoinPrice | undefined {
    return this.prices().find(p => p.id === coinId);
  }
}
