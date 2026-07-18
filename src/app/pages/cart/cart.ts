import {Component, ChangeDetectionStrategy, inject, signal, computed, effect, OnInit} from '@angular/core';
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
export class CartCheckout implements OnInit {
  toastService = inject(ToastService);
  ds = inject(DatastoreService);
  router = inject(Router);
  settingsService = inject(SettingsService);

  couponInputText = signal<string>('');
  showOffers = signal(false);

  ngOnInit() {
    this.ds.reloadProducts(false);
  }

  accruedPoints = computed(() => {
    return Math.floor(this.ds.cartGrandTotal() / 100);
  });

  mrpSavings = computed(() => {
    return this.ds.cartMRPtotal() - this.ds.cartSubtotal();
  });

  cartTotalItems = computed(() => {
    return this.ds.cart().reduce((sum, item) => sum + item.quantity, 0);
  });

  freeShippingProgress = computed(() => {
    const threshold = this.ds.freeShippingThreshold();
    const current = this.ds.cartSubtotal();
    return Math.min(100, Math.round((current / threshold) * 100));
  });

  changeQty(id: string, qty: number, variantId?: string) {
    this.ds.updateCartQty(id, qty, variantId);
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
    this.router.navigate(['/checkout']);
  }
}
