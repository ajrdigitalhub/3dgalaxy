import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService } from '../../core/analytics';

@Component({
  selector: 'app-notification-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="banner bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 flex justify-between items-center">
      <span>🚀 Flash Sale: Get 15% OFF all Resin Printers today!</span>
      <button (click)="onBannerClick()" class="bg-white text-purple-700 font-bold px-4 py-1 rounded">
        Claim Offer
      </button>
    </div>
  `
})
export class NotificationBannerComponent {
  private analytics = inject(AnalyticsService);

  onBannerClick(): void {
    this.analytics.trackPushNotificationClick('FLASH_RESIN_SALE_JULY', '/categories/resin-printers');
  }
}
