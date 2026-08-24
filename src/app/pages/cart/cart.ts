import {Component, ChangeDetectionStrategy, inject, signal, computed, effect, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {RouterModule, Router} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {DatastoreService} from '../../services/datastore';
import {ToastService} from '../../shared/components/toast/toast.service';
import {SettingsService} from '../../core/services/settings.service';
import { WeightPipe } from '../../shared/pipes/weight.pipe';
import { calculateItemWeight, calculatePackageSummary, formatWeight } from '../../shared/utils/weight.utils';

import { DeliveryEstimatePipe } from '../../shared/pipes/delivery-estimate.pipe';
import { ShippingChargeSkeletonComponent } from '../../shared/components/skeleton/shipping-charge-skeleton/shipping-charge-skeleton.component';

@Component({
  selector: 'app-cart-checkout',
  imports: [CommonModule, RouterModule, MatIconModule, DeliveryEstimatePipe, ShippingChargeSkeletonComponent],
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

  packageSummary = computed(() => {
    return this.ds.cartPricingSummary().packageSummary;
  });

  getItemWeight(item: any): string {
    const res = calculateItemWeight(item);
    return res.totalGrams > 0 ? res.display : '';
  }

  calculateLineWeightDisplay(item: any): string {
    const res = calculateItemWeight(item);
    return res.display;
  }

  ngOnInit() {
    this.ds.clearBuyNowItem();
    this.ds.reloadProducts(false);
  }

  accruedPoints = computed(() => {
    return Math.floor(this.ds.cartPricingSummary().grandTotal / 100);
  });

  mrpSavings = computed(() => {
    return this.ds.cartPricingSummary().mrpSavings;
  });

  cartTotalItems = computed(() => {
    return this.ds.cartPricingSummary().totalItemUnits;
  });

  freeShippingProgress = computed(() => {
    return this.ds.cartPricingSummary().freeShippingProgressPercent;
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
    this.ds.clearBuyNowItem();
    this.router.navigate(['/checkout']);
  }
}
