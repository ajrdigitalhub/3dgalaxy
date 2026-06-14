import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { CustomerService } from '../../shared/services/customer.service';
import { ToastService } from '../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-admin-customer-list',
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './customer-list.component.html',
  styleUrl: './customer-list.component.scss'
})
export class CustomerListComponent {
  toastService = inject(ToastService);
  customerService = inject(CustomerService);

  activeSubTab = signal<'customer-list' | 'customer-groups' | 'reviews'>('customer-list');

  setSubTab(tab: 'customer-list' | 'customer-groups' | 'reviews') {
    this.activeSubTab.set(tab);
  }

  awardPoints(id: string, points: number) {
    this.customerService.awardPoints(id, points);
  }

  approveReview(id: string) {
    this.customerService.approveReview(id);
    this.toastService.info('Review feedback publicly approved and published.');
  }

  rejectReview(id: string) {
    this.customerService.rejectReview(id);
    this.toastService.info('Review feedback suppressed from public directory.');
  }

  postResponse(id: string, text: string) {
    if (!text.trim()) {
      this.toastService.info('Write response body text.');
      return;
    }
    this.customerService.saveReviewResponse(id, text.trim());
    this.toastService.info('Response published and linked to user rating ticket.');
  }
}
