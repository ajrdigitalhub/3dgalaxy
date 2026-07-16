import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  effect,
  PLATFORM_ID,
  HostListener,
} from "@angular/core";
import { isPlatformBrowser, CommonModule } from "@angular/common";
import { DomSanitizer } from "@angular/platform-browser";
import { RouterModule } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { DatastoreService } from "../../../services/datastore";
import { SettingsService } from "../../../core/services/settings.service";
import { TiltDirective } from "../../../shared/directives/tilt.directive";

@Component({
  selector: "app-home-hero",
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, TiltDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- HERO: PREMIUM IMMERSIVE SHOWCASE STAGE -->
    <section
      id="hero-section"
      (mouseenter)="isHovered.set(true)"
      (mouseleave)="isHovered.set(false)"
      class="relative min-h-[65vh] lg:min-h-[80vh] w-full overflow-hidden flex items-center border-b border-neutral-900/40 select-none transition-colors duration-1000"
      style="touch-action: pan-y;"
    >
      <!-- Active Carousel Slide -->
      <div class="relative w-full h-full flex items-center">
        @if (heroSlides().length === 0) {
          <!-- Shimmer Loading Stage -->
          <div
            class="w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-20 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center"
          >
            <div class="lg:col-span-6 flex justify-center">
              <div
                class="w-[80%] aspect-square bg-white/5 dark:bg-neutral-900/40 rounded-[3rem] animate-pulse"
              ></div>
            </div>
            <div class="lg:col-span-6 space-y-6">
              <div
                class="h-6 w-32 bg-white/5 dark:bg-neutral-900/40 rounded-full animate-pulse"
              ></div>
              <div
                class="h-16 w-3/4 bg-white/5 dark:bg-neutral-900/40 rounded-2xl animate-pulse"
              ></div>
              <div
                class="h-24 w-full bg-white/5 dark:bg-neutral-900/40 rounded-2xl animate-pulse"
              ></div>
              <div
                class="h-12 w-40 bg-white/5 dark:bg-neutral-900/40 rounded-xl animate-pulse"
              ></div>
            </div>
          </div>
        } @else {
          <!-- Slides Loop -->
          @for (
            slide of heroSlides();
            track slide.id || $index;
            let idx = $index
          ) {
            <div
              [class]="
                currentSlide() === idx
                  ? 'opacity-100 block relative z-10 w-full'
                  : 'opacity-0 hidden absolute inset-0 pointer-events-none z-0'
              "
              class="transition-opacity duration-1000 ease-in-out w-full"
            >
              @if (isSlideVisible(idx)) {
                <!-- Slide Background Container -->
                <div
                  class="absolute inset-0 -z-10 overflow-hidden pointer-events-none transition-all duration-1000"
                >
                  <!-- Overlay Opacity -->
                  <div
                    class="absolute inset-0 z-10 transition-colors duration-1000"
                    [style.backgroundColor]="
                      slide.darkOverlay !== false
                        ? 'rgba(0,0,0,' + (slide.overlayOpacity ?? 0.4) + ')'
                        : 'transparent'
                    "
                  ></div>

                  <!-- Priority: Video -> Image -> Gradient -> Color -->
                  @if (slide.bgVideoUrl || slide.videoUrl) {
                    <video
                      autoplay
                      loop
                      muted
                      playsinline
                      class="absolute inset-0 w-full h-full object-cover"
                    >
                      <source
                        [src]="slide.bgVideoUrl || slide.videoUrl"
                        type="video/mp4"
                      />
                    </video>
                  } @else if (slide.bgImageUrl) {
                    <img
                      [src]="slide.bgImageUrl"
                      class="absolute inset-0 w-full h-full object-cover"
                      alt="Background"
                    />
                  } @else if (slide.bgGradient) {
                    <div
                      class="absolute inset-0 w-full h-full transition-all duration-1000"
                      [style.background]="slide.bgGradient"
                    ></div>
                  } @else {
                    <div
                      class="absolute inset-0 w-full h-full transition-all duration-1000"
                      [style.backgroundColor]="slide.bgColor || '#09090b'"
                    ></div>
                  }
                </div>

                <!-- Main Content Container -->
                <div
                  class="w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-20 py-16 lg:py-24"
                >
                  <div
                    class="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center w-full"
                  >
                    <!-- Left Side: Large Product Image with Float & Tilt -->
                    <div
                      class="lg:col-span-6 flex flex-col items-center justify-center relative w-full"
                      [ngClass]="{
                        'order-last lg:order-last':
                          slide.textAlignment === 'right',
                        'lg:order-first': slide.textAlignment !== 'right',
                      }"
                    >
                      <div
                        appTilt
                        [tiltMax]="6"
                        class="relative w-full max-w-[420px] aspect-square bg-white/5 backdrop-blur-md border border-white/10 rounded-[3.5rem] shadow-2xl flex items-center justify-center group/card transition-all duration-700 overflow-visible"
                      >
                        <!-- Soft Radial Shadow Backdrop -->
                        <div
                          class="absolute -inset-6 bg-black/40 blur-2xl rounded-[4rem] -z-10 group-hover/card:scale-105 transition-transform duration-700"
                        ></div>

                        <!-- 3D Reflection Layer -->
                        <div
                          class="absolute inset-0 bg-linear-to-tr from-white/0 via-white/5 to-white/10 rounded-[3.5rem] pointer-events-none"
                        ></div>

                        <!-- Image with zoom on hover -->
                        <div
                          class="relative w-full h-full flex items-center justify-center overflow-hidden rounded-[3.5rem] p-6"
                        >
                          <img
                            [src]="
                              isMobile() && slide.mobileImageUrl
                                ? slide.mobileImageUrl
                                : slide.imageUrl
                            "
                            loading="lazy"
                            class="max-w-[90%] max-h-[90%] object-contain transition-transform duration-700 ease-out group-hover/card:scale-105 filter drop-shadow-[0_20px_30px_rgba(0,0,0,0.5)] select-none pointer-events-none animate-float-slow"
                            [alt]="slide.title"
                          />
                        </div>

                        <!-- Reflection effect -->
                        <div
                          class="absolute bottom-6 left-1/2 -translate-x-1/2 w-[70%] h-8 bg-linear-to-t from-transparent to-white/5 blur-md rounded-full pointer-events-none"
                        ></div>
                      </div>
                    </div>

                    <!-- Right Side: Slide Meta & Actions -->
                    <div
                      class="lg:col-span-6 space-y-6 lg:space-y-8"
                      [ngClass]="{
                        'text-center lg:text-left':
                          slide.textAlignment === 'left' ||
                          !slide.textAlignment,
                        'text-center lg:text-center flex flex-col items-center':
                          slide.textAlignment === 'center',
                        'text-center lg:text-right flex flex-col items-center lg:items-end':
                          slide.textAlignment === 'right',
                      }"
                    >
                      <!-- Badge -->
                      @if (slide.badge) {
                        <div
                          class="hero-anim inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[10px] lg:text-xs font-black uppercase tracking-wider text-white shadow-xs"
                        >
                          @if (slide.badgeIcon) {
                            <mat-icon class="scale-75 text-orange-500">{{
                              slide.badgeIcon
                            }}</mat-icon>
                          }
                          <span>{{ slide.badge }}</span>
                        </div>
                      }

                      <!-- Subtitle -->
                      @if (slide.subtitle) {
                        <span
                          class="hero-anim block text-[11px] lg:text-xs font-black tracking-[0.25em] uppercase text-orange-500"
                        >
                          {{ slide.subtitle }}
                        </span>
                      }

                      <!-- Title -->
                      <h1
                        class="hero-anim text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-none tracking-tight font-display"
                      >
                        {{ slide.title }}
                      </h1>

                      <!-- Description -->
                      @if (slide.desc || slide.description) {
                        <p
                          class="hero-anim text-neutral-300 text-sm md:text-base leading-relaxed max-w-xl font-medium line-clamp-3"
                          [innerHTML]="
                            safeHtml(slide.desc || slide.description)
                          "
                        ></p>
                      }

                      <!-- Pricing Display -->
                      @if (slide.price) {
                        <div
                          class="hero-anim flex items-center gap-4"
                          [ngClass]="{
                            'justify-center lg:justify-start':
                              slide.textAlignment === 'left' ||
                              !slide.textAlignment,
                            'justify-center': slide.textAlignment === 'center',
                            'justify-center lg:justify-end':
                              slide.textAlignment === 'right',
                          }"
                        >
                          <span
                            class="text-3xl lg:text-4.5xl font-black text-white tracking-tight"
                          >
                            {{ currency() }}{{ slide.price | number }}
                          </span>
                          @if (slide.oldPrice) {
                            <span
                              class="text-lg lg:text-xl text-neutral-500 line-through font-bold"
                            >
                              {{ currency() }}{{ slide.oldPrice | number }}
                            </span>
                            @if (slide.discountText) {
                              <span
                                class="px-2.5 py-0.5 bg-orange-600/10 text-orange-500 border border-orange-500/15 text-[9px] font-black rounded-lg uppercase tracking-wider"
                              >
                                {{ slide.discountText }}
                              </span>
                            }
                          }
                        </div>
                      }

                      <!-- Product Tag -->
                      @if (slide.productTag) {
                        <div
                          class="hero-anim inline-block px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/15 text-[9px] font-black uppercase tracking-wider rounded-full"
                        >
                          {{ slide.productTag }}
                        </div>
                      }

                      <!-- CTA Buttons -->
                      <div
                        class="hero-anim flex flex-col sm:flex-row gap-4 pt-4 w-full sm:w-auto"
                        [ngClass]="{
                          'justify-center lg:justify-start':
                            slide.textAlignment === 'left' ||
                            !slide.textAlignment,
                          'justify-center': slide.textAlignment === 'center',
                          'justify-center lg:justify-end':
                            slide.textAlignment === 'right',
                        }"
                      >
                        <!-- Primary Button -->
                        @if (slide.btnText) {
                          <a
                            [routerLink]="slide.linkUrl || '/products'"
                            [style.borderRadius]="theme().borderRadius"
                            [ngClass]="{
                              'bg-orange-600 hover:bg-orange-500 text-white shadow-orange-500/20 hover:shadow-orange-500/30':
                                slide.btnTheme === 'primary' || !slide.btnTheme,
                              'bg-zinc-800 hover:bg-zinc-700 text-white shadow-zinc-850/20 hover:shadow-zinc-850/30':
                                slide.btnTheme === 'secondary',
                              'bg-white/5 hover:bg-white/10 border border-white/10 text-white backdrop-blur-md':
                                slide.btnTheme === 'accent',
                            }"
                            class="relative overflow-hidden h-14 px-10 font-black text-xs uppercase tracking-widest shadow-lg transition-all duration-300 hover:scale-105 active:scale-98 flex items-center justify-center gap-2 group/btn cursor-pointer"
                          >
                            {{ slide.btnText }}
                            <mat-icon
                              class="scale-90 transition-transform group-hover/btn:translate-x-1"
                              >shopping_cart</mat-icon
                            >
                          </a>
                        }

                        <!-- Secondary Button -->
                        @if (slide.secBtnText) {
                          <a
                            [routerLink]="slide.linkUrl || '/products'"
                            [style.borderRadius]="theme().borderRadius"
                            class="h-14 px-10 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 hover:scale-105 active:scale-98 flex items-center justify-center gap-2 backdrop-blur-xl"
                          >
                            {{ slide.secBtnText }}
                            <mat-icon class="scale-90">explore</mat-icon>
                          </a>
                        }
                      </div>
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        }
      </div>

      <!-- Arrow Controls -->
      @if (heroSlides().length > 1) {
        <button
          (click)="prevSlide()"
          class="absolute left-4 lg:left-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-neutral-900/40 hover:bg-neutral-900/75 border border-white/10 text-white hover:text-orange-500 transition-all z-20 flex items-center justify-center shadow-lg cursor-pointer"
          aria-label="Previous Slide"
        >
          <mat-icon>chevron_left</mat-icon>
        </button>
        <button
          (click)="nextSlide()"
          class="absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-neutral-900/40 hover:bg-neutral-900/75 border border-white/10 text-white hover:text-orange-500 transition-all z-20 flex items-center justify-center shadow-lg cursor-pointer"
          aria-label="Next Slide"
        >
          <mat-icon>chevron_right</mat-icon>
        </button>
      }

      <!-- Indicators Deck -->
      @if (heroSlides().length > 1) {
        <div
          class="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3.5 z-20 px-6 py-3 bg-neutral-900/50 border border-white/5 backdrop-blur-2xl rounded-2xl shadow-xl"
        >
          @for (
            slide of heroSlides();
            track slide.id || $index;
            let idx = $index
          ) {
            <button
              (click)="setSlide(idx)"
              [attr.aria-label]="'Navigate to slide ' + (idx + 1)"
              [class]="
                currentSlide() === idx
                  ? 'h-2 w-6 lg:w-8 bg-orange-500 shadow-[0_0_12px_#ea580c] rounded-full'
                  : 'h-2 w-2 bg-white/25 rounded-full hover:bg-white/50'
              "
              class="transition-all duration-500 cursor-pointer border-none"
            ></button>
          }
        </div>
      }

      <!-- Autoplay Progress Indicator -->
      @if (heroSlides().length > 1 && !isHovered()) {
        <div
          class="absolute bottom-0 left-0 h-[3px] bg-orange-500 z-30 transition-all ease-linear"
          [style.width.%]="progress()"
          [style.transition-duration.ms]="progress() === 0 ? 0 : 100"
        ></div>
      }
    </section>
  `,
})
export class HomeHeroComponent {
  ds = inject(DatastoreService);
  settingsService = inject(SettingsService);
  private platformId = inject(PLATFORM_ID);
  private sanitizer = inject(DomSanitizer);

  currentSlide = signal(0);
  isHovered = signal(false);
  progress = signal(0);
  isMobile = signal(false);

  // Expose currency & styling values dynamically from settings
  currency = computed(() => this.settingsService.currency() || "₹");
  theme = computed(() => this.settingsService.theme() || {});

  // Load slides directly from settings
  heroSlides = computed(() => {
    const list = this.settingsService.getHeroSlides() || [];
    // Sort by slideOrder and filter out inactive ones
    const activeSlides = list
      .filter((s: any) => s.active !== false)
      .sort(
        (a: any, b: any) =>
          (Number(a.slideOrder) || 0) - (Number(b.slideOrder) || 0),
      );

    if (activeSlides.length === 0) {
      // Return a premium default slide if none is configured
      return [
        {
          id: "default-1",
          title: "A1 Combo 3D Printer",
          subtitle: "Bambu Lab",
          badge: "Top Choice",
          badgeIcon: "bolt",
          btnText: "Buy Now",
          secBtnText: "View Details",
          linkUrl: "/products/bambu-lab-a1-combo",
          desc: "Seamless multi-color printing at an accessible price point, complete with fully automated alignment and calibration sensors.",
          imageUrl:
            "https://store.bambulab.com/cdn/shop/files/A1_Combo_600x600.png",
          price: "48999",
          oldPrice: "55000",
          discountText: "11% OFF",
          productTag: "New In Store",
          animationType: "fade",
          overlayOpacity: 0.4,
          textAlignment: "left",
          darkOverlay: true,
          btnTheme: "primary",
          slideDuration: 3000,
        },
      ];
    }
    return activeSlides;
  });

  @HostListener("window:resize", [])
  onResize() {
    if (isPlatformBrowser(this.platformId)) {
      this.isMobile.set(window.innerWidth < 768);
    }
  }

  isSlideVisible(index: number): boolean {
    const current = this.currentSlide();
    const total = this.heroSlides().length;
    if (total <= 1) return true;

    const prev = (current - 1 + total) % total;
    const next = (current + 1) % total;

    return index === current || index === prev || index === next;
  }

  constructor() {
    const isBrowser = isPlatformBrowser(this.platformId);

    if (isBrowser) {
      this.isMobile.set(window.innerWidth < 768);
    }

    // Autoplay ticks progress timer
    effect((onCleanup) => {
      if (!isBrowser) return;

      const slides = this.heroSlides();
      if (slides.length <= 1) {
        this.progress.set(0);
        return;
      }

      const activeSlide = slides[this.currentSlide()];
      const duration = Number(activeSlide?.slideDuration) || 3000;
      const tickStep = 100;
      const increment = (tickStep / duration) * 100;

      const timer = setInterval(() => {
        if (this.isHovered()) return;

        this.progress.update((p) => {
          if (p >= 100) {
            this.nextSlide();
            return 0;
          }
          return p + increment;
        });
      }, tickStep);

      onCleanup(() => clearInterval(timer));
    });
  }

  // --- SWIPE GESTURES ---
  private touchStartX = 0;

  @HostListener("touchstart", ["$event"])
  onTouchStart(event: TouchEvent) {
    this.touchStartX = event.touches[0].clientX;
  }

  @HostListener("touchend", ["$event"])
  onTouchEnd(event: TouchEvent) {
    const diffX = event.changedTouches[0].clientX - this.touchStartX;
    if (Math.abs(diffX) > 60) {
      if (diffX > 0) {
        this.prevSlide();
      } else {
        this.nextSlide();
      }
    }
  }

  // --- KEYBOARD NAVIGATION ---
  @HostListener("window:keydown", ["$event"])
  onKeyDown(event: KeyboardEvent) {
    if (event.key === "ArrowLeft") {
      this.prevSlide();
    } else if (event.key === "ArrowRight") {
      this.nextSlide();
    }
  }

  nextSlide() {
    const total = this.heroSlides().length;
    if (total === 0) return;
    this.currentSlide.update((c) => (c + 1) % total);
    this.progress.set(0);
  }

  prevSlide() {
    const total = this.heroSlides().length;
    if (total === 0) return;
    this.currentSlide.update((c) => (c - 1 + total) % total);
    this.progress.set(0);
  }

  setSlide(idx: number) {
    if (idx === this.currentSlide()) return;
    this.currentSlide.set(idx);
    this.progress.set(0);
  }

  safeHtml(html: string) {
    return this.sanitizer.bypassSecurityTrustHtml(html || "");
  }
}
