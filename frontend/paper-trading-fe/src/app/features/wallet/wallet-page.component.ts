import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { RealtimeService } from '../../core/realtime.service';

@Component({
  selector: 'app-wallet-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './wallet-page.component.html',
  styleUrl: './wallet-page.component.css'
})
export class WalletPageComponent implements OnInit {
  customAmount: number = 0;
  isLoading: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';

  readonly PRESET_AMOUNTS = [1000, 5000, 10000, 25000, 50000];

  get currentUser() { return this.authService.currentUser; }

  constructor(
    private readonly authService: AuthService,
    private readonly realtimeService: RealtimeService
  ) {}

  ngOnInit(): void {
    this.realtimeService.onFundsAddedCallback((data) => {
      this.authService.updateBalance(data.newBalance);
    });
  }

  addFunds(amount: number): void {
    if (!amount || amount <= 0) {
      this.errorMessage = 'Please enter a valid amount.';
      return;
    }
    if (amount > 100000) {
      this.errorMessage = 'Maximum deposit is $100,000.';
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.isLoading = true;

    this.authService.addFunds(amount).subscribe({
      next: (response) => {
        this.authService.setCurrentUser(response.data.user);
        this.successMessage = `✅ $${amount.toLocaleString()} added successfully! New balance: $${response.data.user.balance.toLocaleString()}`;
        this.customAmount = 0;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message ?? 'Failed to add funds.';
        this.isLoading = false;
      }
    });
  }
}
