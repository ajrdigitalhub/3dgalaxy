import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  effect,
  PLATFORM_ID,
  HostListener,
  NgZone,
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
    @if (carouselConfig()?.enabled !== false) {
    <!-- HERO: PREMIUM IMMERSIVE SHOWCASE STAGE -->
    <section
      id="hero-section"
      (mouseenter)="isHovered.set(true)"
      (mouseleave)="isHovered.set(false)"
      class="relative w-full max-w-[1916px] mx-auto aspect-[1916/821] overflow-hidden flex items-center border-b border-neutral-900/40 select-none bg-neutral-950 transition-colors duration-1000"
      style="touch-action: pan-y;"
    >
      <!-- Active Carousel Slide -->
      <div class="relative w-full h-full flex items-center">
        @if (heroSlides().length === 0) {
          <!-- Shimmer Loading Stage -->
          <div
            class="w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-20 py-10 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center"
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
                  ? 'opacity-100 z-10 pointer-events-auto'
                  : 'opacity-0 z-0 pointer-events-none'
              "
              class="absolute inset-0 w-full h-full flex items-center transition-opacity duration-700 ease-in-out"
            >
              <!-- Slide Background Container -->
              <div
                class="absolute inset-0 z-0 overflow-hidden pointer-events-none transition-all duration-1000"
              >
                <!-- Priority: Video -> Image -> Gradient -> Color -->
                @if (slide.bgVideoUrl || slide.videoUrl) {
                  <video
                    autoplay
                    loop
                    muted
                    playsinline
                    class="absolute inset-0 w-full h-full object-cover z-0"
                  >
                    <source
                      [src]="slide.bgVideoUrl || slide.videoUrl"
                      type="video/mp4"
                    />
                  </video>
                } @else if (getSlideBgImage(slide)) {
                  <img
                    [src]="getSlideBgImage(slide)"
                    class="absolute inset-0 w-full h-full object-cover z-0"
                    alt="Hero Background"
                    [attr.fetchpriority]="idx === 0 ? 'high' : 'auto'"
                    [loading]="idx < 3 ? 'eager' : 'lazy'"
                    decoding="async"
                  />
                } @else if (slide.bgGradient) {
                  <div
                    class="absolute inset-0 w-full h-full transition-all duration-1000 z-0"
                    [style.background]="slide.bgGradient"
                  ></div>
                } @else {
                  <div
                    class="absolute inset-0 w-full h-full transition-all duration-1000 z-0"
                    [style.backgroundColor]="slide.bgColor || '#09090b'"
                  ></div>
                }

                <!-- Overlay Opacity (rendered on top of image) -->
                <div
                  class="absolute inset-0 z-[1] transition-colors duration-1000"
                  [style.backgroundColor]="
                    slide.darkOverlay !== false
                      ? 'rgba(0,0,0,' + (slide.overlayOpacity ?? (slide.layoutMode === 'banner_only' ? 0 : 0.4)) + ')'
                      : 'transparent'
                  "
                ></div>
              </div>

              <!-- Clickable Slide Link (If Entire Banner Clickable or in Banner-Only Mode) -->
              @if ((slide.isEntireSlideClickable || slide.layoutMode === 'banner_only') && slide.linkUrl) {
                @if (isExternal(slide.linkUrl)) {
                  <a
                    [href]="slide.linkUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="absolute inset-0 z-[2] block cursor-pointer"
                    [attr.aria-label]="slide.title || 'Slide Banner'"
                  ></a>
                } @else {
                  <a
                    [routerLink]="slide.linkUrl"
                    class="absolute inset-0 z-[2] block cursor-pointer"
                    [attr.aria-label]="slide.title || 'Slide Banner'"
                  ></a>
                }
              }

              <!-- Main Content Container (Only rendered if NOT in banner_only mode and has visible content) -->
              @if (slide.layoutMode !== 'banner_only' && isAnyContentVisible(slide)) {
                <div
                  class="w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 py-4 sm:py-8 lg:py-12 relative z-20 pointer-events-auto"
                >
                  @if (slide.showOverlayCard && (slide.overlayImageUrl || slide.imageUrl)) {
                    <!-- Split Mode: Left Card + Right Content -->
                    <div
                      class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center w-full"
                    >
                      <!-- Small Overlay Tilt Card -->
                      <div
                        class="lg:col-span-5 xl:col-span-6 flex flex-col items-center justify-center relative w-full"
                        [ngClass]="{
                          'order-last lg:order-last': slide.textAlignment === 'right',
                          'lg:order-first': slide.textAlignment !== 'right',
                        }"
                      >
                        <div
                          appTilt
                          [tiltMax]="slide.enableTilt !== false ? 6 : 0"
                          [ngClass]="[
                            getOverlayCardSizeClass(slide.overlayCardSize),
                            getOverlayCardStyleClass(slide.overlayCardStyle)
                          ]"
                          class="relative w-full aspect-square flex items-center justify-center group/card transition-all duration-700 overflow-visible"
                        >
                          <!-- Radial Shadow Backdrop for glass/solid card -->
                          @if (slide.overlayCardStyle !== 'clean') {
                            <div
                              class="absolute -inset-6 bg-black/40 blur-2xl rounded-[4rem] -z-10 group-hover/card:scale-105 transition-transform duration-700"
                            ></div>
                            <div
                              class="absolute inset-0 bg-linear-to-tr from-white/0 via-white/5 to-white/10 rounded-[3rem] pointer-events-none"
                            ></div>
                          }

                          <!-- Product Image -->
                          <div
                            class="relative w-full h-full flex items-center justify-center overflow-hidden rounded-[3rem] p-6"
                          >
                            <img
                              [src]="slide.overlayImageUrl || slide.imageUrl"
                              width="420"
                              height="420"
                              [loading]="idx === 0 ? 'eager' : 'lazy'"
                              [attr.fetchpriority]="idx === 0 ? 'high' : 'low'"
                              decoding="async"
                              class="max-w-[90%] max-h-[90%] object-contain transition-transform duration-700 ease-out group-hover/card:scale-105 filter drop-shadow-[0_20px_30px_rgba(0,0,0,0.5)] select-none pointer-events-none animate-float-slow"
                              [alt]="slide.title || 'Product'"
                            />
                          </div>
                        </div>
                      </div>

                      <!-- Right Side Meta & CTA -->
                      <div
                        class="lg:col-span-7 xl:col-span-6 space-y-6"
                        [ngClass]="getTextAlignmentClasses(slide.textAlignment)"
                      >
                        <ng-container *ngTemplateOutlet="slideContentTemplate; context: { $implicit: slide }"></ng-container>
                      </div>
                    </div>
                  } @else {
                    <!-- Full Width / Centered Banner with Text (No Small Card) -->
                    <div
                      class="w-full"
                      [ngClass]="{
                        'max-w-3xl text-left items-start': slide.textAlignment === 'left' || !slide.textAlignment,
                        'max-w-3xl mx-auto text-center items-center flex flex-col': slide.textAlignment === 'center',
                        'max-w-3xl ml-auto text-right items-end flex flex-col': slide.textAlignment === 'right'
                      }"
                    >
                      <ng-container *ngTemplateOutlet="slideContentTemplate; context: { $implicit: slide }"></ng-container>
                    </div>
                  }
                </div>
              }
            </div>
          }
        }
      </div>

      <!-- Arrow Controls -->
      @if (heroSlides().length > 1 && carouselConfig()?.showNavigation !== false) {
        <button
          (click)="prevSlide()"
          class="absolute left-2 sm:left-4 lg:left-8 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 !min-h-0 !min-w-0 p-0 rounded-full sm:rounded-xl md:rounded-2xl bg-neutral-950/40 hover:bg-neutral-900/80 border border-white/10 text-white hover:text-orange-500 transition-all z-20 flex items-center justify-center shadow-lg cursor-pointer backdrop-blur-xs sm:backdrop-blur-md"
          aria-label="Previous Slide"
        >
          <mat-icon class="scale-75 sm:scale-90 md:scale-100">chevron_left</mat-icon>
        </button>
        <button
          (click)="nextSlide()"
          class="absolute right-2 sm:right-4 lg:right-8 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 !min-h-0 !min-w-0 p-0 rounded-full sm:rounded-xl md:rounded-2xl bg-neutral-950/40 hover:bg-neutral-900/80 border border-white/10 text-white hover:text-orange-500 transition-all z-20 flex items-center justify-center shadow-lg cursor-pointer backdrop-blur-xs sm:backdrop-blur-md"
          aria-label="Next Slide"
        >
          <mat-icon class="scale-75 sm:scale-90 md:scale-100">chevron_right</mat-icon>
        </button>
      }

      <!-- Indicators Deck -->
      @if (heroSlides().length > 1 && carouselConfig()?.showIndicators !== false) {
        <div
          class="absolute bottom-2 sm:bottom-4 md:bottom-6 lg:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 sm:gap-2.5 md:gap-3.5 z-20 px-2.5 py-1 sm:px-4 sm:py-1.5 md:px-6 md:py-2.5 bg-neutral-950/50 border border-white/10 backdrop-blur-md md:backdrop-blur-2xl rounded-full md:rounded-2xl shadow-xl"
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
                  ? 'h-1.5 w-4 sm:h-2 sm:w-6 lg:w-8 bg-orange-500 shadow-[0_0_8px_#ea580c] rounded-full'
                  : 'h-1.5 w-1.5 sm:h-2 sm:w-2 bg-white/30 rounded-full hover:bg-white/60'
              "
              class="transition-all duration-500 cursor-pointer border-none !min-h-0 !min-w-0 p-0 block"
              style="min-height: 0 !important; min-width: 0 !important;"
            ></button>
          }
        </div>
      }

      <!-- Autoplay Progress Indicator -->
      @if (heroSlides().length > 1 && !isHovered() && carouselConfig()?.autoplay !== false) {
        <div
          class="absolute bottom-0 left-0 h-[2px] sm:h-[3px] bg-orange-500 z-30 transition-all ease-linear"
          [style.width.%]="progress()"
          [style.transition-duration.ms]="progress() === 0 ? 0 : 100"
        ></div>
      }
    </section>
    }

    <!-- Reusable Template for Slide Meta & Buttons -->
    <ng-template #slideContentTemplate let-slide>
      <div class="space-y-3 sm:space-y-4 lg:space-y-6 w-full" [ngClass]="getTextAlignmentClasses(slide.textAlignment)">
        <!-- Badge -->
        @if (slide.showBadge !== false && slide.badge) {
          <div
            class="hero-anim inline-flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[9px] sm:text-[10px] lg:text-xs font-black uppercase tracking-wider text-white shadow-xs"
          >
            @if (slide.badgeIcon) {
              <mat-icon class="scale-75 text-orange-500">{{ slide.badgeIcon }}</mat-icon>
            }
            <span>{{ slide.badge }}</span>
          </div>
        }

        <!-- Subtitle -->
        @if (slide.showSubtitle !== false && (slide.subtitle || slide.subheading)) {
          <span
            class="hero-anim block text-[10px] sm:text-[11px] lg:text-xs font-black tracking-[0.25em] uppercase text-orange-500"
          >
            {{ slide.subtitle || slide.subheading }}
          </span>
        }

        <!-- Title -->
        @if (slide.showTitle !== false && slide.title) {
          <h1
            class="hero-anim text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-tight sm:leading-none tracking-tight font-display"
            [ngClass]="slide.textColorMode === 'dark' ? 'text-neutral-950' : 'text-white'"
          >
            {{ slide.title }}
          </h1>
        }

        <!-- Description -->
        @if (slide.showDesc !== false && (slide.desc || slide.description)) {
          <p
            class="hero-anim text-xs sm:text-sm md:text-base leading-relaxed max-w-xl font-medium line-clamp-2 sm:line-clamp-3"
            [ngClass]="slide.textColorMode === 'dark' ? 'text-neutral-800' : 'text-neutral-300'"
            [innerHTML]="safeHtml(slide.desc || slide.description)"
          ></p>
        }

        <!-- Pricing Display -->
        @if (slide.showPrice !== false && slide.price) {
          <div
            class="hero-anim flex items-center gap-3 sm:gap-4"
            [ngClass]="{
              'justify-start': slide.textAlignment === 'left' || !slide.textAlignment,
              'justify-center': slide.textAlignment === 'center',
              'justify-end': slide.textAlignment === 'right',
            }"
          >
            <span
              class="text-xl sm:text-2xl lg:text-4.5xl font-black tracking-tight"
              [ngClass]="slide.textColorMode === 'dark' ? 'text-neutral-950' : 'text-white'"
            >
              {{ currency() }}{{ slide.price | number }}
            </span>
            @if (slide.oldPrice) {
              <span class="text-base sm:text-lg lg:text-xl text-neutral-500 line-through font-bold">
                {{ currency() }}{{ slide.oldPrice | number }}
              </span>
              @if (slide.discountText) {
                <span class="px-2 py-0.5 sm:px-2.5 sm:py-0.5 bg-orange-600/10 text-orange-500 border border-orange-500/15 text-[8px] sm:text-[9px] font-black rounded-lg uppercase tracking-wider">
                  {{ slide.discountText }}
                </span>
              }
            }
          </div>
        }

        <!-- Product Tag -->
        @if (slide.showProductTag !== false && slide.productTag) {
          <div class="hero-anim inline-block px-2.5 py-0.5 sm:px-3 sm:py-1 bg-blue-500/10 text-blue-400 border border-blue-500/15 text-[8px] sm:text-[9px] font-black uppercase tracking-wider rounded-full">
            {{ slide.productTag }}
          </div>
        }

        <!-- CTA Buttons -->
        @if ((slide.showPrimaryBtn !== false && slide.btnText) || (slide.showSecondaryBtn !== false && slide.secBtnText)) {
          <div
            class="hero-anim flex flex-row flex-wrap gap-2.5 sm:gap-4 pt-2 sm:pt-3 w-full sm:w-auto relative z-30"
            [ngClass]="{
              'justify-start': slide.textAlignment === 'left' || !slide.textAlignment,
              'justify-center': slide.textAlignment === 'center',
              'justify-end': slide.textAlignment === 'right',
            }"
          >
            <!-- Primary Button -->
            @if (slide.showPrimaryBtn !== false && slide.btnText) {
              <a
                [routerLink]="slide.linkUrl || '/products'"
                [style.borderRadius]="theme().borderRadius"
                [ngClass]="{
                  'bg-theme-gradient text-white hover:opacity-90 shadow-lg': slide.btnTheme === 'primary' || !slide.btnTheme,
                  'bg-zinc-800 hover:bg-zinc-700 text-white shadow-zinc-800/20 hover:shadow-zinc-800/30': slide.btnTheme === 'secondary',
                  'bg-white/10 hover:bg-white/20 border border-white/20 text-white backdrop-blur-md': slide.btnTheme === 'accent',
                  'bg-transparent hover:bg-white/10 border-2 border-white/30 text-white': slide.btnTheme === 'outline',
                }"
                class="relative overflow-hidden h-9 sm:h-11 md:h-14 px-4 sm:px-7 md:px-10 font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-lg transition-all duration-300 hover:scale-105 active:scale-98 flex items-center justify-center gap-1.5 sm:gap-2 group/btn cursor-pointer"
              >
                <span>{{ slide.btnText }}</span>
                <mat-icon *ngIf="slide.btnIcon !== 'none'" class="scale-75 sm:scale-90 transition-transform group-hover/btn:translate-x-1">
                  {{ slide.btnIcon || 'shopping_cart' }}
                </mat-icon>
              </a>
            }

            <!-- Secondary Button -->
            @if (slide.showSecondaryBtn !== false && slide.secBtnText) {
              <a
                [routerLink]="slide.secBtnUrl || slide.secLinkUrl || slide.linkUrl || '/products'"
                [style.borderRadius]="theme().borderRadius"
                [ngClass]="{
                  'bg-white/5 hover:bg-white/10 border border-white/10 text-white backdrop-blur-xl': slide.secBtnTheme === 'secondary' || !slide.secBtnTheme || slide.secBtnTheme === 'glass',
                  'bg-theme-gradient text-white hover:opacity-90 shadow-lg': slide.secBtnTheme === 'primary',
                  'bg-zinc-800 hover:bg-zinc-700 text-white shadow-zinc-800/20': slide.secBtnTheme === 'dark',
                  'bg-transparent hover:bg-white/10 border-2 border-white/30 text-white': slide.secBtnTheme === 'outline',
                }"
                class="h-9 sm:h-11 md:h-14 px-4 sm:px-7 md:px-10 rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all duration-300 hover:scale-105 active:scale-98 flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer"
              >
                <span>{{ slide.secBtnText }}</span>
                <mat-icon *ngIf="slide.secBtnIcon !== 'none'" class="scale-75 sm:scale-90">
                  {{ slide.secBtnIcon || 'explore' }}
                </mat-icon>
              </a>
            }
          </div>
        }
      </div>
    </ng-template>
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
  carouselConfig = computed(() => this.settingsService.getHeroCarousel() || {});

  // Load slides directly from settings
  heroSlides = computed(() => {
    const list = this.settingsService.getHeroSlides() || [];
    const isMob = this.isMobile();
    // Sort by slideOrder and filter out inactive or device-hidden ones
    const activeSlides = list
      .filter((s: any) => {
        if (s.active === false || s.isActive === false) return false;
        if (isMob && s.hideOnMobile) return false;
        if (!isMob && s.hideOnDesktop) return false;
        return true;
      })
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
          layoutMode: "showcase",
          showOverlayCard: true,
          overlayCardSize: "medium",
          overlayCardStyle: "glass",
          showPrimaryBtn: true,
          btnText: "Buy Now",
          btnIcon: "shopping_cart",
          btnTheme: "primary",
          showSecondaryBtn: true,
          secBtnText: "View Details",
          secBtnIcon: "explore",
          secBtnTheme: "glass",
          linkUrl: "/products/bambu-lab-a1-combo",
          desc: "Seamless multi-color printing at an accessible price point, complete with fully automated alignment and calibration sensors.",
          imageUrl:
            "https://images.unsplash.com/photo-1615840287214-7fe58a8f3685?auto=format&fit=crop&q=80&w=800",
          price: "48999",
          oldPrice: "55000",
          discountText: "11% OFF",
          productTag: "New In Store",
          animationType: "fade",
          overlayOpacity: 0.4,
          textAlignment: "left",
          darkOverlay: true,
          slideDuration: 4000,
        },
      ];
    }
    return activeSlides;
  });

  isExternal(url: string): boolean {
    return /^https?:\/\//i.test(url || "");
  }

  getSlideBgImage(slide: any): string {
    if (!slide) return "";
    if (this.isMobile() && slide.mobileImageUrl) {
      return slide.mobileImageUrl;
    }
    const candidate =
      slide.bgImageUrl ||
      slide.imageUrl ||
      slide.image ||
      slide.bannerUrl ||
      slide.overlayImageUrl ||
      "";
    return typeof candidate === "string" ? candidate.trim() : "";
  }

  isAnyContentVisible(slide: any): boolean {
    if (slide.layoutMode === "banner_only") return false;
    return Boolean(
      (slide.showOverlayCard && (slide.overlayImageUrl || slide.imageUrl)) ||
      (slide.showTitle !== false && slide.title) ||
      (slide.showSubtitle !== false && (slide.subtitle || slide.subheading)) ||
      (slide.showBadge !== false && slide.badge) ||
      (slide.showDesc !== false && (slide.desc || slide.description)) ||
      (slide.showPrice !== false && slide.price) ||
      (slide.showProductTag !== false && slide.productTag) ||
      (slide.showPrimaryBtn !== false && slide.btnText) ||
      (slide.showSecondaryBtn !== false && slide.secBtnText)
    );
  }

  getTextAlignmentClasses(align: string): Record<string, boolean> {
    return {
      "text-left items-start": align === "left" || !align,
      "text-center items-center flex flex-col": align === "center",
      "text-right items-end flex flex-col": align === "right",
    };
  }

  getOverlayCardSizeClass(size: string): string {
    switch (size) {
      case "small": return "max-w-[280px]";
      case "large": return "max-w-[460px]";
      default: return "max-w-[360px]";
    }
  }

  getOverlayCardStyleClass(style: string): string {
    switch (style) {
      case "clean": return "bg-transparent border-0 shadow-none";
      case "solid": return "bg-neutral-900/90 border border-neutral-800 rounded-[2.5rem] shadow-2xl";
      default: return "bg-white/5 backdrop-blur-md border border-white/10 rounded-[3rem] shadow-2xl";
    }
  }

  @HostListener("window:resize", [])
  onResize() {
    if (isPlatformBrowser(this.platformId)) {
      this.isMobile.set(window.innerWidth < 768);
    }
  }

  isSlideVisible(index: number): boolean {
    return index === this.currentSlide();
  }

  autoplayReady = signal(false);
  private ngZone = inject(NgZone);

  constructor() {
    const isBrowser = isPlatformBrowser(this.platformId);

    if (isBrowser) {
      this.isMobile.set(window.innerWidth < 768);

      const startAutoplay = () => {
        this.autoplayReady.set(true);
        window.removeEventListener("scroll", startAutoplay);
        window.removeEventListener("touchstart", startAutoplay);
        window.removeEventListener("click", startAutoplay);
      };

      window.addEventListener("scroll", startAutoplay, { passive: true, once: true });
      window.addEventListener("touchstart", startAutoplay, { passive: true, once: true });
      window.addEventListener("click", startAutoplay, { passive: true, once: true });
      setTimeout(startAutoplay, 15000);
    }

    effect((onCleanup) => {
      if (!isBrowser || !this.autoplayReady() || this.carouselConfig()?.autoplay === false) return;

      const slides = this.heroSlides();
      if (slides.length <= 1) {
        this.progress.set(0);
        return;
      }

      const activeSlide = slides[this.currentSlide()];
      const duration = Math.max(Number(activeSlide?.slideDuration) || Number(this.carouselConfig()?.interval) || 5000, 3000);
      const tickStep = 250;
      const increment = (tickStep / duration) * 100;

      let timer: any;
      this.ngZone.runOutsideAngular(() => {
        timer = setInterval(() => {
          if (this.isHovered()) return;

          const currentP = this.progress();
          if (currentP >= 100) {
            this.ngZone.run(() => {
              this.nextSlide();
              this.progress.set(0);
            });
          } else {
            this.progress.set(currentP + increment);
          }
        }, tickStep);
      });

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
