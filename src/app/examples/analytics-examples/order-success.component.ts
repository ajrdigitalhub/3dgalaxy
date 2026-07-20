import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService } from '../../core/analytics';

@Component({
  selector: 'app-order-success',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="order-success p-6 text-center">
      <h1 class="text-3xl font-bold text-green-600">Thank You for Your Order!</h1>
      <p class="mt-2">Order ID: <strong>{{ orderId }}</strong></p>
      <p class="text-gray-600">A confirmation email has been sent.</p>
    </div>
  `
})
export class OrderSuccessComponent implements OnInit {
  private analytics = inject(AnalyticsService);

  orderId = 'ORD-3DG-998821';

  ngOnInit(): void {
    // Fire purchase event with customer data for enhanced conversions / advanced matching
    this.analytics.trackPurchase({
      transaction_id: this.orderId,
      value: 3497,
      tax: 270,
      shipping: 0,
      currency: 'INR',
      coupon: 'WELCOME3D',
      items: [
        { item_id: '3D-PLA-PRO-RED', item_name: 'High Precision PLA Pro Filament Red 1kg', price: 1499, quantity: 2 },
        { item_id: '3D-NOZZLE-04', item_name: 'Hardened Steel Nozzle 0.4mm', price: 499, quantity: 1 }
      ],
      customerData: {
        email: 'customer@example.com',
        phone: '+919876543210',
        firstName: 'Rahul',
        lastName: 'Sharma',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560001',
        country: 'India'
      }
    });

    this.analytics.trackRemarketingAudience('previous_buyers', { orderId: this.orderId });
  }
}
