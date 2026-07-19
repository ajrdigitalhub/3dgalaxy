import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { CustomerService } from '../../shared/services/customer.service';
import { ToastService } from '../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-admin-customer-analytics',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './customer-analytics.component.html',
  styleUrl: './customer-analytics.component.scss'
})
export class CustomerAnalyticsComponent implements OnInit {
  private customerService = inject(CustomerService);
  private toastService = inject(ToastService);

  analyticsData = signal<any>(null);
  isLoading = signal<boolean>(true);

  ngOnInit() {
    this.fetchAnalytics();
  }

  fetchAnalytics() {
    this.isLoading.set(true);
    this.customerService.getCustomerAnalytics().subscribe({
      next: (res) => {
        if (res.success) {
          this.analyticsData.set(res.data);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.toastService.error('Failed to load customer analytics.');
        this.isLoading.set(false);
      }
    });
  }

  mathMin(a: number, b: number): number {
    return Math.min(a, b);
  }

  mathRound(val: number): number {
    return Math.round(val);
  }
}
