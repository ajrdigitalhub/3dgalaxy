import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService, AnalyticsItem } from '../../core/analytics';

@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="product-details p-6" *ngIf="product">
      <h1 class="text-2xl font-bold">{{ product.item_name }}</h1>
      <p class="text-xl text-indigo-600 font-semibold">₹{{ product.price }}</p>
      
      <div class="mt-4 flex space-x-4">
        <button (click)="onAddToCart()" class="bg-blue-600 text-white px-4 py-2 rounded">
          Add to Cart
        </button>
        <button (click)="onAddToWishlist()" class="bg-pink-600 text-white px-4 py-2 rounded">
          Add to Wishlist
        </button>
        <button (click)="onCustomize()" class="bg-gray-800 text-white px-4 py-2 rounded">
          Customize 3D Model
        </button>
      </div>
    </div>
  `
})
export class ProductDetailsComponent implements OnInit {
  private analytics = inject(AnalyticsService);

  product: AnalyticsItem = {
    item_id: '3D-PLA-PRO-RED',
    item_name: 'High Precision PLA Pro Filament Red 1kg',
    item_category: '3D Printing Filaments',
    item_brand: '3DGalaxy',
    price: 1499,
    currency: 'INR'
  };

  ngOnInit(): void {
    // Track Product View on load
    this.analytics.trackViewItem(this.product);
    this.analytics.trackRemarketingAudience('product_viewers', { itemId: this.product.item_id });
  }

  onAddToCart(): void {
    this.analytics.trackAddToCart(this.product, 1);
  }

  onAddToWishlist(): void {
    this.analytics.trackWishlist(this.product);
    this.analytics.trackRemarketingAudience('wishlist_users', { itemId: this.product.item_id });
  }

  onCustomize(): void {
    this.analytics.trackEvent('customize_product', {
      item_id: this.product.item_id,
      infill_density: '20%',
      layer_height: '0.12mm',
      color: 'Crimson Red'
    });
  }
}
