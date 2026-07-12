import {ChangeDetectionStrategy, Component, computed, effect, inject, signal, HostListener} from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
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
      if (item.isFree) return acc;
      const p = item.product;
      const role = this.ds.userRole();
      let price = role === 'admin' || role === 'super-admin' || (this.ds.activeUser()?.rewardPoints || 0) > 300
        ? (p.dealerPrice || p.dealer_price || p.basePrice || 0)
        : (p.salePrice || p.sale_price || p.basePrice || 0);
      if (item.variant) {
        price = item.variant.salePrice || item.variant.price || price;
      }
      return acc + (price * item.quantity);
    }, 0);
  });
  
  shipping = computed(() => {
    const sub = this.subtotal();
    const globalSettings = this.settingsService.shippingSettings() || {};
    const threshold = globalSettings.freeShippingMinSpent !== undefined 
      ? Number(globalSettings.freeShippingMinSpent) 
      : (globalSettings.freeShippingThreshold !== undefined ? Number(globalSettings.freeShippingThreshold) : 3000);
    
    if (sub >= threshold) return 0;
    
    const productShipping = this.checkoutItems().reduce((sum, item) => {
      if (item.isFree) return sum;
      return sum + (item.product.baseShippingCharge ? Number(item.product.baseShippingCharge) : 0);
    }, 0);

    const baseRate = globalSettings.fixedCourierRate !== undefined ? Number(globalSettings.fixedCourierRate) : 150;
    return productShipping > 0 ? productShipping : baseRate;
  });

  tax = computed(() => 0);
  discount = signal(0);
  couponCode = signal('');
  couponApplied = signal(false);
  orderNotes = signal('');
  termsAccepted = signal(false);

  // Business / GST Details
  isBusinessPurchase = signal(false);
  gstNumber = signal('');
  companyName = signal('');

  isGstValid = computed(() => {
    if (!this.isBusinessPurchase()) return true;
    const gst = this.gstNumber().trim().toUpperCase();
    const company = this.companyName().trim();
    if (!company) return false;
    // Standard Indian GSTIN Regex
    const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return regex.test(gst);
  });

  paymentMethod = signal('RAZORPAY');
  availableGateways = signal<any[]>([]);

  codSurcharge = computed(() => {
    if (this.paymentMethod() !== 'COD') return 0;
    const globalSettings = this.settingsService.shippingSettings() || {};
    return globalSettings.codHandlingCharge !== undefined ? Number(globalSettings.codHandlingCharge) : 100;
  });

  grandTotal = computed(() => this.subtotal() + this.shipping() + this.tax() + this.codSurcharge() - this.discount());

  codError = computed(() => {
    const paySettings = this.settingsService.paymentGatewaySettings();
    const codConfig = paySettings?.paymentMethods?.cod || {};
    const globalSettings = this.settingsService.shippingSettings() || {};
    
    // Scenario 2/5: Check if any product is not COD eligible
    const hasNonCodProduct = this.checkoutItems().some(item => item.product.codAvailable === false);
    if (hasNonCodProduct) {
      return "One or more products in your cart are not eligible for Cash on Delivery.";
    }
    
    // Scenario 3: If order subtotal exceeds COD maximum limit (default 2500)
    const maxCodVal = globalSettings.codMaximumOrderValue !== undefined ? Number(globalSettings.codMaximumOrderValue) : 2500;
    if (this.subtotal() > maxCodVal) {
      return `Cash on Delivery is not available for orders above ₹${maxCodVal}.`;
    }
    
    // PIN checks
    const pin = this.accPin()?.trim();
    if (!pin) return "Please enter a PIN code to check COD availability.";
    
    const allowed = codConfig.allowedPinCodes || [];
    const blocked = codConfig.blockedPinCodes || [];
    if (allowed.length > 0 && !allowed.includes(pin)) return "COD is not available for this PIN code.";
    if (blocked.length > 0 && blocked.includes(pin)) return "COD is not available for this PIN code.";
    
    return null;
  });

  isCodAllowed = computed(() => {
    return this.codError() === null;
  });

  // Groups checkout items: main products with their bundle sub-products nested underneath
  groupedCheckoutItems = computed(() => {
    const items = this.checkoutItems();
    const grouped: any[] = [];
    const allProds = this.ds.products();

    for (const item of items) {
      if (item.isFree) continue; // skip free items; they'll be resolved under their parent

      const p = item.product;
      let bundleSubs: any[] = [];

      // Resolve bundle sub-products from the parent product's bundleProducts field
      if (p.bundleProducts) {
        try {
          const list = typeof p.bundleProducts === 'string' ? JSON.parse(p.bundleProducts) : p.bundleProducts;
          if (Array.isArray(list)) {
            for (const bp of list) {
              const id = typeof bp === 'string' ? bp : bp.id;
              const found = allProds.find((x: any) => x.id === id);
              if (found) {
                bundleSubs.push({
                  product: found,
                  quantity: item.quantity,
                  isFree: true
                });
              }
            }
          }
        } catch (e) { /* ignore parse errors */ }
      }

      // Also pick up any isFree items already in the flat list that match this product's bundles
      if (bundleSubs.length === 0) {
        const freeItems = items.filter(i => i.isFree);
        if (freeItems.length > 0) bundleSubs = freeItems;
      }

      grouped.push({ ...item, bundleSubs });
    }

    // If there are free items but no parent claimed them (cart-based checkout), group them standalone
    // This is already handled above via the fallback
    return grouped;
  });

  isValid = computed(() => {
    const nameVal = this.name()?.trim().length > 0;
    const emailVal = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email()?.trim() || '');
    const phoneVal = /^\d{10,12}$/.test(this.phone()?.trim() || '');
    const addrVal = this.accAddr1()?.trim().length > 0;
    const stateVal = this.accState()?.trim().length > 0;
    const cityVal = this.accCity()?.trim().length > 0;
    const pinVal = /^\d{6}$/.test(this.accPin()?.trim() || '');
    const payVal = !!this.paymentMethod();
    const termsVal = this.termsAccepted();
    const gstVal = this.isGstValid();
    const codOk = this.paymentMethod() === 'COD' ? this.isCodAllowed() : true;

    return nameVal && emailVal && phoneVal && addrVal && stateVal && cityVal && pinVal && payVal && termsVal && codOk && gstVal;
  });

  constructor() {
    effect(() => {
       const paySettings = this.settingsService.paymentGatewaySettings() || {};
       const methods = paySettings.paymentMethods || {};
       const actives: any[] = [];

       const isRazorpayEnabled = methods.razorpay?.enabled || paySettings.razorpayEnabled;
       const isCashfreeEnabled = methods.cashfree?.enabled;
       const isCodEnabled = methods.cod?.enabled || paySettings.codEnabled;

       if (isRazorpayEnabled) {
          actives.push({ gatewayCode: 'RAZORPAY', displayName: 'Razorpay', keyId: methods.razorpay?.keyId || paySettings.razorpayKeyId });
       }
       if (isCashfreeEnabled) {
          actives.push({ gatewayCode: 'CASHFREE', displayName: 'Cashfree', appId: methods.cashfree?.appId });
       }
       if (isCodEnabled) {
          actives.push({ gatewayCode: 'COD', displayName: 'Cash on Delivery (COD)' });
       }

       this.availableGateways.set(actives);

       if (actives.length === 1) {
          this.paymentMethod.set(actives[0].gatewayCode);
       } else if (actives.length > 0) {
          const hasRazorpay = actives.find(a => a.gatewayCode === 'RAZORPAY');
          if (hasRazorpay) {
            this.paymentMethod.set('RAZORPAY');
          } else {
            this.paymentMethod.set(actives[0].gatewayCode);
          }
       }
    }, { allowSignalWrites: true });

    effect(() => {
       if (this.paymentMethod() === 'COD' && !this.isCodAllowed()) {
         const online = this.availableGateways().find(g => g.gatewayCode !== 'COD');
         if (online) {
           this.paymentMethod.set(online.gatewayCode);
           this.toast.warning(this.codError() || 'COD not available. Switched to online payment.');
         }
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
        this.name.set(localStorage.getItem('guest_name') || '');
        this.email.set(localStorage.getItem('guest_email') || '');
        this.phone.set(localStorage.getItem('guest_mobile') || '');
        
        // Prompt for option popup if guest (and no guest email restored)
        setTimeout(() => {
          if (!this.isLoggedIn() && !this.email().trim()) {
            this.showAuthModal.set(true);
          }
        }, 300);
      }

      // Restore checkout address fields if available
      const r1 = localStorage.getItem('checkout_restored_addr1');
      if (r1) {
        this.accAddr1.set(r1);
        this.accAddr2.set(localStorage.getItem('checkout_restored_addr2') || '');
        this.accCity.set(localStorage.getItem('checkout_restored_city') || '');
        this.accState.set(localStorage.getItem('checkout_restored_state') || '');
        this.accPin.set(localStorage.getItem('checkout_restored_pin') || '');
        const pay = localStorage.getItem('checkout_restored_pay');
        if (pay) this.paymentMethod.set(pay);

        localStorage.removeItem('checkout_restored_addr1');
        localStorage.removeItem('checkout_restored_addr2');
        localStorage.removeItem('checkout_restored_city');
        localStorage.removeItem('checkout_restored_state');
        localStorage.removeItem('checkout_restored_pin');
        localStorage.removeItem('checkout_restored_pay');
      }
    }, {allowSignalWrites: true});

    const state = this.location.getState() as any;
    if (state && state.product) {
       const mainItem = { product: state.product, variant: state.variant, quantity: state.quantity || 1 };
       this.checkoutItems.set([mainItem]);
       
       effect(() => {
         const allProds = this.ds.products();
         if (allProds.length > 0) {
           const p = state.product;
           if (p.bundleProducts) {
             try {
               const list = typeof p.bundleProducts === 'string' ? JSON.parse(p.bundleProducts) : p.bundleProducts;
               if (Array.isArray(list)) {
                 const newItems = [mainItem];
                 list.forEach((item: any) => {
                   const id = typeof item === 'string' ? item : item.id;
                   const bundleProduct = allProds.find(x => x.id === id);
                   if (bundleProduct) {
                     newItems.push({
                       product: bundleProduct,
                       variant: undefined,
                       quantity: mainItem.quantity,
                       isFree: true
                     } as any);
                   }
                 });
                 this.checkoutItems.set(newItems);
               }
             } catch(e) {
               console.error("Error parsing bundle products on checkout:", e);
             }
           }
         }
       }, { allowSignalWrites: true });
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

    effect((onCleanup) => {
      if (typeof window === 'undefined') return;
      
      // Setup initial checkout tracking log once checkout items are hydrated
      if (this.checkoutItems().length > 0) {
        this.startCheckoutLog();
      }

      const timer = setInterval(() => {
        this.sendHeartbeat();
      }, 15000);
      
      onCleanup(() => {
        clearInterval(timer);
      });
    });
  }

  isLoggedIn = computed(() => !!this.ds.userProfile());

  continueAsGuest() {
    this.showAuthModal.set(false);
  }

  getPrice(item: any) {
    const p = item.product || item;
    const variant = item.variant;
    const role = this.ds.userRole();
    let price = role === 'admin' || role === 'super-admin' || (this.ds.activeUser()?.rewardPoints || 0) > 300
      ? (p.dealerPrice || p.dealer_price || p.basePrice || 0)
      : (p.salePrice || p.sale_price || p.basePrice || 0);
    if (variant) {
      price = variant.salePrice || variant.price || price;
    }
    return price;
  }

  applyCoupon() {
    const code = this.couponCode().trim().toUpperCase();
    if (code === 'GALAXY10' || code === 'DEALER10') {
      this.discount.set(this.subtotal() * 0.10);
      this.couponApplied.set(true);
      this.toast.success('Coupon applied successfully! 10% discount added.');
    } else {
      this.toast.error('Invalid coupon code.');
    }
  }

  async placeOrder() {
    if (this.isSubmitting() || !this.isValid()) {
      return;
    }

    this.isSubmitting.set(true);
    this.sendHeartbeat('PAYMENT_INITIATED');

    const payload: any = {
      items: this.checkoutItems().map(ci => ({
        productId: ci.product.id,
        variantId: ci.variant?.id || null,
        quantity: ci.quantity,
        isFree: !!ci.isFree
      })),
      shippingAddress: {
        addressLine1: this.accAddr1(),
        addressLine2: this.accAddr2() || '',
        city: this.accCity(),
        state: this.accState(),
        pincode: this.accPin(),
        country: this.accCountry() || 'India'
      },
      paymentMethod: this.paymentMethod(),
      orderNotes: this.orderNotes(),
      giftWrap: false,
      gstNumber: this.isBusinessPurchase() ? this.gstNumber().trim().toUpperCase() : null,
      companyName: this.isBusinessPurchase() ? this.companyName().trim() : null
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
      const orderData = res[1] || res;

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
                this.sendHeartbeat('COMPLETED');
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
      } else if (this.paymentMethod() === 'CASHFREE') {
        const cfRes = await this.http.post<any>('/api/payments/cashfree/create-order', { orderId: orderData.id }).toPromise();
        
        if (cfRes && cfRes.success) {
          const cfInfo = cfRes.data;
          const isSandbox = this.settingsService.paymentGatewaySettings()?.paymentMethods?.cashfree?.sandbox !== false;
          
          const cashfree = new (window as any).Cashfree({ mode: isSandbox ? 'sandbox' : 'production' });
          this.loading.stopLoading();
          this.sendHeartbeat('COMPLETED');
          cashfree.checkout({
            paymentSessionId: cfInfo.paymentSessionId,
            returnUrl: `${window.location.origin}/order-success?order_id=${orderData.id}`,
          });
        } else {
          this.loading.stopLoading();
          this.toast.error('Cashfree initialization failed.');
          this.isSubmitting.set(false);
        }
      } else if (this.paymentMethod() === 'COD') {
        await this.http.post('/api/payments/cod/create-order', { orderId: orderData.id }).toPromise();
        this.loading.stopLoading();
        this.toast.success('Order placed successfully!');
        this.sendHeartbeat('COMPLETED');
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

  startCheckoutLog() {
    const items = this.checkoutItems().map(i => ({
      productId: i.product.id,
      productName: i.product.name,
      slug: i.product.slug,
      quantity: i.quantity,
      price: i.variant?.price || i.product.sale_price,
      variantName: i.variant?.name || null
    }));

    const browserInfo = this.ds.getBrowserInfo();

    this.api.post('/checkout/start', {
      sessionId: this.ds.getSessionId(),
      cartItems: items,
      cartTotal: this.grandTotal(),
      shippingCharge: this.shipping(),
      tax: this.tax(),
      discount: this.discount(),
      customerId: this.ds.userProfile()?.id || null,
      guestId: !this.isLoggedIn() ? this.ds.getGuestId() : null,
      email: this.email().trim() || null,
      mobile: this.phone().trim() || null,
      customerName: this.name().trim() || null,
      checkoutData: {
        addressLine1: this.accAddr1(),
        addressLine2: this.accAddr2(),
        city: this.accCity(),
        state: this.accState(),
        pincode: this.accPin(),
        country: this.accCountry(),
        paymentMethod: this.paymentMethod()
      },
      browser: browserInfo.browser,
      device: browserInfo.device,
      ipAddress: '127.0.0.1'
    }).subscribe({
      error: (err) => console.warn('Checkout start logging failed:', err)
    });
  }

  sendHeartbeat(step?: string) {
    const checkoutData = {
      addressLine1: this.accAddr1(),
      addressLine2: this.accAddr2(),
      city: this.accCity(),
      state: this.accState(),
      pincode: this.accPin(),
      country: this.accCountry(),
      paymentMethod: this.paymentMethod()
    };

    this.api.post('/checkout/heartbeat', {
      sessionId: this.ds.getSessionId(),
      checkoutStep: step || this.getCurrentStep(),
      checkoutData,
      email: this.email().trim() || null,
      mobile: this.phone().trim() || null,
      customerName: this.name().trim() || null
    }).subscribe({
      error: (err) => console.warn('Heartbeat logging failed:', err)
    });
  }

  getCurrentStep(): string {
    if (this.isSubmitting()) return 'PAYMENT_INITIATED';
    if (this.accAddr1().trim() && this.accPin().trim()) return 'SHIPPING_ENTERED';
    if (this.name().trim() || this.email().trim()) return 'DETAILS_ENTERED';
    return 'STARTED';
  }
}
