import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService, AnalyticsItem } from '../../core/analytics';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="wishlist-page p-6">
      <h2 class="text-xl font-bold">Your Saved Items</h2>
      <div *ngFor="let item of wishlistItems" class="flex justify-between py-2 border-b">
        <span>{{ item.item_name }}</span>
        <button (click)="onMoveToCart(item)" class="text-indigo-600 font-semibold">Move to Cart</button>
      </div>
    </div>
  `
})
export class WishlistComponent implements OnInit {
  private analytics = inject(AnalyticsService);

  wishlistItems: AnalyticsItem[] = [
    { item_id: '3D-PRINTER-CORE-X', item_name: 'CoreXY 3D Printer Kit', price: 34999, currency: 'INR' }
  ];

  ngOnInit(): void {
    this.analytics.trackRemarketingAudience('wishlist_users', { itemCount: this.wishlistItems.length });
  }

  onMoveToCart(item: AnalyticsItem): void {
    this.analytics.trackAddToCart(item, 1);
  }
}
