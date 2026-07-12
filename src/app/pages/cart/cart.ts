import {Component, ChangeDetectionStrategy, inject, signal, computed, effect} from '@angular/core';
import {CommonModule} from '@angular/common';
import {RouterModule, Router} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {DatastoreService} from '../../services/datastore';
import {ToastService} from '../../shared/components/toast/toast.service';
import {SettingsService} from '../../core/services/settings.service';

@Component({
  selector: 'app-cart-checkout',
  imports: [CommonModule, RouterModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cart.html',
  styleUrl: './cart.scss'
})
export class CartCheckout {
  toastService = inject(ToastService);
  ds = inject(DatastoreService);
  router = inject(Router);
  settingsService = inject(SettingsService);

  checkoutGroup = signal<'guest' | 'member'>('guest');
  selectedPayment = signal<string>('');
  couponInputText = signal<string>('');

  // Delivery customer particulars (drafts context)
  recipientName = signal<string>('');
  recipientPhone = signal<string>('');
  recipientEmail = signal<string>('');
  recipientAddress = signal<string>('');

  // Dynamic payment gateways from admin settings (matching checkout page)
  availableGateways = signal<any[]>([]);

  // COD eligibility checks (matching checkout page)
  codError = computed(() => {
    const paySettings = this.settingsService.paymentGatewaySettings();
    const codConfig = paySettings?.paymentMethods?.cod || {};
    const globalSettings = this.settingsService.shippingSettings() || {};

    // Check if any product is not COD eligible
    const hasNonCodProduct = this.ds.resolvedCartItems().some((item: any) => item.product.codAvailable === false);
    if (hasNonCodProduct) {
      return "One or more products in your cart are not eligible for Cash on Delivery.";
    }

    // If order subtotal exceeds COD maximum limit
    const maxCodVal = globalSettings.codMaximumOrderValue !== undefined ? Number(globalSettings.codMaximumOrderValue) : 2500;
    if (this.ds.cartSubtotal() > maxCodVal) {
      return `Cash on Delivery is not available for orders above ₹${maxCodVal}.`;
    }

    return null;
  });

  isCodAllowed = computed(() => {
    return this.codError() === null;
  });

  codSurcharge = computed(() => {
    if (this.selectedPayment() !== 'COD') return 0;
    const globalSettings = this.settingsService.shippingSettings() || {};
    return globalSettings.codHandlingCharge !== undefined ? Number(globalSettings.codHandlingCharge) : 100;
  });

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

    // Dynamic gateway loading from admin settings (same as checkout page)
    effect(() => {
      const paySettings = this.settingsService.paymentGatewaySettings() || {};
      const methods = paySettings.paymentMethods || {};
      const actives: any[] = [];

      const isRazorpayEnabled = methods.razorpay?.enabled || paySettings.razorpayEnabled;
      const isCashfreeEnabled = methods.cashfree?.enabled;
      const isCodEnabled = methods.cod?.enabled || paySettings.codEnabled;

      if (isRazorpayEnabled) {
        actives.push({ gatewayCode: 'RAZORPAY', displayName: 'Razorpay', icon: 'credit_card', description: 'Cards, Netbanking, UPI' });
      }
      if (isCashfreeEnabled) {
        actives.push({ gatewayCode: 'CASHFREE', displayName: 'Cashfree', icon: 'account_balance', description: 'Cards, UPI, Wallets' });
      }
      if (isCodEnabled) {
        actives.push({ gatewayCode: 'COD', displayName: 'Cash on Delivery', icon: 'payments', description: 'Pay At Handover' });
      }

      this.availableGateways.set(actives);

      // Auto-select first available or prefer Razorpay
      if (actives.length === 1) {
        this.selectedPayment.set(actives[0].gatewayCode);
      } else if (actives.length > 0) {
        const hasRazorpay = actives.find(a => a.gatewayCode === 'RAZORPAY');
        if (hasRazorpay) {
          this.selectedPayment.set('RAZORPAY');
        } else {
          this.selectedPayment.set(actives[0].gatewayCode);
        }
      }
    }, { allowSignalWrites: true });

    // Auto-switch away from COD if not allowed
    effect(() => {
      if (this.selectedPayment() === 'COD' && !this.isCodAllowed()) {
        const online = this.availableGateways().find(g => g.gatewayCode !== 'COD');
        if (online) {
          this.selectedPayment.set(online.gatewayCode);
        }
      }
    }, { allowSignalWrites: true });
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

  changeQty(id: string, qty: number, variantId?: string) {
    this.ds.updateCartQty(id, qty, variantId);
  }

  setPaymentMethod(m: string) {
    // If selecting COD but not allowed, prevent selection
    if (m === 'COD' && !this.isCodAllowed()) {
      return;
    }
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
      this.toastService.error('INVALID COUPON: Coupon code not registered or did not meet minimum spent requirements.');
    }
  }

  removeCoupon() {
    this.ds.removeCoupon();
    this.couponInputText.set('');
  }

  proceedToCheckout() {
    const name = this.recipientName().trim();
    const phone = this.recipientPhone().trim();
    const email = this.recipientEmail().trim();
    const address = this.recipientAddress().trim();

    if (!name || !phone || !email || !address) {
      this.toastService.warning('WARNING: Kindly fill out complete recipient details and dispatch address to place order.');
      return;
    }

    // Store draft info into localStorage so checkout can restore them
    localStorage.setItem('checkout_restored_addr1', address);
    localStorage.setItem('checkout_restored_pay', this.selectedPayment());
    localStorage.setItem('guest_name', name);
    localStorage.setItem('guest_email', email);
    localStorage.setItem('guest_mobile', phone);

    this.router.navigate(['/checkout']);
  }
}
