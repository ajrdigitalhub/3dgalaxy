import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  effect,
  ElementRef,
  viewChild,
  PLATFORM_ID,
  HostListener,
  OnInit,
} from "@angular/core";
import { isPlatformBrowser, CommonModule } from "@angular/common";
import { RouterModule, Router } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { DatastoreService, Product } from "../../../services/datastore";
import { animate } from "motion";
import { TiltDirective } from "../../../shared/directives/tilt.directive";
import { ToastService } from "../../../shared/components/toast/toast.service";

@Component({
  selector: "app-home-featured-showcase",
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, TiltDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- FEATURED PRODUCTS SHOWCASE SECTION (Minimal White Card Stage) -->
    <section
      #showcaseContainer
      id="featured-showcase-section"
      (mouseenter)="isHovered.set(true)"
      (mouseleave)="isHovered.set(false)"
      class="w-[85vw] max-w-[1600px] mx-auto px-6 py-12 md:px-12 md:py-16 bg-white dark:bg-neutral-900 rounded-[20px] shadow-2xl shadow-neutral-200/50 dark:shadow-none space-y-10 overflow-hidden relative border border-neutral-100 dark:border-neutral-800 animate-fadeIn select-none"
    >
      <!-- Active Carousel Slide -->
      <div
        class="relative w-full min-h-[500px] flex items-center justify-center"
        (mousedown)="onMouseDown($event)"
        (mousemove)="onMouseMove($event)"
        (mouseup)="onMouseUp()"
        (touchstart)="onTouchStart($event)"
        (touchend)="onTouchEnd($event)"
      >
        @if (featuredProducts().length === 0) {
          <!-- Shimmer Loading Stage -->
          <div
            class="w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center"
          >
            <div class="lg:col-span-6 flex justify-center">
              <div
                class="w-[80%] aspect-square bg-neutral-100 dark:bg-neutral-800 rounded-3xl animate-pulse"
              ></div>
            </div>
            <div class="lg:col-span-6 space-y-6">
              <div
                class="h-6 w-32 bg-neutral-100 dark:bg-neutral-800 rounded-full animate-pulse"
              ></div>
              <div
                class="h-16 w-3/4 bg-neutral-100 dark:bg-neutral-800 rounded-2xl animate-pulse"
              ></div>
              <div
                class="h-24 w-full bg-neutral-100 dark:bg-neutral-800 rounded-2xl animate-pulse"
              ></div>
              <div
                class="h-12 w-40 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse"
              ></div>
            </div>
          </div>
        } @else {
          <!-- Slides Loop -->
          @for (
            product of featuredProducts();
            track product.id || $index;
            let idx = $index
          ) {
            <div
              [class]="
                currentSlide() === idx
                  ? 'opacity-100 block relative z-10 w-full'
                  : 'opacity-0 hidden absolute inset-0 pointer-events-none z-0'
              "
              class="transition-opacity duration-700 ease-in-out w-full"
            >
              <div
                class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center w-full"
              >
                <!-- IMAGE COLUMN (order-1 stacks first on mobile/tablet) -->
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
                  <div
                    class="relative max-h-[450px] lg:max-h-[550px] w-full flex justify-center items-center p-4"
                  >
                    <img
                      [src]="
                        product.images[0] ||
                        'https://picsum.photos/seed/' +
                          product.slug +
                          '/800/800'
                      "
                      [alt]="product.name"
                      class="max-h-[380px] lg:max-h-[500px] w-auto object-contain hover:scale-105 transition-transform duration-700 ease-out drop-shadow-2xl animate-float-slow gpu-accelerated cursor-pointer"
                      (click)="navigateToProduct(product.slug)"
                      (error)="onImageError($event)"
                    />
                  </div>
                </div>

                <!-- CONTENT COLUMN (order-2 stacks second on mobile/tablet) -->
                <div
                  [class]="
                    (idx % 2 === 0
                      ? 'lg:col-span-6 lg:order-2'
                      : 'lg:col-span-6 lg:order-1') +
                    ' order-2 space-y-6 text-left flex flex-col justify-center w-full px-2 lg:px-8'
                  "
                >
                  <span
                    class="showcase-anim text-xs font-black uppercase tracking-[0.3em] text-[#d65108] font-display block select-none"
                  >
                    {{ product.brand || "3D GALAXY" }}
                  </span>
                  <h3
                    class="showcase-anim text-3xl md:text-4xl lg:text-5xl font-black text-neutral-900 dark:text-white tracking-tighter leading-tight font-display select-none"
                  >
                    {{ product.name }}
                  </h3>
                  @if (product.tags.length) {
                    <div class="showcase-anim flex flex-wrap gap-2 mt-4">
                      @for (tag of product.tags.slice(0, 4); track tag) {
                        <span
                          class="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-200"
                        >
                          {{ tag }}
                        </span>
                      }
                    </div>
                  }
                  <p
                    class="showcase-anim text-sm md:text-base text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed max-w-xl select-none line-clamp-4 mt-4"
                    [innerHTML]="product.description || product.shortDescription"
                  ></p>

                  <div
                    class="showcase-anim flex items-baseline gap-3 select-none"
                  >
                    @if (
                      product.sale_price || product.salePrice;
                      as salePrice
                    ) {
                      <span
                        class="text-3xl font-black text-neutral-900 dark:text-white font-mono"
                      >
                        ₹{{ salePrice | number: "1.0-0" }}
                      </span>
                      @if (product.mrp && product.mrp > salePrice) {
                        <span
                          class="text-lg text-neutral-400 line-through font-mono"
                        >
                          ₹{{ product.mrp | number: "1.0-0" }}
                        </span>
                      }
                    } @else {
                      <span
                        class="text-3xl font-black text-neutral-900 dark:text-white font-mono"
                      >
                        ₹{{ product.mrp | number: "1.0-0" }}
                      </span>
                    }
                  </div>

                  <div class="showcase-anim flex items-center gap-4 pt-4">
                    <button
                      (click)="buyNow(product)"
                      class="px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-blue-500/20 active:scale-95 flex items-center gap-2 border-none"
                    >
                      <mat-icon class="scale-90">shopping_cart</mat-icon>
                      Buy Now
                    </button>
                    <a
                      [routerLink]="['/product', product.slug]"
                      class="px-6 py-3.5 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2"
                    >
                      <span>View Details</span>
                      <mat-icon class="scale-75">arrow_forward</mat-icon>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          }
        }
      </div>

      <!-- Navigation Dots -->
      @if (featuredProducts().length > 1) {
        <div
          class="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20"
        >
          @for (dot of featuredProducts(); track $index) {
            <button
              (click)="setSlide($index)"
              [class]="
                currentSlide() === $index
                  ? 'w-8 bg-blue-600'
                  : 'w-2 bg-neutral-300 dark:bg-neutral-700 hover:bg-neutral-400'
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
      @keyframes float {
        0%,
        100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-10px);
        }
      }
      .animate-float-slow {
        animation: float 6s ease-in-out infinite;
      }
    `,
  ],
})
export class HomeFeaturedShowcaseComponent implements OnInit {
  ds = inject(DatastoreService);
  toastService = inject(ToastService);
  router = inject(Router);
  platformId = inject(PLATFORM_ID);

  showcaseContainer = viewChild<ElementRef>("showcaseContainer");

  currentSlide = signal<number>(0);
  isHovered = signal<boolean>(false);

  // Filters catalog list for products marked as featured
  featuredProducts = computed(() => {
    const list = this.ds.products().filter((p) => p.isFeatured || p.featured);
    // Dynamic fallback so showcase isn't empty
    return list.length > 0 ? list : this.ds.products().slice(0, 3);
  });

  private startX = 0;
  private autoPlayTimer: any;

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.startAutoplay();
    }
  }

  startAutoplay() {
    this.stopAutoplay();
    this.autoPlayTimer = setInterval(() => {
      if (!this.isHovered() && this.featuredProducts().length > 1) {
        this.next();
      }
    }, 2000); // 2 seconds auto-scroll delay
  }

  stopAutoplay() {
    if (this.autoPlayTimer) {
      clearInterval(this.autoPlayTimer);
    }
  }

  next() {
    const total = this.featuredProducts().length;
    if (total <= 1) return;
    this.currentSlide.update((c) => (c + 1) % total);
    this.animateSlide("next");
  }

  prev() {
    const total = this.featuredProducts().length;
    if (total <= 1) return;
    this.currentSlide.update((c) => (c - 1 + total) % total);
    this.animateSlide("prev");
  }

  setSlide(idx: number) {
    if (idx === this.currentSlide()) return;
    const dir = idx > this.currentSlide() ? "next" : "prev";
    this.currentSlide.set(idx);
    this.animateSlide(dir);
  }

  navigateToProduct(slug: string) {
    if (!slug) return;
    this.router.navigate(["/product", slug]);
  }

  private animateSlide(dir: "next" | "prev") {
    const container = this.showcaseContainer()?.nativeElement;
    if (!container) return;

    const textElements = container.querySelectorAll(".showcase-anim");
    const imageElement = container.querySelector("img.animate-float-slow");

    // Reset styles to left side (-30px for text, -50px for image) for left-to-right slide in
    animate(
      textElements,
      { opacity: 0, x: -30, filter: "blur(5px)" },
      { duration: 0 },
    );
    if (imageElement) {
      animate(
        imageElement,
        { opacity: 0, x: -50, scale: 0.95, rotate: 0 },
        { duration: 0 },
      );
    }

    // Determine motion props
    let textProps: any = {
      opacity: [0, 1],
      x: [-30, 0],
      filter: ["blur(5px)", "blur(0px)"],
    };
    let imageProps: any = { opacity: [0, 1], x: [-50, 0], scale: [0.95, 1] };

    // Animate text elements with a staggered reveal
    textElements.forEach((el: any, index: number) => {
      animate(el, textProps, {
        duration: 0.8,
        delay: index * 0.08,
        ease: [0.16, 1, 0.3, 1],
      });
    });

    // Animate large image frame with floating effect and rotation
    if (imageElement) {
      const rotateVal = dir === "next" ? [3, 0] : [-3, 0];
      animate(
        imageElement,
        {
          ...imageProps,
          rotate: rotateVal,
        },
        {
          duration: 1.0,
          ease: [0.16, 1, 0.3, 1],
        },
      );
    }
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

  onMouseMove(e: MouseEvent) {
    // Optional drag threshold logic
  }

  onMouseUp(e?: MouseEvent) {
    if (!e) return;
    const endX = e.clientX;
    this.handleSwipe(this.startX, endX);
  }

  private handleSwipe(start: number, end: number) {
    const threshold = 50;
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
    this.ds.setBuyNowItem({ product, quantity: 1 });
    this.router.navigate(["/checkout"]);
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = "https://picsum.photos/seed/placeholder/800/800";
  }
}
