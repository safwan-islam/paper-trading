import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { User } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = environment.apiUrl;
  readonly currentUser = signal<User | null>(null);

  constructor(private readonly httpClient: HttpClient) {
    const stored = localStorage.getItem('user');
    if (stored) {
      try { this.currentUser.set(JSON.parse(stored)); } catch { localStorage.removeItem('user'); }
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

  setToken(token: string) { localStorage.setItem('token', token); }
  getToken(): string | null { return localStorage.getItem('token'); }

  setCurrentUser(user: User) {
    this.currentUser.set(user);
    localStorage.setItem('user', JSON.stringify(user));
  }

  updateBalance(balance: number) {
    const user = this.currentUser();
    if (user) {
      const updated = { ...user, balance };
      this.currentUser.set(updated);
      localStorage.setItem('user', JSON.stringify(updated));
    }
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUser.set(null);
  }

  isLoggedIn(): boolean { return !!this.getToken(); }
}
