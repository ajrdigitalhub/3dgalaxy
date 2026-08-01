import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';

export interface AccountProduct {
  id?: string;
  productId?: string;
  name: string;
  brand?: string;
  slug?: string;
  primaryImage?: string;
  images?: (string | { url: string })[];
  salePrice?: number;
  price?: number;
  mrp?: number;
  discountPercent?: number;
  stock?: number;
  rating?: number;
  reviewCount?: number;
  isWishlisted?: boolean;
}

@Component({
  selector: 'app-account-product-card',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      class="group relative flex flex-col justify-between w-full max-w-[280px] h-[340px] sm:h-[350px] rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900/90 p-3.5 shadow-xs hover:shadow-xl hover:shadow-orange-500/5 hover:-translate-y-1 transition-all duration-150 ease-out overflow-hidden focus-within:ring-2 focus-within:ring-orange-500"
    >
      <!-- Top Action Bar (Wishlist & Remove overlay icons) -->
      <div class="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        @if (showWishlistToggle()) {
          <button
            type="button"
            (click)="onWishlistToggle.emit(product())"
            [attr.aria-label]="isWishlisted() ? 'Remove from Wishlist' : 'Add to Wishlist'"
            class="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full bg-white/90 dark:bg-neutral-800/90 backdrop-blur-md shadow-xs text-rose-500 hover:scale-110 active:scale-95 transition-all duration-150 cursor-pointer border border-neutral-100 dark:border-neutral-700"
          >
            <mat-icon class="scale-75 text-rose-500">
              {{ isWishlisted() ? 'favorite' : 'favorite_border' }}
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
            class="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full bg-white/90 dark:bg-neutral-800/90 backdrop-blur-md shadow-xs text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:scale-110 active:scale-95 transition-all duration-150 cursor-pointer border border-neutral-100 dark:border-neutral-700"
          >
            <mat-icon class="scale-75">delete_outline</mat-icon>
          </button>
        }
      </div>

      <!-- Product Image Container -->
      <a
        [routerLink]="productUrl()"
        class="block relative w-full h-[160px] rounded-xl bg-neutral-50 dark:bg-neutral-950/60 overflow-hidden group-hover:bg-neutral-100/70 dark:group-hover:bg-neutral-950/90 transition-colors duration-150"
      >
        <img
          [src]="imageUrl()"
          [alt]="product().name"
          loading="lazy"
          class="w-full h-full object-contain p-2 transform group-hover:scale-105 transition-transform duration-150 ease-out"
        />
      </a>

      <!-- Product Meta & Info Block -->
      <div class="flex flex-col gap-1.5 mt-2 flex-1 justify-between">
        <div>
          <!-- Rating Block -->
          <div class="flex items-center gap-1.5 text-[11px] font-bold text-neutral-600 dark:text-neutral-300">
            <div class="flex items-center text-amber-400">
              <mat-icon class="scale-75 -ml-1 text-[16px] w-4 h-4 flex items-center justify-center">star</mat-icon>
              <span class="text-neutral-800 dark:text-neutral-200 ml-0.5 font-extrabold">{{ rating() }}</span>
            </div>
            <span class="text-neutral-400 dark:text-neutral-500 text-[10px]">({{ reviewCount() }})</span>
          </div>

          <!-- Product Title (Max 2 lines) -->
          <h3 class="mt-1 text-xs font-bold text-neutral-900 dark:text-white line-clamp-2 leading-snug group-hover:text-orange-500 transition-colors duration-150" [title]="product().name">
            <a [routerLink]="productUrl()" class="hover:underline">
              {{ product().name }}
            </a>
          </h3>

          <!-- Brand -->
          <p class="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mt-0.5 truncate">
            {{ brandName() }}
          </p>
        </div>

        <!-- Pricing & Stock Row -->
        <div class="space-y-1 pt-1 border-t border-neutral-100 dark:border-neutral-800/80">
          <div class="flex items-baseline gap-1.5 flex-wrap">
            <span class="text-sm font-black text-neutral-950 dark:text-white font-mono">
              ₹{{ formattedSalePrice() }}
            </span>
            @if (hasMrpDiscount()) {
              <span class="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 line-through font-mono">
                ₹{{ formattedMrp() }}
              </span>
              <span class="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20 px-1.5 py-0.5 rounded-md">
                {{ discountPercentage() }}% OFF
              </span>
            }
          </div>

          <!-- Stock Chip -->
          <div class="flex items-center justify-between">
            <span
              [ngClass]="stockBadgeClass()"
              class="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider"
            >
              {{ stockStatusText() }}
            </span>
          </div>
        </div>

        <!-- Compact Action Button -->
        @if (hasVariants()) {
          <a
            [routerLink]="productUrl()"
            class="w-full h-8 mt-1 rounded-xl bg-neutral-900 dark:bg-neutral-800 hover:bg-orange-600 active:scale-[0.98] text-white text-xs font-extrabold uppercase tracking-wider shadow-sm hover:shadow-md flex items-center justify-center gap-1.5 transition-all duration-150 no-underline"
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
            class="w-full h-8 mt-1 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white text-xs font-extrabold uppercase tracking-wider shadow-sm hover:shadow-md shadow-orange-500/20 flex items-center justify-center gap-1.5 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-orange-500 cursor-pointer border-none"
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
  product = input.required<AccountProduct>();
  showRemove = input<boolean>(true);
  showWishlistToggle = input<boolean>(false);
  actionText = input<string>('Add to Cart');

  onAddToCart = output<AccountProduct>();
  onRemove = output<AccountProduct>();
  onWishlistToggle = output<AccountProduct>();

  imageUrl = computed(() => {
    const p = this.product();
    if (p.primaryImage) return p.primaryImage;
    if (p.images && p.images.length > 0) {
      const first = p.images[0];
      return typeof first === 'string' ? first : first.url;
    }
    return 'https://via.placeholder.com/300x300?text=No+Image';
  });

  productUrl = computed(() => {
    const p = this.product();
    const id = p.id || p.productId;
    return p.slug ? ['/product', p.slug] : ['/product', id];
  });

  brandName = computed(() => this.product().brand || '3D GALAXY');

  rating = computed(() => {
    const p = this.product() as any;
    const r = p.averageRating ?? p.rating ?? p.avgRating;
    return typeof r === 'number' && r > 0 ? r.toFixed(1) : '0.0';
  });

  reviewCount = computed(() => {
    const p = this.product() as any;
    return p.totalReviews ?? p.reviewCount ?? p.ratingCount ?? 0;
  });

  isWishlisted = computed(() => !!this.product().isWishlisted);

  salePrice = computed(() => {
    const p = this.product();
    return p.salePrice ?? p.price ?? 0;
  });

  formattedSalePrice = computed(() => this.salePrice().toLocaleString('en-IN'));

  mrp = computed(() => {
    const p = this.product();
    return p.mrp || (this.salePrice() > 0 ? Math.round(this.salePrice() * 1.25) : 0);
  });

  formattedMrp = computed(() => this.mrp().toLocaleString('en-IN'));

  hasMrpDiscount = computed(() => this.mrp() > this.salePrice());

  discountPercentage = computed(() => {
    const p = this.product();
    if (p.discountPercent) return p.discountPercent;
    if (this.hasMrpDiscount()) {
      return Math.round(((this.mrp() - this.salePrice()) / this.mrp()) * 100);
    }
    return 0;
  });

  stock = computed(() => this.product().stock ?? 10);

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
    return !!(p.variants && p.variants.length > 0);
  });
}
