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

  recommendedProducts = computed(() => {
    const list = this.ds.products() || [];
    const active = list.filter((p: any) => p && p.name && p.isActive !== false && p.status !== 'draft');
    if (active.length === 0) return [];
    
    // Sort featured / best sellers first
    const featured = active.filter((p: any) => p.featured || p.isFeatured);
    const standard = active.filter((p: any) => !p.featured && !p.isFeatured);
    const combined = [...featured, ...standard];
    return combined.slice(0, 12);
  });

  getProductPrice(p: any): number {
    return Number(p.salePrice || p.sale_price || p.basePrice || p.price || p.mrp || 0);
  }

  getProductMrp(p: any): number {
    return Number(p.mrp || p.basePrice || p.salePrice || 0);
  }

  getProductDiscountPercent(p: any): number {
    const price = this.getProductPrice(p);
    const mrp = this.getProductMrp(p);
    if (mrp > price && mrp > 0) {
      return Math.round(((mrp - price) / mrp) * 100);
    }
    return 0;
  }

  quickAddToCart(product: any, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.ds.addToCart(product, 1);
    this.toastService.success(`Added "${product.name}" to cart!`);
  }

  proceedToCheckout() {
    this.ds.clearBuyNowItem();
    this.router.navigate(['/checkout']);
  }
}
