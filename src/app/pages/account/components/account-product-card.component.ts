import { Component, ChangeDetectionStrategy, input, output, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { DeliveryEstimatePipe } from '../../../shared/pipes/delivery-estimate.pipe';
import { DatastoreService } from '../../../services/datastore';
import { hasProductVariants } from '../../../shared/utils/product.utils';

export interface AccountProduct {
  id?: string;
  productId?: string;
  name: string;
  brand?: any;
  brandName?: string;
  slug?: string;
  primaryImage?: string;
  thumbnail?: string;
  images?: (string | { url: string; isPrimary?: boolean })[];
  salePrice?: number;
  sale_price?: number;
  activePrice?: number;
  price?: number;
  basePrice?: number;
  mrp?: number;
  discountPercent?: number;
  stock?: number;
  rating?: number;
  avgRating?: number;
  averageRating?: number;
  calculatedRating?: number;
  reviewCount?: number;
  totalReviews?: number;
  ratingCount?: number;
  isWishlisted?: boolean;
  estimatedDeliveryDays?: number;
  variants?: any[];
  hasVariants?: boolean;
}

@Component({
  selector: 'app-account-product-card',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterModule, DeliveryEstimatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      class="group relative flex flex-col justify-between w-full h-[360px] rounded-2xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-[#161B22] p-3 shadow-xs hover:shadow-xl hover:shadow-orange-500/10 hover:border-orange-500/40 dark:hover:border-orange-500/40 hover:-translate-y-1 transition-all duration-200 ease-out overflow-hidden"
    >
      <!-- Top Action Bar (Wishlist & Remove overlay icons) -->
      <div class="absolute top-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between pointer-events-none">
        @if (showWishlistToggle()) {
          <button
            type="button"
            (click)="onWishlistToggle.emit(product())"
            [attr.aria-label]="resolvedIsWishlisted() ? 'Remove from Wishlist' : 'Add to Wishlist'"
            class="pointer-events-auto flex h-7.5 w-7.5 items-center justify-center rounded-full bg-white/95 dark:bg-neutral-900/90 backdrop-blur-md shadow-xs hover:scale-110 active:scale-95 transition-all duration-150 cursor-pointer border border-neutral-200/60 dark:border-neutral-700/60"
          >
            <mat-icon
              class="scale-75 transition-colors duration-150"
              [ngClass]="resolvedIsWishlisted() ? 'text-rose-500' : 'text-neutral-400 dark:text-neutral-300 hover:text-rose-500'"
            >
              {{ resolvedIsWishlisted() ? 'favorite' : 'favorite_border' }}
            </mat-icon>
          </button>
        } @else {
          <div></div>
        }

        @if (showRemove()) {
          <button
            type="button"
            (click)="onRemove.emit(product())"
            aria-label="Remove Product"
            class="pointer-events-auto flex h-7.5 w-7.5 items-center justify-center rounded-full bg-white/95 dark:bg-neutral-900/90 backdrop-blur-md shadow-xs text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:scale-110 active:scale-95 transition-all duration-150 cursor-pointer border border-neutral-200/60 dark:border-neutral-700/60"
          >
            <mat-icon class="scale-75">delete_outline</mat-icon>
          </button>
        }
      </div>

      <!-- Product Image Container -->
      <a
        [routerLink]="productUrl()"
        class="block relative w-full h-[155px] rounded-xl bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-100 dark:border-neutral-800/80 overflow-hidden group-hover:border-orange-500/30 transition-all duration-200"
      >
        <img
          [src]="imageUrl()"
          [alt]="product().name"
          loading="lazy"
          class="w-full h-full object-contain p-2.5 transform group-hover:scale-105 transition-transform duration-200 ease-out"
        />
        @if (hasMrpDiscount()) {
          <span class="absolute top-2 left-2 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-orange-500 text-white shadow-xs">
            {{ discountPercentage() }}% OFF
          </span>
        }
      </a>

      <!-- Product Meta & Info Block -->
      <div class="flex flex-col gap-1.5 mt-2 flex-1 justify-between">
        <div>
          <!-- Brand & Rating Row -->
          <div class="flex items-center justify-between text-[11px] gap-2">
            <span class="text-[10px] font-black uppercase tracking-wider text-orange-600 dark:text-orange-400 truncate max-w-[65%]">
              {{ brandName() }}
            </span>
            @if (hasReviews()) {
              <div class="flex items-center text-amber-500 font-extrabold text-[11px] shrink-0">
                <mat-icon class="scale-75 -mr-0.5 text-[14px] w-3.5 h-3.5 flex items-center justify-center">star</mat-icon>
                <span>{{ rating() }}</span>
                <span class="text-neutral-400 dark:text-neutral-500 text-[10px] ml-0.5">({{ reviewCount() }})</span>
              </div>
            } @else {
              <span class="text-[9px] font-bold text-neutral-400 dark:text-neutral-500 shrink-0 uppercase tracking-wider">New</span>
            }
          </div>

          <!-- Product Title (Max 2 lines, fixed height for row alignment) -->
          <h3
            class="mt-1 text-xs font-bold text-neutral-900 dark:text-white line-clamp-2 leading-snug group-hover:text-orange-500 transition-colors duration-150 h-[32px]"
            [title]="product().name"
          >
            <a [routerLink]="productUrl()" class="hover:underline">
              {{ product().name }}
            </a>
          </h3>
        </div>

        <!-- Pricing & Stock Row -->
        <div class="space-y-1 pt-1.5 border-t border-neutral-100 dark:border-neutral-800/80">
          <div class="flex items-baseline gap-1.5 flex-wrap">
            <span class="text-sm font-black text-neutral-950 dark:text-white font-mono">
              ₹{{ formattedSalePrice() }}
            </span>
            @if (hasMrpDiscount()) {
              <span class="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 line-through font-mono">
                ₹{{ formattedMrp() }}
              </span>
            }
          </div>

          <!-- Stock and Delivery -->
          <div class="flex items-center justify-between text-[10px]">
            <span
              [ngClass]="stockBadgeClass()"
              class="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider"
            >
              {{ stockStatusText() }}
            </span>
            <div class="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium flex items-center gap-1">
              <span>🚚</span>
              <strong class="text-neutral-700 dark:text-neutral-300 font-bold">
                {{ estimatedDeliveryDays() | deliveryEstimate:'mobile' }}
              </strong>
            </div>
          </div>
        </div>

        <!-- Compact Action Button -->
        @if (hasVariants()) {
          <a
            [routerLink]="productUrl()"
            class="w-full h-8 mt-1 rounded-xl bg-neutral-900 dark:bg-neutral-800 hover:bg-orange-500 dark:hover:bg-orange-500 active:scale-[0.98] text-white text-xs font-extrabold uppercase tracking-wider shadow-xs hover:shadow-md flex items-center justify-center gap-1.5 transition-all duration-150 no-underline"
          >
            <mat-icon class="scale-75 text-[16px] w-4 h-4 flex items-center justify-center">tune</mat-icon>
            <span>Select Variant</span>
          </a>
        } @else {
          <button
            type="button"
            (click)="onAddToCart.emit(product())"
            [disabled]="isOutOfStock()"
            aria-label="Add product to cart"
            class="w-full h-8 mt-1 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white text-xs font-extrabold uppercase tracking-wider shadow-xs hover:shadow-md shadow-orange-500/20 flex items-center justify-center gap-1.5 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-orange-500 cursor-pointer border-none"
          >
            <mat-icon class="scale-75 text-[16px] w-4 h-4 flex items-center justify-center">shopping_cart</mat-icon>
            <span>{{ actionButtonText() }}</span>
          </button>
        }
      </div>
    </article>
  `
})
export class AccountProductCardComponent {
  private ds = inject(DatastoreService);

  product = input.required<AccountProduct>();
  showRemove = input<boolean>(true);
  showWishlistToggle = input<boolean>(false);
  isWishlistedInput = input<boolean | undefined>(undefined, { alias: 'isWishlisted' });
  actionText = input<string>('Add to Cart');

  onAddToCart = output<AccountProduct>();
  onRemove = output<AccountProduct>();
  onWishlistToggle = output<AccountProduct>();

  imageUrl = computed(() => {
    const p = this.product() as any;
    if (!p) return 'https://via.placeholder.com/300x300?text=No+Image';
    if (p.primaryImage && typeof p.primaryImage === 'string') return p.primaryImage;
    if (p.thumbnail && typeof p.thumbnail === 'string') return p.thumbnail;
    if (p.images && Array.isArray(p.images) && p.images.length > 0) {
      const primary = p.images.find((i: any) => typeof i === 'object' && i.isPrimary) || p.images[0];
      if (typeof primary === 'string') return primary;
      if (primary && typeof primary === 'object' && primary.url) return primary.url;
    }
    return 'https://via.placeholder.com/300x300?text=No+Image';
  });

  productUrl = computed(() => {
    const p = this.product();
    const id = p.id || p.productId;
    return p.slug ? ['/product', p.slug] : ['/product', id];
  });

  brandName = computed(() => {
    const p = this.product() as any;
    if (!p) return '3D GALAXY';

    // 1. If brand is object with name
    if (typeof p.brand === 'object' && p.brand?.name) {
      return String(p.brand.name).trim();
    }
    if (typeof p.brandName === 'string' && p.brandName.trim()) {
      return p.brandName.trim();
    }

    // 2. If p.brand is string
    if (typeof p.brand === 'string' && p.brand.trim()) {
      const bStr = p.brand.trim();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bStr);
      if (!isUuid) {
        return bStr;
      }
      // If UUID, match from DatastoreService brands
      const brandsList = this.ds.brands() || [];
      const matched = brandsList.find((b: any) => b.id === bStr || b.slug === bStr);
      if (matched?.name) return matched.name;
    }

    if (p.brandId) {
      const brandsList = this.ds.brands() || [];
      const matched = brandsList.find((b: any) => b.id === p.brandId);
      if (matched?.name) return matched.name;
    }

    // 3. Infer brand from product title
    const title = (p.name || '').toLowerCase();
    const KNOWN_BRANDS = [
      { key: 'creality', name: 'Creality' },
      { key: 'bambu lab', name: 'Bambu Lab' },
      { key: 'bambulab', name: 'Bambu Lab' },
      { key: 'flashforge', name: 'Flashforge' },
      { key: 'elegoo', name: 'Elegoo' },
      { key: 'anycubic', name: 'Anycubic' },
      { key: 'phrozen', name: 'Phrozen' },
      { key: 'creatbot', name: 'CreatBot' },
      { key: 'snapmaker', name: 'Snapmaker' },
      { key: 'prusa', name: 'Prusa' },
      { key: 'kingroon', name: 'Kingroon' },
      { key: 'esun', name: 'eSUN' },
      { key: 'sunlu', name: 'SUNLU' },
      { key: 'polymaker', name: 'Polymaker' },
      { key: '3d galaxy', name: '3D Galaxy' },
    ];

    for (const b of KNOWN_BRANDS) {
      if (title.includes(b.key)) {
        return b.name;
      }
    }

    if (typeof p.category === 'object' && p.category?.name) {
      return p.category.name;
    }

    return '3D GALAXY';
  });

  rating = computed(() => {
    const p = this.product() as any;
    const r = p.averageRating ?? p.rating ?? p.avgRating ?? p.calculatedRating;
    return typeof r === 'number' && r > 0 ? r.toFixed(1) : '0.0';
  });

  reviewCount = computed(() => {
    const p = this.product() as any;
    return p.totalReviews ?? p.reviewCount ?? p.ratingCount ?? 0;
  });

  hasReviews = computed(() => Number(this.reviewCount()) > 0);

  resolvedIsWishlisted = computed(() => {
    if (this.isWishlistedInput() !== undefined) {
      return !!this.isWishlistedInput();
    }
    return !!this.product().isWishlisted;
  });

  estimatedDeliveryDays = computed(() => {
    const p = this.product();
    if (p.estimatedDeliveryDays !== undefined && p.estimatedDeliveryDays !== null) {
      return p.estimatedDeliveryDays;
    }
    const rawProd = (p as any).product;
    return rawProd?.estimatedDeliveryDays ?? 3;
  });

  salePrice = computed(() => {
    const p = this.product() as any;
    if (!p) return 0;
    const candidates = [
      p.salePrice,
      p.sale_price,
      p.activePrice,
      p.price,
      p.basePrice,
      p.variants?.[0]?.salePrice,
      p.variants?.[0]?.sale_price,
      p.variants?.[0]?.price,
      p.variants?.[0]?.basePrice,
      p.product?.salePrice,
      p.product?.sale_price,
      p.product?.activePrice,
      p.product?.price,
      p.mrp,
      p.product?.mrp
    ];

    for (const val of candidates) {
      if (val !== undefined && val !== null && val !== '') {
        const num = Number(val);
        if (!isNaN(num) && num > 0) {
          return num;
        }
      }
    }
    return 0;
  });

  formattedSalePrice = computed(() => {
    const sp = this.salePrice();
    return sp > 0 ? sp.toLocaleString('en-IN') : '0';
  });

  mrp = computed(() => {
    const p = this.product() as any;
    if (!p) return 0;
    const currentSale = this.salePrice();
    const mrpCandidates = [
      p.mrp,
      p.basePrice,
      p.variants?.[0]?.mrp,
      p.variants?.[0]?.basePrice,
      p.product?.mrp,
      p.product?.basePrice
    ];

    for (const val of mrpCandidates) {
      if (val !== undefined && val !== null && val !== '') {
        const num = Number(val);
        if (!isNaN(num) && num > currentSale) {
          return num;
        }
      }
    }
    return currentSale > 0 ? currentSale : 0;
  });

  formattedMrp = computed(() => this.mrp().toLocaleString('en-IN'));

  hasMrpDiscount = computed(() => {
    const s = this.salePrice();
    const m = this.mrp();
    return s > 0 && m > s;
  });

  discountPercentage = computed(() => {
    const p = this.product() as any;
    if (p.discountPercent && Number(p.discountPercent) > 0 && Number(p.discountPercent) < 100) {
      return Math.round(Number(p.discountPercent));
    }
    if (this.hasMrpDiscount()) {
      const disc = Math.round(((this.mrp() - this.salePrice()) / this.mrp()) * 100);
      return Math.min(Math.max(disc, 1), 99);
    }
    return 0;
  });

  stock = computed(() => {
    const p = this.product();
    if (p.stock !== undefined && p.stock !== null) {
      return Number(p.stock);
    }
    const rawProd = (p as any).product;
    if (rawProd?.stock !== undefined && rawProd?.stock !== null) {
      return Number(rawProd.stock);
    }
    return 10;
  });

  isOutOfStock = computed(() => this.stock() <= 0);

  stockStatusText = computed(() => {
    const s = this.stock();
    if (s <= 0) return 'Out of Stock';
    if (s <= 5) return 'Low Stock';
    return 'In Stock';
  });

  stockBadgeClass = computed(() => {
    const s = this.stock();
    if (s <= 0) return 'bg-rose-500/10 text-rose-600 dark:text-rose-400';
    if (s <= 5) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
    return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
  });

  actionButtonText = computed(() => this.actionText() || 'Add to Cart');

  hasVariants = computed(() => {
    const p = this.product() as any;
    return hasProductVariants(p);
  });
}
