import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService, AnalyticsItem } from '../../core/analytics';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="cart-page p-6">
      <h2 class="text-xl font-bold">Shopping Cart</h2>
      <div *ngFor="let item of cartItems" class="flex justify-between py-2 border-b">
        <span>{{ item.item_name }} (x{{ item.quantity }})</span>
        <span>₹{{ item.price * (item.quantity || 1) }}</span>
        <button (click)="onRemoveItem(item)" class="text-red-500 font-semibold">Remove</button>
      </div>
      <div class="mt-4 text-right">
        <p class="text-lg font-bold">Total: ₹{{ getTotal() }}</p>
        <button (click)="onProceedToCheckout()" class="bg-green-600 text-white px-6 py-2 rounded mt-2">
          Proceed to Checkout
        </button>
      </div>
    </div>
  `
})
export class CartComponent implements OnInit {
  private analytics = inject(AnalyticsService);

  cartItems: AnalyticsItem[] = [
    {
      item_id: '3D-PLA-PRO-RED',
      item_name: 'High Precision PLA Pro Filament Red 1kg',
      item_category: 'Filaments',
      price: 1499,
      quantity: 2
    },
    {
      item_id: '3D-NOZZLE-04',
      item_name: 'Hardened Steel Nozzle 0.4mm',
      item_category: 'Accessories',
      price: 499,
      quantity: 1
    }
  ];

  ngOnInit(): void {
    this.analytics.trackViewCart(this.cartItems, this.getTotal());
  }

  getTotal(): number {
    return this.cartItems.reduce((acc, curr) => acc + curr.price * (curr.quantity || 1), 0);
  }

  onRemoveItem(item: AnalyticsItem): void {
    this.cartItems = this.cartItems.filter((i) => i.item_id !== item.item_id);
    this.analytics.trackRemoveFromCart(item, item.quantity || 1);
  }

  onProceedToCheckout(): void {
    this.analytics.trackCheckout({
      value: this.getTotal(),
      currency: 'INR',
      items: this.cartItems
    });
    this.analytics.trackRemarketingAudience('checkout_abandoners', { itemsCount: this.cartItems.length });
  }
}
