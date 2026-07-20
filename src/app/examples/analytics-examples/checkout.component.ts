import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService, AnalyticsItem } from '../../core/analytics';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="checkout-page p-6">
      <h2 class="text-xl font-bold">Checkout</h2>
      
      <div class="my-4">
        <label class="block font-semibold">Select Shipping Tier:</label>
        <button (click)="onSelectShipping('Express Delivery', 150)" class="bg-indigo-50 px-4 py-2 border rounded mr-2">
          Express (₹150)
        </button>
        <button (click)="onSelectShipping('Standard Free', 0)" class="bg-indigo-50 px-4 py-2 border rounded">
          Standard (Free)
        </button>
      </div>

      <div class="my-4">
        <label class="block font-semibold">Select Payment Method:</label>
        <button (click)="onSelectPayment('UPI_RAZORPAY')" class="bg-emerald-50 px-4 py-2 border rounded mr-2">
          UPI / QR Code
        </button>
        <button (click)="onSelectPayment('CREDIT_CARD')" class="bg-emerald-50 px-4 py-2 border rounded">
          Credit Card
        </button>
      </div>

      <button (click)="onApplyCoupon('WELCOME3D')" class="text-blue-600 underline text-sm block my-2">
        Apply Coupon "WELCOME3D"
      </button>
    </div>
  `
})
export class CheckoutComponent {
  private analytics = inject(AnalyticsService);

  items: AnalyticsItem[] = [
    { item_id: '3D-PLA-PRO-RED', item_name: 'High Precision PLA Pro Filament Red 1kg', price: 1499, quantity: 2 }
  ];

  totalAmount = 2998;

  onSelectShipping(tier: string, cost: number): void {
    this.analytics.trackShippingSelected(tier, cost);
  }

  onSelectPayment(paymentMethod: string): void {
    this.analytics.trackPaymentSelected(paymentMethod, this.totalAmount);
  }

  onApplyCoupon(code: string): void {
    this.analytics.trackCouponApplied(code, 300);
  }
}
