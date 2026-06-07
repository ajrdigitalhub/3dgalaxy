import {Component, ChangeDetectionStrategy, inject, signal, computed} from '@angular/core';
import {CommonModule} from '@angular/common';
import {RouterModule, Router} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {DatastoreService} from '../../services/datastore';

@Component({
  selector: 'app-cart-checkout',
  imports: [CommonModule, RouterModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cart.html',
  styleUrl: './cart.scss'
})
export class CartCheckout {
  ds = inject(DatastoreService);
  router = inject(Router);

  checkoutGroup = signal<'guest' | 'member'>('guest');
  selectedPayment = signal<string>('UPI');
  couponInputText = signal<string>('');

  // Delivery customer particulars (drafts context)
  recipientName = signal<string>('Sumit Sharma');
  recipientPhone = signal<string>('9876543210');
  recipientEmail = signal<string>('sumit@3dgalaxy.co.in');
  recipientAddress = signal<string>('');

  accruedPoints = computed(() => {
    return Math.floor(this.ds.cartGrandTotal() / 100);
  });

  mrpSavings = computed(() => {
    return this.ds.cartMRPtotal() - this.ds.cartSubtotal();
  });

  constructor() {
    this.recipientAddress.set(this.ds.shippingAddress());
    
    // Auto sync if customer is preselected
    if (this.ds.userRole() !== 'guest') {
      this.checkoutGroup.set('member');
      const u = this.ds.activeUser();
      this.recipientName.set(u.name);
      this.recipientPhone.set(u.phone || '');
      this.recipientEmail.set(u.email);
    }
  }

  toggleCheckoutGroup(g: 'guest' | 'member') {
    this.checkoutGroup.set(g);
    if (g === 'member') {
      const u = this.ds.activeUser();
      this.recipientName.set(u.name);
      this.recipientPhone.set(u.phone || '');
      this.recipientEmail.set(u.email);
    } else {
      this.recipientName.set('');
      this.recipientPhone.set('');
      this.recipientEmail.set('');
    }
  }

  changeQty(id: string, qty: number) {
    this.ds.updateCartQty(id, qty);
  }

  setPaymentMethod(m: string) {
    this.selectedPayment.set(m);
  }

  onCouponInput(event: Event) {
    this.couponInputText.set((event.target as HTMLInputElement).value);
  }

  applyCoupon() {
    const code = this.couponInputText().trim();
    if (!code) return;
    const ok = this.ds.applyCoupon(code);
    if (!ok) {
      alert('INVALID COUPON: Coupon code not registered or did not meet minimum spent requirements.');
    }
  }

  removeCoupon() {
    this.ds.removeCoupon();
    this.couponInputText.set('');
  }

  async triggerCheckout() {
    const name = this.recipientName().trim();
    const phone = this.recipientPhone().trim();
    const email = this.recipientEmail().trim();
    const address = this.recipientAddress().trim();

    if (!name || !phone || !email || !address) {
      alert('WARNING: Kindly fill out complete recipient details and dispatch address to place order.');
      return;
    }

    try {
      const order = await this.ds.checkoutCart({
        name,
        phone,
        email,
        address,
        paymentMethod: this.selectedPayment()
      });

      // Notify user with elegant redirect
      alert(`ORDER PLACED SUCCESSFULLY!\n\nYour order number is: ${order.orderNumber}\nTransaction amount: ₹${order.grandTotal}.\n\nInvoice has been generated.`);
      
      // Programmatic routing to tracking page
      this.router.navigate(['/orders']);
    } catch {
      alert('Checkout Failed: Access Denied or Network Error. Ensure you are logged in or try again.');
    }
  }
}
