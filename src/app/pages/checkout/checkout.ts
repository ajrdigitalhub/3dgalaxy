import {Component, computed, effect, inject, signal, HostListener} from '@angular/core';
import {CommonModule, Location} from '@angular/common';
import {Router} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {MatIconModule} from '@angular/material/icon';
import {DatastoreService} from '../../services/datastore';
import {LoadingService} from '../../core/services/loading.service';
import {ToastService} from '../../shared/components/toast/toast.service';
import {HttpClient} from '@angular/common/http';
import {ApiService} from '../../services/api.service';
import {AppButton} from '../../shared/components/app-button/app-button';
import {SettingsService} from '../../core/services/settings.service';

@Component({
  selector: 'app-checkout',
  imports: [CommonModule, MatIconModule, FormsModule, AppButton],
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
  settingsService = inject(SettingsService);

  isSubmitting = signal(false);
  showAuthModal = signal(false);

  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: any): string | undefined {
    if (this.isSubmitting()) {
      $event.returnValue = 'Operation is in progress. Are you sure you want to leave?';
      return 'Operation is in progress. Are you sure you want to leave?';
    }
    return undefined;
  }

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
  availableGateways = signal<any[]>([]);

  constructor() {
    effect(() => {
       const paySettings = this.settingsService.payment();
       const actives = [];
       if (paySettings?.razorpayEnabled) {
          actives.push({ gatewayCode: 'RAZORPAY', displayName: 'Razorpay', keyId: paySettings.razorpayKeyId });
       }
       if (paySettings?.codEnabled) {
          actives.push({ gatewayCode: 'COD', displayName: 'Cash on Delivery (COD)' });
       }
       this.availableGateways.set(actives);
       if (actives.length > 0) {
         this.paymentMethod.set(actives[0].gatewayCode);
       }
    }, { allowSignalWrites: true });

    effect(() => {
      // Initialize with active user profile details
      const user = this.ds.userProfile();
      if (user) {
        this.name.set((user as any).firstName ? ((user as any).firstName + ' ' + ((user as any).lastName || '')) : user.name);
        this.email.set(user.email);
        if (user.phone) this.phone.set(user.phone);
      } else {
        this.name.set('');
        this.email.set('');
        this.phone.set('');
        // Prompt for option popup if guest
        setTimeout(() => {
          if (!this.isLoggedIn()) {
            this.showAuthModal.set(true);
          }
        }, 300);
      }
    }, {allowSignalWrites: true});

    const state = this.location.getState() as any;
    if (state && state.product) {
       this.checkoutItems.set([{ product: state.product, quantity: state.quantity || 1 }]);
    } else {
        // if no state, retrieve from cart or redirect
        setTimeout(() => {
          if (this.checkoutItems().length === 0) {
            const cartItems = this.ds.cart();
            if (cartItems && cartItems.length > 0) {
              this.checkoutItems.set(cartItems);
            } else {
              this.toast.error('No items to checkout. Redirecting to home.');
              this.router.navigate(['/']);
            }
          }
        }, 500);
    }
  }

  isLoggedIn = computed(() => !!this.ds.userProfile());

  continueAsGuest() {
    this.showAuthModal.set(false);
  }

  getPrice(p: any) {
    const role = this.ds.userRole();
    return role === 'admin' || role === 'super-admin' || (this.ds.activeUser()?.rewardPoints || 0) > 300
      ? (p.dealerPrice || p.dealer_price || p.basePrice || 0)
      : (p.salePrice || p.sale_price || p.basePrice || 0);
  }

  async placeOrder() {
    if (this.isSubmitting()) {
      return;
    }

    if (!this.accAddr1() || !this.accCity() || !this.accState() || !this.accPin() || !this.name() || !this.phone() || !this.email()) {
      this.toast.error('Please fill all required address and contact details.');
      return;
    }

    const emailStr = this.email()?.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailStr)) {
      this.toast.error('Please enter a valid email address.');
      return;
    }

    this.isSubmitting.set(true);

    const payload: any = {
      items: this.checkoutItems().map(ci => ({
        productId: ci.product.id,
        quantity: ci.quantity
      })),
      shippingAddress: {
        addressLine1: this.accAddr1(),
        addressLine2: this.accAddr2() || '',
        city: this.accCity(),
        state: this.accState(),
        pincode: this.accPin(),
        country: this.accCountry() || 'India'
      },
      paymentMethod: this.paymentMethod()
    };

    if (!this.isLoggedIn()) {
      payload.customerType = 'GUEST';
      payload.guestName = this.name();
      payload.guestEmail = this.email();
      payload.guestPhone = this.phone();
      payload.guestSessionId = this.ds.guestSessionId();
    } else {
      payload.customerType = 'REGISTERED';
    }

    try {
      this.loading.startLoading();
      const res = await this.api.post<any>('/orders', payload).toPromise();
      const orderData = res[1] || res; // depending on interceptor
      
      if (this.paymentMethod() === 'RAZORPAY') {
        const rzRes = await this.http.post<any>('/api/payments/razorpay/create-order', { orderId: orderData.id }).toPromise();
        
        if (rzRes && rzRes.success) {
          const rzInfo = rzRes.data;
          const gateway = this.availableGateways().find(g => g.gatewayCode === 'RAZORPAY');
          
          const options = {
            key: gateway.keyId,
            amount: rzInfo.amount,
            currency: 'INR',
            name: this.ds.settings()?.appName || '3D Galaxy',
            description: `Order ${orderData.orderNumber}`,
            order_id: rzInfo.razorpayOrderId,
            handler: async (response: any) => {
              try {
                this.loading.startLoading();
                await this.http.post('/api/payments/razorpay/verify', {
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature
                }).toPromise();
                this.loading.stopLoading();
                this.toast.success('Payment successful!');
                this.ds.cart.set([]);
                this.router.navigate(['/order-success'], { state: { order: orderData } });
              } catch (err: any) {
                this.loading.stopLoading();
                this.toast.error('Payment verification failed.');
                this.ds.cart.set([]);
                this.router.navigate(['/order-success'], { state: { order: orderData, paymentFailed: true } });
              } finally {
                this.isSubmitting.set(false);
              }
            },
            modal: {
              ondismiss: () => {
                this.isSubmitting.set(false);
              }
            },
            prefill: {
              name: this.name(),
              email: this.email(),
              contact: this.phone()
            },
            theme: { color: this.ds.settings()?.primaryColor || '#d65108' }
          };
          
          const rzp = new (window as any).Razorpay(options);
          rzp.on('payment.failed', (response: any) => {
              this.loading.stopLoading();
              this.toast.error(response.error.description);
              this.isSubmitting.set(false);
              this.ds.cart.set([]);
              this.router.navigate(['/order-success'], { state: { order: orderData, paymentFailed: true } });
          });
          this.loading.stopLoading();
          rzp.open();
        } else {
           this.loading.stopLoading();
           this.toast.error('Razorpay initialization failed.');
           this.isSubmitting.set(false);
        }
      } else {
        this.loading.stopLoading();
        this.toast.success('Order placed successfully!');
        this.isSubmitting.set(false);
        this.ds.cart.set([]);
        this.router.navigate(['/order-success'], { state: { order: orderData } });
      }
    } catch (e: any) {
      this.loading.stopLoading();
      this.toast.error('Order placement failed: ' + (e?.error?.error || e.message));
      this.isSubmitting.set(false);
    }
  }
}
