import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { User } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = environment.apiUrl;
  currentUser: User | null = null;

  constructor(private readonly httpClient: HttpClient) {
    const stored = localStorage.getItem('user');
    if (stored) {
      try { this.currentUser = JSON.parse(stored); }
      catch { localStorage.removeItem('user'); }
    }
  }

  register(name: string, email: string, password: string) {
    return this.httpClient.post<any>(`${this.API}/auth/register`, { name, email, password });
  }

  login(email: string, password: string) {
    return this.httpClient.post<any>(`${this.API}/auth/login`, { email, password });
  }

  fetchMe() {
    return this.httpClient.get<any>(`${this.API}/auth/me`);
  }

  addFunds(amount: number) {
    return this.httpClient.post<any>(`${this.API}/auth/add-funds`, { amount });
  }

  setToken(token: string) { localStorage.setItem('token', token); }
  getToken(): string | null { return localStorage.getItem('token'); }

  setCurrentUser(user: User) {
    this.currentUser = user;
    localStorage.setItem('user', JSON.stringify(user));
  }

  updateBalance(balance: number) {
    if (this.currentUser) {
      this.currentUser = { ...this.currentUser, balance };
      localStorage.setItem('user', JSON.stringify(this.currentUser));
    }
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUser = null;
  }

  isLoggedIn(): boolean { return !!this.getToken(); }
}
