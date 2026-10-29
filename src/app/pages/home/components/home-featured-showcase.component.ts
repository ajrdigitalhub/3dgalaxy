import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  PLATFORM_ID,
  HostListener,
  OnInit,
  OnDestroy,
} from "@angular/core";
import { isPlatformBrowser, CommonModule } from "@angular/common";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import { RouterModule, Router } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { DatastoreService, Product } from "../../../services/datastore";
import { TiltDirective } from "../../../shared/directives/tilt.directive";
import { ToastService } from "../../../shared/components/toast/toast.service";
import { AnalyticsService, mapProductToAnalyticsItem } from "../../../core/analytics";

@Component({
  selector: "app-home-featured-showcase",
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, TiltDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- FEATURED PRODUCTS SHOWCASE SECTION -->
    <section
      id="featured-showcase-section"
      (mouseenter)="isHovered.set(true)"
      (mouseleave)="isHovered.set(false)"
      class="w-[88vw] max-w-[1560px] mx-auto px-6 py-10 md:px-12 md:py-14 bg-white dark:bg-neutral-900 rounded-[24px] shadow-xl shadow-neutral-200/40 dark:shadow-none overflow-hidden relative border border-neutral-100 dark:border-neutral-800 select-none transition-colors duration-300"
    >
      <!-- Active Carousel Stage -->
      <div
        class="relative w-full min-h-[460px] md:min-h-[500px] flex items-center justify-center"
        (mousedown)="onMouseDown($event)"
        (mouseup)="onMouseUp($event)"
        (touchstart)="onTouchStart($event)"
        (touchend)="onTouchEnd($event)"
      >
        @if (featuredProducts().length === 0) {
          <!-- Shimmer Loading Stage -->
          <div class="w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div class="lg:col-span-6 flex justify-center">
              <div class="w-[80%] aspect-square bg-neutral-100 dark:bg-neutral-800 rounded-3xl animate-pulse"></div>
            </div>
            <div class="lg:col-span-6 space-y-6">
              <div class="h-6 w-32 bg-neutral-100 dark:bg-neutral-800 rounded-full animate-pulse"></div>
              <div class="h-14 w-3/4 bg-neutral-100 dark:bg-neutral-800 rounded-2xl animate-pulse"></div>
              <div class="h-20 w-full bg-neutral-100 dark:bg-neutral-800 rounded-2xl animate-pulse"></div>
              <div class="h-10 w-44 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse"></div>
            </div>
          </div>
        } @else {
          <!-- Slides Loop -->
          @for (
            product of featuredProducts();
            track product.id || product.slug || $index;
            let idx = $index
          ) {
            <div
              class="w-full transition-all duration-500 ease-out"
              [class.block]="currentSlide() === idx"
              [class.hidden]="currentSlide() !== idx"
              [class.showcase-active-slide]="currentSlide() === idx"
            >
              <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center w-full">
                <!-- IMAGE COLUMN -->
                <div
                  [class]="
                    (idx % 2 === 0
                      ? 'lg:col-span-6 lg:order-1'
                      : 'lg:col-span-6 lg:order-2') +
                    ' order-1 flex justify-center items-center overflow-hidden w-full'
                  "
                  appTilt
                  [tiltMax]="5"
                >
                  <div class="showcase-image-wrap relative max-h-[420px] lg:max-h-[520px] w-full flex justify-center items-center p-2 sm:p-4">
                    <img
                      [src]="getProductImage(product)"
                      [alt]="product.name"
                      class="max-h-[320px] sm:max-h-[400px] lg:max-h-[460px] w-auto max-w-full object-contain hover:scale-105 transition-transform duration-500 ease-out drop-shadow-2xl animate-float-slow cursor-pointer"
                      (click)="navigateToProduct(product.slug)"
                      (error)="onImageError($event)"
                    />
                  </div>
                </div>

                <!-- CONTENT COLUMN -->
                <div
                  [class]="
                    (idx % 2 === 0
                      ? 'lg:col-span-6 lg:order-2'
                      : 'lg:col-span-6 lg:order-1') +
                    ' order-2 space-y-4 md:space-y-5 text-left flex flex-col justify-center w-full px-2 lg:px-6'
                  "
                >
                  <!-- Brand Pill -->
                  <div class="showcase-brand flex items-center gap-2">
                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.25em] bg-orange-500/10 text-[#d65108] border border-orange-500/20 font-display">
                      <span class="w-1.5 h-1.5 rounded-full bg-[#d65108] animate-pulse"></span>
                      {{ product.brand || "3D GALAXY" }}
                    </span>
                    @if (isExclusiveProduct(product)) {
                      <span class="inline-flex items-center px-2.5 py-0.8 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                        Exclusive
                      </span>
                    }
                  </div>

                  <!-- Product Name -->
                  <h3
                    (click)="navigateToProduct(product.slug)"
                    class="showcase-title text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-neutral-900 dark:text-white tracking-tight leading-[1.15] font-display cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {{ product.name }}
                  </h3>

                  <!-- Tags -->
                  @if (product.tags && product.tags.length) {
                    <div class="showcase-tags flex flex-wrap gap-1.5 pt-1">
                      @for (tag of (product.tags || []).slice(0, 4); track tag) {
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700/60">
                          {{ tag }}
                        </span>
                      }
                    </div>
                  }

                  <!-- Description (Overview Page, Max 3-4 lines without images) -->
                  @if (getOverviewDescription(product); as overviewDesc) {
                    <p
                      class="showcase-desc text-xs sm:text-sm md:text-base text-neutral-600 dark:text-neutral-400 font-medium leading-relaxed max-w-xl line-clamp-3 md:line-clamp-4 select-none"
                    >
                      {{ overviewDesc }}
                    </p>
                  }

                  <!-- Pricing Block -->
                  <div class="showcase-price flex flex-wrap items-baseline gap-3 pt-2">
                    <span class="text-3xl sm:text-4xl font-black text-neutral-900 dark:text-white font-mono tracking-tight">
                      ₹{{ getSalePrice(product) | number: "1.0-0" }}
                    </span>

                    @if (getMrpPrice(product); as mrp) {
                      <span class="text-base sm:text-lg text-neutral-400 dark:text-neutral-500 line-through font-mono">
                        ₹{{ mrp | number: "1.0-0" }}
                      </span>
                      @if (getDiscountPercentage(product); as pct) {
                        <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          {{ pct }}% OFF
                        </span>
                      }
                    }
                  </div>

                  <!-- Action Buttons -->
                  <div class="showcase-actions flex flex-wrap items-center gap-3 pt-3">
                    <a
                      [routerLink]="['/product', product.slug]"
                      class="inline-flex items-center gap-2 px-6 py-3.5 bg-white dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 hover:border-neutral-900 dark:hover:border-white text-neutral-900 dark:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-xs hover:shadow-md cursor-pointer no-underline group"
                    >
                      <span>View Details</span>
                      <svg class="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          }
        }
      </div>

      <!-- Arrow Controls (Left & Right) -->
      @if (featuredProducts().length > 1) {
        <button
          (click)="prev()"
          type="button"
          class="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm border border-neutral-200/80 dark:border-neutral-700/80 text-neutral-700 dark:text-neutral-200 shadow-md hover:bg-neutral-100 dark:hover:bg-neutral-700 items-center justify-center transition-all cursor-pointer z-20 active:scale-90"
          aria-label="Previous featured product"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>

        <button
          (click)="next()"
          type="button"
          class="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm border border-neutral-200/80 dark:border-neutral-700/80 text-neutral-700 dark:text-neutral-200 shadow-md hover:bg-neutral-100 dark:hover:bg-neutral-700 items-center justify-center transition-all cursor-pointer z-20 active:scale-90"
          aria-label="Next featured product"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/>
          </svg>
        </button>
      }

      <!-- Navigation Dots & Progress Bar Indicator -->
      @if (featuredProducts().length > 1) {
        <div class="flex items-center justify-center gap-2 pt-2 z-20">
          @for (dot of featuredProducts(); track $index) {
            <button
              (click)="setSlide($index)"
              type="button"
              [class]="
                currentSlide() === $index
                  ? 'w-8 bg-[#d65108] shadow-xs shadow-orange-500/50'
                  : 'w-2 bg-neutral-300 dark:bg-neutral-700 hover:bg-neutral-400 dark:hover:bg-neutral-600'
              "
              class="h-2 rounded-full transition-all duration-300 border-none cursor-pointer p-0"
              [attr.aria-label]="'Go to slide ' + ($index + 1)"
            ></button>
          }
        </div>
      }
    </section>
  `,
  styles: [
    `
      @keyframes floatSmooth {
        0%,
        100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-8px);
        }
      }

      .animate-float-slow {
        animation: floatSmooth 5s ease-in-out infinite;
        will-change: transform;
      }

      /* Hardware Accelerated Slide Stagger Animations */
      .showcase-brand, .showcase-title, .showcase-tags, .showcase-desc, .showcase-price, .showcase-actions {
        opacity: 1;
      }
      .showcase-active-slide .showcase-brand {
        animation: showcaseSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.02s ease-out;
      }
      .showcase-active-slide .showcase-title {
        animation: showcaseSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.04s ease-out;
      }
      .showcase-active-slide .showcase-tags {
        animation: showcaseSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.06s ease-out;
      }
      .showcase-active-slide .showcase-desc {
        animation: showcaseSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.08s ease-out;
      }
      .showcase-active-slide .showcase-price {
        animation: showcaseSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.10s ease-out;
      }
      .showcase-active-slide .showcase-actions {
        animation: showcaseSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.12s ease-out;
      }
      .showcase-active-slide .showcase-image-wrap {
        animation: showcaseImageIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) ease-out;
      }

      @keyframes showcaseSlideIn {
        from {
          opacity: 0;
          transform: translateY(14px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes showcaseImageIn {
        from {
          opacity: 0;
          transform: scale(0.94) translateY(8px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }
    `,
  ],
})
export class HomeFeaturedShowcaseComponent implements OnInit, OnDestroy {
  ds = inject(DatastoreService);
  toastService = inject(ToastService);
  router = inject(Router);
  platformId = inject(PLATFORM_ID);
  analytics = inject(AnalyticsService);
  private sanitizer = inject(DomSanitizer);

  safeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html || "");
  }

  currentSlide = signal<number>(0);
  isHovered = signal<boolean>(false);
  private excerptCache = new Map<string, string>();

  // Filters catalog list for products marked as featured
  featuredProducts = computed(() => {
    // 1. Prioritize ds.featuredProducts() which contains the rich featured products
    const feat = this.ds.featuredProducts();
    if (feat.length > 0) return feat;

    // 2. Fall back to products marked as featured
    const list = this.ds.products().filter((p) => p.isFeatured || p.featured || (p as any).is_featured);
    return list.length > 0 ? list : this.ds.products().slice(0, 3);
  });

  private startX = 0;
  private autoPlayTimer: any = null;

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.ds.reloadFeaturedProducts();
      this.startAutoplay();
      document.addEventListener("visibilitychange", this.handleVisibilityChange);
    }
  }

  ngOnDestroy() {
    this.stopAutoplay();
    if (isPlatformBrowser(this.platformId)) {
      document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    }
  }

  private handleVisibilityChange = () => {
    if (document.hidden) {
      this.stopAutoplay();
    } else {
      this.startAutoplay();
    }
  };

  startAutoplay() {
    this.stopAutoplay();
    this.autoPlayTimer = setInterval(() => {
      if (!this.isHovered() && this.featuredProducts().length > 1) {
        this.next();
      }
    }, 4500); // 4.5 seconds comfortable auto-scroll delay
  }

  stopAutoplay() {
    if (this.autoPlayTimer) {
      clearInterval(this.autoPlayTimer);
      this.autoPlayTimer = null;
    }
  }

  next() {
    const total = this.featuredProducts().length;
    if (total <= 1) return;
    this.currentSlide.update((c) => (c + 1) % total);
  }

  prev() {
    const total = this.featuredProducts().length;
    if (total <= 1) return;
    this.currentSlide.update((c) => (c - 1 + total) % total);
  }

  setSlide(idx: number) {
    if (idx === this.currentSlide()) return;
    this.currentSlide.set(idx);
  }

  navigateToProduct(slug: string) {
    if (!slug) return;
    this.router.navigate(["/product", slug]);
  }

  isExclusiveProduct(product: Product): boolean {
    return !!(product.isExclusive || (product as any).is_exclusive);
  }

  /**
   * Retrieves description exclusively from the admin "Long description / Overview page" production field.
   * Strips/skips any embedded images and limits cleanly to max 3-4 lines (~260 chars).
   */
  getOverviewDescription(product: Product): string {
    if (!product) return "";
    const key = product.id || product.slug || product.name;

    // 1. Check in-memory map cache (safe for template evaluation)
    if (key && this.excerptCache.has(key)) {
      return this.excerptCache.get(key)!;
    }

    // 2. Check product's own description fields
    const raw =
      (product as any).long_description ||
      (product as any).longDescription ||
      product.description ||
      (product as any).short_description ||
      product.shortDescription ||
      "";
    if (raw && typeof raw === "string" && raw.trim().length > 0) {
      const excerpt = this.extractOverviewExcerpt(raw);
      if (excerpt) {
        if (key) this.excerptCache.set(key, excerpt);
        return excerpt;
      }
    }

    // 3. Check if datastore's featuredProducts has rich data for this item
    const featMatch = this.ds
      .featuredProducts()
      .find((p) => (product.id && p.id === product.id) || (product.slug && p.slug === product.slug));
    if (featMatch) {
      const featRaw =
        (featMatch as any).long_description ||
        (featMatch as any).longDescription ||
        featMatch.description ||
        (featMatch as any).short_description ||
        featMatch.shortDescription ||
        "";
      if (featRaw && typeof featRaw === "string" && featRaw.trim().length > 0) {
        const excerpt = this.extractOverviewExcerpt(featRaw);
        if (excerpt) {
          if (key) this.excerptCache.set(key, excerpt);
          return excerpt;
        }
      }
    }

    return "";
  }

  private extractOverviewExcerpt(html: string): string {
    if (!html || typeof html !== "string") return "";

    let cleaned = html
      // 1. Remove images, pictures, figures, svgs
      .replace(/<picture\b[^>]*>[\s\S]*?<\/picture>/gi, "")
      .replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, "")
      .replace(/<img\b[^>]*\/?>/gi, "")
      .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, "")
      .replace(/!\[.*?\]\(.*?\)/g, "")
      // 2. Remove tables, scripts, styles
      .replace(/<table\b[^>]*>[\s\S]*?<\/table>/gi, "")
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
      // 3. Replace headings or block ends with space
      .replace(/<\/(h[1-6]|p|div|li|tr)>/gi, " ")
      .replace(/<br\s*\/?>/gi, " ")
      // 4. Strip remaining HTML tags
      .replace(/<[^>]*>/g, " ")
      // 5. Unescape common HTML entities
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      // 6. Normalize whitespace
      .replace(/\s+/g, " ")
      .trim();

    if (!cleaned) return "";

    // Target ~240-280 chars (approx 3 to 4 lines of clean readable prose)
    const targetLength = 260;
    if (cleaned.length > targetLength) {
      let truncated = cleaned.slice(0, targetLength);
      const lastSpace = truncated.lastIndexOf(" ");
      if (lastSpace > targetLength * 0.75) {
        truncated = truncated.slice(0, lastSpace);
      }
      truncated = truncated.replace(/[,\s;:.-]+$/, "");
      cleaned = truncated + "...";
    }

    return cleaned;
  }

  getProductImage(product: Product): string {
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      const first = product.images[0];
      if (typeof first === "string" && first.trim()) return first;
      if (first && typeof first === "object" && first.url) return first.url;
    }
    if ((product as any).primaryImage) return (product as any).primaryImage;
    if ((product as any).image) return (product as any).image;
    return `https://picsum.photos/seed/${product.slug || product.id || "product"}/800/800`;
  }

  getSalePrice(product: Product): number {
    if (!product) return 0;
    let price = product.salePrice ?? product.sale_price ?? (product as any).base_price ?? product.basePrice ?? (product as any).price ?? product.mrp;
    if ((price === undefined || price === null || Number(price) === 0) && product.variants && product.variants.length > 0) {
      const v = product.variants[0];
      price = v.salePrice ?? v.price ?? (v as any).mrp;
    }
    return Math.max(0, Number(price) || 0);
  }

  getMrpPrice(product: Product): number | null {
    if (!product) return null;
    let mrp = (product as any).mrp ?? (product as any).base_price ?? product.basePrice;
    if ((mrp === undefined || mrp === null || Number(mrp) === 0) && product.variants && product.variants.length > 0) {
      const v = product.variants[0];
      mrp = (v as any).mrp ?? v.price;
    }
    const sale = this.getSalePrice(product);
    const mrpNum = Number(mrp) || 0;
    return mrpNum > sale ? mrpNum : null;
  }

  getDiscountPercentage(product: Product): number {
    const mrp = this.getMrpPrice(product);
    const sale = this.getSalePrice(product);
    if (!mrp || mrp <= sale) return 0;
    return Math.round(((mrp - sale) / mrp) * 100);
  }

  // Keyboard navigation
  @HostListener("window:keydown", ["$event"])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (this.isHovered() && this.featuredProducts().length > 1) {
      if (event.key === "ArrowRight") {
        this.next();
      } else if (event.key === "ArrowLeft") {
        this.prev();
      }
    }
  }

  // Touch handlers
  onTouchStart(e: TouchEvent) {
    this.startX = e.touches[0].clientX;
  }

  onTouchEnd(e: TouchEvent) {
    const endX = e.changedTouches[0].clientX;
    this.handleSwipe(this.startX, endX);
  }

  // Mouse drag handlers
  onMouseDown(e: MouseEvent) {
    this.startX = e.clientX;
  }

  onMouseUp(e: MouseEvent) {
    const endX = e.clientX;
    this.handleSwipe(this.startX, endX);
  }

  private handleSwipe(start: number, end: number) {
    const threshold = 40;
    const diff = start - end;
    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        this.next();
      } else {
        this.prev();
      }
    }
  }

  buyNow(product: Product) {
    try {
      const trackingItem = mapProductToAnalyticsItem(product, 1);
      this.analytics.trackAddToCart(trackingItem, 1);
    } catch (e) {}
    this.ds.setBuyNowItem({ product, quantity: 1 });
    this.router.navigate(["/checkout"]);
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = "https://picsum.photos/seed/placeholder/800/800";
  }
}
