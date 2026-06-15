import {Component, computed, effect, inject, signal} from '@angular/core';
import {CommonModule, Location} from '@angular/common';
import {Router} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {MatIconModule} from '@angular/material/icon';
import {DatastoreService} from '../../services/datastore';
import {LoadingService} from '../../core/services/loading.service';
import {ToastService} from '../../shared/components/toast/toast.service';
import {HttpClient} from '@angular/common/http';
import {ApiService} from '../../services/api.service';

@Component({
  selector: 'app-checkout',
  imports: [CommonModule, MatIconModule, FormsModule],
  templateUrl: './checkout.html'
})
export class CheckoutComponent {
  router = inject(Router);
  location = inject(Location);
  ds = inject(DatastoreService);
  loading = inject(LoadingService);
  toast = inject(ToastService);
  http = inject(HttpClient);
  api = inject(ApiService);

  checkoutItems = signal<any[]>([]);

  // Customer Information
  name = signal('');
  email = signal('');
  phone = signal('');

  // Shipping Address
  accAddr1 = signal('');
  accAddr2 = signal('');
  accCity = signal('');
  accState = signal('');
  accPin = signal('');
  accCountry = signal('India');

  // Order Calculations
  subtotal = computed(() => {
    return this.checkoutItems().reduce((acc, item) => {
      const p = item.product;
      const role = this.ds.userRole();
      const pPrice = role === 'admin' || role === 'super-admin' || (this.ds.activeUser()?.rewardPoints || 0) > 300
        ? (p.dealerPrice || p.dealer_price || p.basePrice || 0)
        : (p.salePrice || p.sale_price || p.basePrice || 0);
      return acc + (pPrice * item.quantity);
    }, 0);
  });
  
  shipping = computed(() => this.subtotal() > 1000 ? 0 : 99);
  tax = computed(() => this.subtotal() * 0.18);
  discount = signal(0);
  grandTotal = computed(() => this.subtotal() + this.shipping() + this.tax() - this.discount());

  paymentMethod = signal('COD');

  constructor() {
    effect(() => {
      // Initialize with active user profile details
      const user = this.ds.activeUser();
      if (user) {
        this.name.set((user as any).firstName ? ((user as any).firstName + ' ' + ((user as any).lastName || '')) : user.name);
        this.email.set(user.email);
        if (user.phone) this.phone.set(user.phone);
      }
    }, {allowSignalWrites: true});

    const state = this.location.getState() as any;
    if (state && state.product) {
       this.checkoutItems.set([{ product: state.product, quantity: state.quantity || 1 }]);
    } else {
       // if no state, try to look at cart or redirect
       setTimeout(() => {
         if (this.checkoutItems().length === 0) {
           this.toast.error('No items to checkout. Redirecting to home.');
           this.router.navigate(['/']);
         }
       }, 500);
    }
  }

  isLoggedIn = computed(() => !!this.ds.activeUser());

  getPrice(p: any) {
    const role = this.ds.userRole();
    return role === 'admin' || role === 'super-admin' || (this.ds.activeUser()?.rewardPoints || 0) > 300
      ? (p.dealerPrice || p.dealer_price || p.basePrice || 0)
      : (p.salePrice || p.sale_price || p.basePrice || 0);
  }

  async placeOrder() {
    if (!this.isLoggedIn()) {
      this.toast.error('Please login to place an order.');
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/checkout' } });
      return;
    }

    if (!this.accAddr1() || !this.accCity() || !this.accState() || !this.accPin() || !this.name() || !this.phone()) {
      this.toast.error('Please fill all required address and contact details.');
      return;
    }

    const payload = {
      items: this.checkoutItems().map(ci => ({
        productId: ci.product.id,
        quantity: ci.quantity
      })),
      shippingAddress: {
        addressLine1: this.accAddr1(),
        addressLine2: this.accAddr2(),
        city: this.accCity(),
        state: this.accState(),
        pincode: this.accPin(),
        country: this.accCountry()
      },
      paymentMethod: this.paymentMethod()
    };

    try {
      this.loading.startLoading();
      const res = await this.api.post<any>('/orders', payload).toPromise();
      this.loading.stopLoading();
      this.toast.success('Order placed successfully!');
      this.router.navigate(['/order-success'], { state: { order: res[1] || res } });
    } catch (e: any) {
      this.loading.stopLoading();
      this.toast.error('Order placement failed: ' + (e?.error?.error || e.message));
    }
  }
}
