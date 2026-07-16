import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  signal,
  computed,
  effect,
  PLATFORM_ID,
  HostListener,
} from "@angular/core";
import { isPlatformBrowser, CommonModule } from "@angular/common";
import { RouterModule, Router } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { MatIconModule } from "@angular/material/icon";
import { DatastoreService, Product } from "../../../services/datastore";
import { SettingsService } from "../../../core/services/settings.service";
import { ToastService } from "../../../shared/components/toast/toast.service";
import { ScrollRevealDirective } from "../../../shared/directives/scroll-reveal.directive";
import { TiltDirective } from "../../../shared/directives/tilt.directive";
import { firstValueFrom } from "rxjs";

@Component({
  selector: "app-home-featured-products",
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    ScrollRevealDirective,
    TiltDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- FEATURED PRODUCTS CAROUSEL SECTION -->
    <section
      id="products-catalog"
      (mouseenter)="isHovered.set(true)"
      (mouseleave)="isHovered.set(false)"
      class="max-w-7xl mx-auto px-6 space-y-10 text-center sm:text-left overflow-hidden animate-fadeIn"
    >
      <div
        class="flex flex-col sm:flex-row sm:items-end justify-between border-b border-neutral-200 dark:border-neutral-800 pb-5 gap-4"
        appScrollReveal="fade"
      >
        <div class="space-y-1">
          <h2
            class="text-[10px] font-black uppercase tracking-[0.4em] text-orange-600 font-display"
          >
            Precision Catalog
          </h2>
          <h3
            class="text-3xl font-black text-neutral-900 dark:text-white tracking-tighter font-display"
          >
            Featured Innovations
          </h3>
        </div>
        <div class="flex items-center gap-3 justify-center sm:justify-start">
          <button
            (click)="prev()"
            class="w-10 h-10 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300 transition-colors shadow-xs cursor-pointer border-none"
          >
            <mat-icon class="scale-90">chevron_left</mat-icon>
          </button>
          <button
            (click)="next()"
            class="w-10 h-10 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300 transition-colors shadow-xs cursor-pointer border-none"
          >
            <mat-icon class="scale-90">chevron_right</mat-icon>
          </button>
          <a
            routerLink="/products"
            class="h-11 px-5 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 text-neutral-600 dark:text-neutral-300 transition-colors"
          >
            <span>View Catalog</span>
            <mat-icon class="scale-75">category</mat-icon>
          </a>
        </div>
      </div>

      <!-- Slider Container with drag and swipe handlers -->
      <div class="relative w-full overflow-hidden pb-6">
        <div
          class="flex gap-6 select-none cursor-grab active:cursor-grabbing transition-transform"
          (mousedown)="onMouseDown($event)"
          (mousemove)="onMouseMove($event)"
          (mouseup)="onMouseUp()"
          (mouseleave)="onMouseUp()"
          (touchstart)="onTouchStart($event)"
          (touchmove)="onTouchMove($event)"
          (touchend)="onTouchEnd()"
          (transitionend)="onTransitionEnd()"
          [style.transitionDuration.ms]="isTransitioning() ? 500 : 0"
          [style.transform]="getTransform()"
        >
          @for (
            p of featuredProducts();
            track p.id + "-" + idx;
            let idx = $index
          ) {
            <div [style.width]="getCardWidth()" class="snap-start shrink-0">
              <!-- Premium Card Frame -->
              <div
                [appScrollReveal]="'slide-up'"
                [delay]="(idx % 4) * 80"
                appTilt
                [tiltMax]="8"
                class="group relative bg-white dark:bg-neutral-900/50 border border-neutral-100 dark:border-neutral-800/60 rounded-3xl hover:shadow-[0_20px_50px_rgba(214,81,8,0.12)] min-h-[350px] md:min-h-[480px] hover:border-orange-500/30 dark:hover:border-orange-500/30 transition-all duration-500 ease-out p-4 flex flex-col text-left overflow-hidden h-full"
              >
                <!-- Sparkle hover visuals -->
                <div
                  class="absolute inset-0 pointer-events-none overflow-hidden z-20"
                >
                  <div
                    class="sparkle-one opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  >
                    <svg
                      class="h-6 w-6 text-amber-500 dark:text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.9)]"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M12 0c.1 3.9 3.1 6.9 7 7-3.9.1-6.9 3.1-7 7-.1-3.9-3.1-6.9-7-7 3.9-.1 6.9-3.1 7-7z"
                      />
                    </svg>
                  </div>
                  <div
                    class="sparkle-two opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  >
                    <svg
                      class="h-5 w-5 text-cyan-500 dark:text-cyan-400 drop-shadow-[0_0_6px_rgba(6,182,212,0.9)]"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M12 0c.08 3.5 2.5 5.9 6 6-3.5.08-5.9 2.5-6 6-.08-3.5-2.5-5.9-6-6 3.5-.08 5.9-2.5 6-6z"
                      />
                    </svg>
                  </div>
                </div>

                <!-- Exclusive Badge badge -->
                @if (p.isExclusive) {
                  <div
                    class="absolute top-4 right-4 z-20 select-none pointer-events-none opacity-85 hover:opacity-100 transition-opacity"
                  >
                    <div
                      class="relative w-14 h-14 rounded-full border border-orange-500/30 bg-orange-50/90 dark:bg-orange-955/40 flex flex-col items-center justify-center p-1 text-[7px] font-black tracking-tighter text-orange-600 dark:text-orange-400 uppercase text-center leading-none"
                    >
                      <svg
                        class="absolute inset-0 w-full h-full -rotate-12"
                        viewBox="0 0 100 100"
                      >
                        <circle
                          cx="50"
                          cy="50"
                          r="46"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.2"
                          stroke-dasharray="2,2"
                        />
                      </svg>
                      <span
                        class="text-[5px] scale-90 tracking-widest font-black"
                        >EXCLUSIVE</span
                      >
                      <span
                        class="font-extrabold text-[8px] my-0.5 text-nowrap tracking-wide"
                        >{{ p.brand }}</span
                      >
                      <span class="text-[5px] scale-90 font-black"
                        >DISTRIBUTOR</span
                      >
                    </div>
                  </div>
                }

                <!-- Product Image container -->
                <div
                  class="relative aspect-square bg-neutral-50/50 dark:bg-neutral-950/20 rounded-2xl border border-neutral-100/80 dark:border-neutral-800/20 flex items-center justify-center overflow-hidden p-3 mb-4 group-hover:scale-[0.98] transition-transform duration-500 product-card-image-container"
                >
                  <div
                    class="shimmer-sweep absolute inset-0 pointer-events-none z-10"
                  ></div>

                  <!-- Main Image -->
                  <img
                    [src]="
                      (p.images && p.images[0]?.url) ||
                      (p.images && p.images[0]) ||
                      'https://via.placeholder.com/400x400?text=No+Image'
                    "
                    class="w-[85%] h-[85%] object-contain transform group-hover:scale-110 transition-transform duration-700 ease-out primary-image relative z-1"
                    alt="{{ p.name }}"
                    loading="lazy"
                  />

                  <!-- Alternate Image on Hover -->
                  @if (p.images && p.images.length > 1) {
                    <img
                      [src]="p.images[1]?.url || p.images[1]"
                      class="absolute inset-0 w-[85%] h-[85%] m-auto object-contain secondary-image z-2"
                      alt="{{ p.name }} Alternate"
                      loading="lazy"
                    />
                  }

                  <!-- Offer/Discount Badge -->
                  @if (p.mrp && p.mrp > p.activePrice) {
                    <span
                      class="absolute top-3 left-3 px-2.5 py-1 bg-orange-600 text-white text-[9px] font-black rounded-lg uppercase tracking-wider z-10 shadow-md"
                    >
                      {{ getDiscountPercent(p) }}% OFF
                    </span>
                  }

                  <!-- Wishlist Button -->
                  <button
                    (click)="$event.stopPropagation(); toggleWishlist(p.id)"
                    class="absolute top-3 right-3 h-9 w-9 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 text-white hover:text-red-500 flex items-center justify-center transition-all duration-300 active:scale-95 cursor-pointer z-30"
                  >
                    <mat-icon class="scale-90">{{
                      wishlistIds().has(p.id) ? "favorite" : "favorite_border"
                    }}</mat-icon>
                  </button>

                  <!-- Stock Status Badge -->
                  <span
                    class="absolute bottom-3 left-3 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider z-10"
                    [ngClass]="
                      p.stock > 0
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/15'
                        : 'bg-rose-500/10 text-rose-500 border border-rose-500/15'
                    "
                  >
                    {{ p.stock > 0 ? "In Stock" : "Out Of Stock" }}
                  </span>
                </div>

                <!-- Product Details -->
                <div class="flex-1 flex flex-col space-y-2 text-left">
                  <span
                    class="text-[9px] font-black uppercase tracking-[0.2em] text-orange-500"
                    >{{ p.brand }}</span
                  >
                  <a
                    [routerLink]="['/products', p.slug]"
                    class="block text-sm font-black text-neutral-800 dark:text-neutral-100 leading-snug hover:text-orange-500 min-h-[40px] line-clamp-2 transition-colors font-display"
                  >
                    {{ p.name }}
                  </a>

                  <!-- Short Description -->
                  <p
                    class="text-xs text-neutral-500 dark:text-neutral-400 font-medium line-clamp-2 min-h-[32px] leading-relaxed"
                  >
                    {{
                      p.shortDescription ||
                        p.description ||
                        "Premium quality 3D fabrication component."
                    }}
                  </p>

                  <div class="flex items-center justify-between mt-auto pt-2">
                    <div class="flex flex-col">
                      <span
                        class="text-base font-black text-neutral-900 dark:text-white"
                        >{{ p.activePrice | number: "1.0-0" }}
                        {{ currency() }}</span
                      >
                      @if (p.mrp && p.mrp > p.activePrice) {
                        <span
                          class="text-[10px] text-neutral-400 line-through font-normal"
                          >{{ p.mrp | number: "1.0-0" }} {{ currency() }}</span
                        >
                      }
                    </div>
                    <div
                      class="flex items-center gap-1 bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-md"
                    >
                      <mat-icon class="scale-75 -mr-1">star</mat-icon>
                      <span class="text-[10px] font-black">{{
                        p.calculatedRating
                      }}</span>
                    </div>
                  </div>

                  <!-- CTAs -->
                  <div class="grid grid-cols-2 gap-2 pt-2">
                    <button
                      (click)="$event.stopPropagation(); buyNow(p)"
                      [disabled]="p.stock <= 0"
                      class="h-9 bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-1 shadow-md shadow-orange-500/10 cursor-pointer disabled:opacity-50"
                    >
                      Buy Now
                    </button>
                    <a
                      [routerLink]="['/products', p.slug]"
                      class="h-9 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center backdrop-blur-xl"
                    >
                      Details
                    </a>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    </section>
  `,
})
export class HomeFeaturedProductsComponent implements OnInit {
  ds = inject(DatastoreService);
  settingsService = inject(SettingsService);
  router = inject(Router);
  http = inject(HttpClient);
  toastService = inject(ToastService);
  private platformId = inject(PLATFORM_ID);

  // Responsive Width & Carousel States
  windowWidth = signal(1200);
  currentIndex = signal(0);
  isTransitioning = signal(true);
  isHovered = signal(false);

  // Drag / Swipe States
  startX = 0;
  isDragging = signal(false);
  dragOffset = signal(0);

  wishlistIds = signal<Set<string>>(new Set());

  // Expose currency & styling values dynamically from settings
  currency = computed(() => this.settingsService.currency() || "₹");
  theme = computed(() => this.settingsService.theme() || {});

  isDealerPriceActive = computed(() => {
    const r = this.ds.userRole();
    return (
      r === "admin" ||
      r === "super-admin" ||
      (this.ds.activeUser()?.rewardPoints || 0) > 300
    );
  });

  // Calculate visible cards responsively
  visibleCards = computed(() => {
    const w = this.windowWidth();
    if (w < 640) return 1; // Mobile
    if (w < 1024) return 2; // Tablet
    if (w < 1280) return 3; // Laptop
    return 4; // Desktop
  });

  originalProductsLength = computed(() => {
    const list = this.ds.products().filter((p) => p.isFeatured || p.featured);
    return list.length > 0
      ? list.length
      : Math.min(this.ds.products().length, 8);
  });

  // Appends copies of the first cards at the end for smooth loop animation
  featuredProducts = computed(() => {
    const list = this.ds.products().filter((p) => p.isFeatured || p.featured);
    const result = list.length > 0 ? list : this.ds.products().slice(0, 8);
    const isDealer = this.isDealerPriceActive();

    const mapped = result.map((p) => {
      const price = isDealer
        ? p.dealerPrice || p.dealer_price || p.salePrice || p.sale_price
        : p.salePrice || p.sale_price || p.basePrice || p.mrp;
      let avgRating = p.avgRating;
      if (!avgRating) {
        if (!p.reviews || p.reviews.length === 0) {
          avgRating = 4.5;
        } else {
          const sum = p.reviews.reduce((acc, r) => acc + r.rating, 0);
          avgRating = Math.round((sum / p.reviews.length) * 10) / 10;
        }
      }
      return {
        ...p,
        activePrice: price,
        calculatedRating: avgRating,
      };
    });

    if (mapped.length > 0) {
      return [...mapped, ...mapped.slice(0, 4)];
    }
    return [];
  });

  @HostListener("window:resize", [])
  onResize() {
    if (isPlatformBrowser(this.platformId)) {
      this.windowWidth.set(window.innerWidth);
    }
  }

  @HostListener("window:keydown", ["$event"])
  onKeyDown(event: KeyboardEvent) {
    const activeEl = document.activeElement;
    if (
      activeEl &&
      (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")
    ) {
      return;
    }
    if (event.key === "ArrowLeft") {
      this.prev();
    } else if (event.key === "ArrowRight") {
      this.next();
    }
  }

  constructor() {
    const isBrowser = isPlatformBrowser(this.platformId);

    if (isBrowser) {
      this.windowWidth.set(window.innerWidth);
      this.loadWishlist();
    }

    // Autoplay scroll timer
    effect((onCleanup) => {
      if (!isBrowser) return;

      const timer = setInterval(() => {
        if (this.isHovered() || this.isDragging()) return;
        this.next();
      }, 3000);

      onCleanup(() => clearInterval(timer));
    });
  }

  ngOnInit() {
    // Lazy load product data only when this section initializes
    this.ds.reloadProducts(false);
  }

  // --- ACTIONS ---
  buyNow(p: Product) {
    this.ds.addToCart(p, 1);
    this.router.navigate(["/checkout"]);
  }

  async loadWishlist() {
    if (this.ds.userRole() === "guest") {
      this.wishlistIds.set(new Set());
      return;
    }
    try {
      const res: any = await firstValueFrom(this.http.get("/api/wishlist"));
      if (res && res.data) {
        const ids = new Set<string>(
          res.data.map((item: any) => item.productId),
        );
        this.wishlistIds.set(ids);
      }
    } catch (e) {
      console.error("Failed to load wishlist", e);
    }
  }

  async toggleWishlist(productId: string) {
    if (this.ds.userRole() === "guest") {
      this.toastService.info("Please log in to manage your wishlist");
      this.router.navigate(["/login"]);
      return;
    }
    const current = this.wishlistIds();
    const newSet = new Set(current);
    if (current.has(productId)) {
      try {
        await firstValueFrom(this.http.delete(`/api/wishlist/${productId}`));
        newSet.delete(productId);
        this.wishlistIds.set(newSet);
        this.toastService.success("Removed from Wishlist");
      } catch (e) {
        this.toastService.error("Failed to remove from wishlist");
      }
    } else {
      try {
        await firstValueFrom(this.http.post("/api/wishlist", { productId }));
        newSet.add(productId);
        this.wishlistIds.set(newSet);
        this.toastService.success("Added to Wishlist");
      } catch (e) {
        this.toastService.error("Failed to add to wishlist");
      }
    }
  }

  getDiscountPercent(p: any): number {
    if (!p.mrp || !p.activePrice || p.mrp <= p.activePrice) return 0;
    return Math.round(((p.mrp - p.activePrice) / p.mrp) * 100);
  }

  // --- CAROUSEL CALCULATION HELPERS ---
  getTransform() {
    const idx = this.currentIndex();
    const vis = this.visibleCards();
    const drag = this.dragOffset();
    return `translate3d(calc(-${idx} * (100% + 24px) / ${vis} + ${drag}px), 0, 0)`;
  }

  getCardWidth() {
    const vis = this.visibleCards();
    return `calc((100% - (24px * ${vis - 1})) / ${vis})`;
  }

  next() {
    const n = this.originalProductsLength();
    if (n === 0) return;
    this.isTransitioning.set(true);
    this.currentIndex.update((idx) => idx + 1);
  }

  prev() {
    const n = this.originalProductsLength();
    if (n === 0) return;
    this.isTransitioning.set(true);
    this.currentIndex.update((idx) => {
      if (idx === 0) {
        this.isTransitioning.set(false);
        this.currentIndex.set(n);
        setTimeout(() => {
          this.isTransitioning.set(true);
          this.currentIndex.set(n - 1);
        }, 20);
        return n;
      }
      return idx - 1;
    });
  }

  onTransitionEnd() {
    const n = this.originalProductsLength();
    if (this.currentIndex() >= n) {
      this.isTransitioning.set(false);
      this.currentIndex.set(0);
    }
  }

  // --- MANUAL DRAGGING AND SWIPING ---
  dragStart(clientX: number) {
    this.isHovered.set(true);
    this.startX = clientX;
    this.isDragging.set(true);
    this.isTransitioning.set(false);
  }

  dragMove(clientX: number) {
    if (!this.isDragging()) return;
    const diff = clientX - this.startX;
    this.dragOffset.set(diff);
  }

  dragEnd() {
    if (!this.isDragging()) return;
    this.isDragging.set(false);
    const diff = this.dragOffset();
    this.dragOffset.set(0);

    if (Math.abs(diff) > 80) {
      if (diff > 0) {
        this.prev();
      } else {
        this.next();
      }
    } else {
      this.isTransitioning.set(true);
    }
  }

  onMouseDown(event: MouseEvent) {
    this.dragStart(event.clientX);
  }

  onMouseMove(event: MouseEvent) {
    this.dragMove(event.clientX);
  }

  onMouseUp() {
    this.dragEnd();
  }

  onTouchStart(event: TouchEvent) {
    this.dragStart(event.touches[0].clientX);
  }

  onTouchMove(event: TouchEvent) {
    this.dragMove(event.touches[0].clientX);
  }

  onTouchEnd() {
    this.dragEnd();
  }
}
