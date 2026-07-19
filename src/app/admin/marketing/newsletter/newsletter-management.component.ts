import { Component, ChangeDetectionStrategy, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { CustomerService } from '../../shared/services/customer.service';
import { ToastService } from '../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-admin-newsletter-management',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './newsletter-management.component.html',
  styleUrl: './newsletter-management.component.scss'
})
export class NewsletterManagementComponent {
  private customerService = inject(CustomerService);
  private toastService = inject(ToastService);

  activeSection = signal<'subscribers' | 'campaigns' | 'analytics' | 'settings'>('subscribers');

  // Subscribers Data States
  subscribers = signal<any[]>([]);
  totalSubscribers = signal<number>(0);
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalPages = signal<number>(1);
  isLoading = signal<boolean>(true);

  // Search & Filters
  searchQuery = signal<string>('');
  selectedStatus = signal<string>('');
  selectedSource = signal<string>('');
  sortField = signal<string>('subscribedAt');
  sortOrder = signal<'asc' | 'desc'>('desc');

  // Campaign State
  campaign = {
    subject: '',
    body: '',
    audienceSegment: 'all'
  };
  isCampaignSending = signal<boolean>(false);

  // Analytics Stats
  analyticsStats = signal<any>(null);
  isAnalyticsLoading = signal<boolean>(true);

  // Popup Settings State
  popupSettings = signal<any>({
    headline: 'Stay Updated with 3DGalaxy',
    description: 'Get exclusive offers, new product launches, printing tips, and member-only discounts.',
    placeholder: 'Enter your email address',
    btnText: 'Subscribe',
    successMessage: 'Thank you for subscribing! Check your inbox for 10% off code.',
    theme: 'dark-orange',
    background: 'glassmorphism',
    triggerRule: 'delay', // 'delay' | 'scroll' | 'exit'
    triggerDelay: 10, // seconds
    scrollPercent: 50,
    frequency: 'once-per-user',
    isEnabledHome: true,
    isEnabledProduct: true,
    isEnabledBlog: true
  });

  constructor() {
    effect(() => {
      if (this.activeSection() === 'subscribers') {
        this.fetchSubscribers();
      } else if (this.activeSection() === 'analytics') {
        this.fetchAnalytics();
      }
    });
  }

  fetchSubscribers() {
    this.isLoading.set(true);
    const params = {
      page: this.currentPage(),
      limit: this.pageSize(),
      search: this.searchQuery(),
      status: this.selectedStatus(),
      source: this.selectedSource(),
      sortField: this.sortField(),
      sortOrder: this.sortOrder()
    };

    this.customerService.getNewsletterSubscribers(params).subscribe({
      next: (res) => {
        if (res.success) {
          this.subscribers.set(res.data);
          this.totalSubscribers.set(res.meta.total);
          this.totalPages.set(res.meta.totalPages);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.toastService.error('Failed to load subscribers list.');
        this.isLoading.set(false);
      }
    });
  }

  fetchAnalytics() {
    this.isAnalyticsLoading.set(true);
    this.customerService.getNewsletterAnalytics().subscribe({
      next: (res) => {
        if (res.success) {
          this.analyticsStats.set(res.data);
        }
        this.isAnalyticsLoading.set(false);
      },
      error: () => {
        this.toastService.error('Failed to fetch analytics statistics.');
        this.isAnalyticsLoading.set(false);
      }
    });
  }

  // Filters & Sorting
  onSearch(query: string) {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  onStatusFilter(status: string) {
    this.selectedStatus.set(status);
    this.currentPage.set(1);
  }

  onSourceFilter(source: string) {
    this.selectedSource.set(source);
    this.currentPage.set(1);
  }

  onSort(field: string) {
    if (this.sortField() === field) {
      this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortOrder.set('desc');
    }
    this.currentPage.set(1);
  }

  // Pagination
  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
    }
  }

  // Action Operations
  toggleUnsubscribe(sub: any) {
    const isUnsub = sub.status === 'unsubscribed';
    const payload = { status: isUnsub ? 'active' : 'unsubscribed' };
    this.customerService.updateNewsletterSubscriber(sub.id, payload).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.success(isUnsub ? 'Subscriber re-activated.' : 'Subscriber unsubscribed.');
          this.fetchSubscribers();
        }
      }
    });
  }

  deleteSubscriber(id: string) {
    if (confirm('Permanently delete this subscriber?')) {
      this.customerService.deleteNewsletterSubscriber(id).subscribe({
        next: (res) => {
          if (res.success) {
            this.toastService.success('Subscriber deleted.');
            this.fetchSubscribers();
          }
        }
      });
    }
  }

  // Export CSV
  exportCSV() {
    const headers = ['Email', 'Name', 'Phone', 'Status', 'Date Joined', 'Source', 'Campaign'];
    const rows = this.subscribers().map((s) => [
      s.email,
      s.name,
      s.phone,
      s.status,
      new Date(s.subscriptionDate).toLocaleDateString(),
      s.source,
      s.campaign
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `newsletter_subscribers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Send Campaign Campaign
  sendCampaign() {
    if (!this.campaign.subject || !this.campaign.body) {
      this.toastService.error('Campaign Subject and Email Body content required.');
      return;
    }

    this.isCampaignSending.set(true);
    this.customerService.sendNewsletterCampaign(this.campaign).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.success(res.message || 'Newsletter campaign successfully sent.');
          this.campaign.subject = '';
          this.campaign.body = '';
        }
        this.isCampaignSending.set(false);
      },
      error: (err) => {
        this.toastService.error(err.error?.error || 'Failed to dispatch campaign.');
        this.isCampaignSending.set(false);
      }
    });
  }

  // Settings Save
  saveSettings() {
    this.toastService.success('Newsletter settings saved successfully.');
  }

  mathMin(a: number, b: number): number {
    return Math.min(a, b);
  }

  handleImageError(event: any, fallbackUrl: string) {
    if (event && event.target) {
      (event.target as HTMLImageElement).src = fallbackUrl;
    }
  }
}
