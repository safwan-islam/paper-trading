import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TradeService {
  private readonly API = environment.apiUrl;

  constructor(private readonly httpClient: HttpClient) {}

  executeTrade(payload: { coinId: string; symbol: string; name: string; type: 'buy' | 'sell'; quantity: number; price: number }) {
    return this.httpClient.post<any>(`${this.API}/trades`, payload);
  }

  getTrades() {
    return this.httpClient.get<any>(`${this.API}/trades`);
  }

  getTradeById(id: string) {
    return this.httpClient.get<any>(`${this.API}/trades/${id}`);
  }

  updateTrade(id: string, note: string) {
    return this.httpClient.put<any>(`${this.API}/trades/${id}`, { note });
  }

  deleteTrade(id: string) {
    return this.httpClient.delete<any>(`${this.API}/trades/${id}`);
  }
}
