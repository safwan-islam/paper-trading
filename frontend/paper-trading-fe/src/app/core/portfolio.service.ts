import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PortfolioService {
  private readonly API = environment.apiUrl;

  constructor(private readonly httpClient: HttpClient) {}

  getPortfolio() {
    return this.httpClient.get<any>(`${this.API}/portfolio`);
  }

  getPositionById(id: string) {
    return this.httpClient.get<any>(`${this.API}/portfolio/${id}`);
  }

  updatePosition(id: string, targetPrice: number | null) {
    return this.httpClient.put<any>(`${this.API}/portfolio/${id}`, { targetPrice });
  }

  deletePosition(id: string) {
    return this.httpClient.delete<any>(`${this.API}/portfolio/${id}`);
  }
}
