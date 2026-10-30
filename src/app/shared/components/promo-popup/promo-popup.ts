import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
  signal,
  OnInit,
  OnDestroy,
  PLATFORM_ID,
  effect,
  HostListener,
  Input
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { DatastoreService, Advertisement } from '../../../services/datastore';
import { NotificationService } from '../../../services/notification.service';
import { CampaignEligibilityService } from '../../../services/campaign-eligibility.service';
import { ToastService } from '../toast/toast.service';

interface CountdownTime {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
}

@Component({
  selector: 'app-promo-popup',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (activeCampaign(); as camp) {
      @if (isVisible()) {
        @let isImgOnly = isImageOnlyMode(camp);
        <!-- BACKDROP OVERLAY -->
        <div
          [class]="isPreviewMode
            ? 'absolute inset-0 z-30 transition-opacity duration-300 rounded-2xl flex items-center justify-center p-2 overflow-hidden'
            : 'fixed inset-0 z-[9990] transition-opacity duration-300 animate-fadeIn'"
          [class.bg-black-30]="camp.overlay === 'light'"
          [class.bg-black-70]="camp.overlay === 'dark'"
          [class.bg-black-50-blur]="camp.overlay === 'blur'"
          [class.pointer-events-none]="!isPreviewMode && camp.overlay === 'none'"
          (click)="onBackdropClick($event)"
        >
          <!-- POPUP CONTAINER -->
          <div
            [class]="isPreviewMode
              ? 'relative z-30 pointer-events-auto flex items-center justify-center w-full max-h-full'
              : 'fixed z-[9990] p-2 sm:p-4 transition-all duration-300 pointer-events-auto flex items-center justify-center max-w-[100vw] max-h-[100vh]'"
            [ngClass]="isPreviewMode ? '' : getPositionClasses(camp.popupPosition || 'center')"
          >
            <div
              class="relative rounded-2xl sm:rounded-3xl overflow-hidden group flex flex-col transition-all duration-300 mx-auto"
              [class.bg-white]="!isImgOnly"
              [class.dark:bg-zinc-900]="!isImgOnly"
              [class.border]="!isImgOnly"
              [class.border-zinc-200]="!isImgOnly"
              [class.dark:border-zinc-800]="!isImgOnly"
              [class.shadow-2xl]="!isImgOnly"
              [class.bg-transparent]="isImgOnly"
              [class.border-none]="isImgOnly"
              [class.shadow-none]="isImgOnly"
              [ngClass]="[
                getSizeClasses(camp.popupSize || 'medium', isImgOnly),
                getAnimationClasses(camp.animation || 'zoom')
              ]"
              [ngStyle]="dynamicPopupStyle()"
              (click)="$event.stopPropagation()"
            >
              <!-- CLOSE BUTTON -->
              @if (camp.showCloseButton !== false) {
                <button
                  type="button"
                  (click)="closePopup($event)"
                  class="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-30 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer shadow-xl border border-white/30 hover:scale-110 active:scale-90"
                  aria-label="Close promotion"
                >
                  <mat-icon class="text-base sm:text-lg">close</mat-icon>
                </button>
              }

              <!-- CAMPAIGN IMAGE -->
              @if (displayImageUrl()) {
                <div
                  class="relative w-full overflow-hidden flex items-center justify-center group"
                  [class.cursor-pointer]="(camp.imageClickAction || 'no_action') !== 'no_action'"
                  [class.rounded-2xl]="isImgOnly"
                  [class.sm:rounded-3xl]="isImgOnly"
                  (click)="onImageClick(camp)"
                >
                  <picture class="w-full h-auto flex items-center justify-center">
                    @if (camp.mobileImageUrl) {
                      <source media="(max-width: 767px)" [srcset]="camp.mobileImageUrl">
                    }
                    @if (camp.imageUrl || camp.mediaUrl) {
                      <source media="(min-width: 768px)" [srcset]="camp.imageUrl || camp.mediaUrl">
                    }
                    <img
                      [src]="displayImageUrl()"
                      [alt]="camp.headline || camp.title || camp.name || 'Promotional Offer'"
                      (load)="onImageLoad($event)"
                      [ngClass]="getImageClasses(isImgOnly)"
                      class="transition-transform duration-500 group-hover:scale-[1.01] block mx-auto"
                      loading="eager"
                      fetchpriority="high"
                      decoding="async"
                    />
                  </picture>
                  @if (camp.discountText && !isImgOnly) {
                    <div class="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-lg z-20">
                      {{ camp.discountText }}
                    </div>
                  }
                </div>
              }

              <!-- CAMPAIGN TEXT CONTENT (Strictly rendered only if NOT in Image-Only mode) -->
              @if (!isImgOnly) {
                <div class="p-4 sm:p-6 space-y-3 sm:space-y-4 text-center sm:text-left bg-white dark:bg-zinc-900">
                  <div>
                    @if (camp.type) {
                      <span class="inline-block text-[9px] font-black uppercase tracking-widest text-orange-500 bg-orange-500/10 px-2.5 py-0.5 rounded-full mb-1">
                        {{ camp.type.replace('_', ' ') }}
                      </span>
                    }
                    @if (camp.headline || camp.title) {
                      <h3 class="text-lg sm:text-2xl font-black text-zinc-900 dark:text-white leading-tight">
                        {{ resolvePlaceholders(camp.headline || camp.title || '') }}
                      </h3>
                    }
                    @if (camp.subheadline) {
                      <p class="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
                        {{ resolvePlaceholders(camp.subheadline) }}
                      </p>
                    }
                  </div>

                  <!-- COUNTDOWN TIMER DISPLAY -->
                  @if (camp.enableCountdown && countdown()) {
                    <div class="py-2 px-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                      <span class="block text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-zinc-400 text-center mb-1">
                        OFFER ENDS IN
                      </span>
                      <div class="grid grid-cols-4 gap-1.5 sm:gap-2 text-center font-mono">
                        <div class="bg-white dark:bg-zinc-900 p-1.5 sm:p-2 rounded-xl border border-zinc-200 dark:border-zinc-800">
                          <span class="block text-sm sm:text-base font-black text-orange-600 dark:text-orange-400 leading-none">{{ countdown()?.days }}</span>
                          <span class="text-[7px] sm:text-[8px] text-zinc-400 font-bold uppercase">Days</span>
                        </div>
                        <div class="bg-white dark:bg-zinc-900 p-1.5 sm:p-2 rounded-xl border border-zinc-200 dark:border-zinc-800">
                          <span class="block text-sm sm:text-base font-black text-zinc-800 dark:text-zinc-200 leading-none">{{ countdown()?.hours }}</span>
                          <span class="text-[7px] sm:text-[8px] text-zinc-400 font-bold uppercase">Hours</span>
                        </div>
                        <div class="bg-white dark:bg-zinc-900 p-1.5 sm:p-2 rounded-xl border border-zinc-200 dark:border-zinc-800">
                          <span class="block text-sm sm:text-base font-black text-zinc-800 dark:text-zinc-200 leading-none">{{ countdown()?.minutes }}</span>
                          <span class="text-[7px] sm:text-[8px] text-zinc-400 font-bold uppercase">Mins</span>
                        </div>
                        <div class="bg-white dark:bg-zinc-900 p-1.5 sm:p-2 rounded-xl border border-zinc-200 dark:border-zinc-800">
                          <span class="block text-sm sm:text-base font-black text-zinc-800 dark:text-zinc-200 leading-none">{{ countdown()?.seconds }}</span>
                          <span class="text-[7px] sm:text-[8px] text-zinc-400 font-bold uppercase">Secs</span>
                        </div>
                      </div>
                    </div>
                  }

                  <!-- COUPON CODE QUICK COPY BOX -->
                  @if (camp.couponCode) {
                    <div class="flex items-center justify-between p-2 sm:p-2.5 bg-orange-500/10 border border-dashed border-orange-500/40 rounded-xl">
                      <div class="flex items-center gap-1.5">
                        <mat-icon class="text-orange-500 text-sm">confirmation_number</mat-icon>
                        <span class="text-xs font-mono font-black uppercase text-orange-600 dark:text-orange-400 tracking-wider">
                          {{ camp.couponCode }}
                        </span>
                      </div>
                      <button
                        (click)="copyCoupon(camp.couponCode)"
                        class="px-2.5 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                      >
                        Copy Code
                      </button>
                    </div>
                  }

                  <!-- CTA BUTTON ACTION -->
                  @if (camp.ctaText || camp.linkUrl || camp.ctaUrl) {
                    <div class="pt-1">
                      <button
                        (click)="onCtaClick(camp)"
                        class="w-full py-2.5 sm:py-3.5 px-4 sm:px-6 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg hover:shadow-orange-500/30 transition-all transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>{{ resolvePlaceholders(camp.ctaText || 'Claim Offer Now') }}</span>
                        <mat-icon class="text-sm">arrow_forward</mat-icon>
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      }
    }
  `,
  styles: [`
    .bg-black-30 { background-color: rgba(0, 0, 0, 0.3); }
    .bg-black-70 { background-color: rgba(0, 0, 0, 0.7); }
    .bg-black-50-blur { background-color: rgba(0, 0, 0, 0.5); backdrop-filter: blur(8px); }
    img {
      image-rendering: -webkit-optimize-contrast;
      image-rendering: auto;
    }
  `]
})
export class PromoPopupComponent implements OnInit, OnDestroy {
  public ds = inject(DatastoreService);
  public ns = inject(NotificationService);
  public eligibilityService = inject(CampaignEligibilityService);
  public router = inject(Router);
  public toast = inject(ToastService);
  private platformId = inject(PLATFORM_ID);

  // PREVIEW INPUTS (When rendered inside Admin Campaign Editor)
  @Input() isPreviewMode: boolean = false;
  @Input() previewCampaign: any = null;
  @Input() previewViewport: 'desktop' | 'mobile' = 'desktop';

  // Internal reactive signals
  public internalVisible = signal<boolean>(false);
  public internalActiveCampaign = signal<any | null>(null);
  public countdown = signal<CountdownTime | null>(null);
  public imageAspectRatio = signal<number | null>(null);

  private timerId: any = null;
  private scrollListener: any = null;
  private exitListener: any = null;

  // Active campaign resolution (Preview vs Live Storefront)
  public activeCampaign = computed(() => {
    if (this.isPreviewMode) {
      return this.previewCampaign;
    }
    return this.internalActiveCampaign();
  });

  // Visibility resolution
  public isVisible = computed(() => {
    if (this.isPreviewMode) {
      return !!this.previewCampaign;
    }
    return this.internalVisible();
  });

  // Device resolution (Preview viewport vs Live Browser screen)
  public isMobile = computed(() => {
    if (this.isPreviewMode) {
      return this.previewViewport === 'mobile';
    }
    return this.eligibilityService.isMobile();
  });

  constructor() {
    // 1. Reactive Preloader for Image Dimensions
    effect(() => {
      const camp = this.activeCampaign();
      this.imageAspectRatio.set(null);
      if (camp && isPlatformBrowser(this.platformId)) {
        const url = this.displayImageUrl();
        if (url) {
          this.preloadImageDimensions(url);
        }
      }
    }, { allowSignalWrites: true });

    // 2. Countdown Timer synchronization for both Live and Preview modes
    effect(() => {
      const camp = this.activeCampaign();
      if (camp && camp.enableCountdown) {
        this.startCountdown(camp);
      } else {
        this.clearTimer();
      }
    });

    // 3. Live Storefront Evaluation Listener
    effect(() => {
      if (this.isPreviewMode) return;
      const eligible = this.eligibilityService.eligibleCampaign();
      if (eligible && !this.internalVisible()) {
        this.internalActiveCampaign.set(eligible);
        this.setupTrigger(eligible);
      } else if (!eligible && this.internalVisible()) {
        this.internalVisible.set(false);
    this.ns.isAdPopupActive.set(false);
    this.ns.adPopupDismissedTime.set(Date.now());
        this.internalActiveCampaign.set(null);
        this.clearTimer();
        this.removeListeners();
      }
    });
  }

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!this.isPreviewMode) {
      this.ds.reloadAdvertisements();
      this.eligibilityService.evaluate('init');
    }
  }

  ngOnDestroy() {
    this.ns.isAdPopupActive.set(false);
    this.clearTimer();
    this.removeListeners();
  }

  public onImageLoad(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img && img.naturalWidth && img.naturalHeight) {
      this.imageAspectRatio.set(img.naturalWidth / img.naturalHeight);
    }
  }

  private preloadImageDimensions(url: string) {
    if (!url || typeof Image === 'undefined') return;
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        this.imageAspectRatio.set(img.naturalWidth / img.naturalHeight);
      }
    };
    img.src = url;
  }

  public displayImageUrl = computed(() => {
    const camp = this.activeCampaign();
    if (!camp) return '';
    if (this.isMobile() && camp.mobileImageUrl) {
      return camp.mobileImageUrl;
    }
    return camp.imageUrl || camp.mediaUrl || '';
  });

  private setupTrigger(camp: any) {
    const trigger = camp.trigger || 'immediate';

    if (trigger === 'immediate') {
      this.triggerShow(camp);
    } else if (trigger === 'delay') {
      const delayMs = (camp.delaySeconds || 3) * 1000;
      setTimeout(() => this.triggerShow(camp), delayMs);
    } else if (trigger === 'scroll') {
      const targetScroll = camp.scrollPercent || 50;
      this.scrollListener = () => {
        const winHeight = window.innerHeight;
        const docHeight = document.documentElement.scrollHeight - winHeight;
        if (docHeight <= 0) return;
        const scrollPct = (window.scrollY / docHeight) * 100;
        if (scrollPct >= targetScroll) {
          this.triggerShow(camp);
          window.removeEventListener('scroll', this.scrollListener);
        }
      };
      window.addEventListener('scroll', this.scrollListener, { passive: true });
    } else if (trigger === 'exit_intent') {
      this.exitListener = (e: MouseEvent) => {
        if (e.clientY <= 10) {
          this.triggerShow(camp);
          document.removeEventListener('mouseleave', this.exitListener);
        }
      };
      document.addEventListener('mouseleave', this.exitListener);
    } else {
      this.triggerShow(camp);
    }
  }

  private triggerShow(camp: any) {
    if (!camp || !camp.id) return;

    if (!this.isPreviewMode) {
      // 1. Mutual exclusion: If notification prompt is active, defer promo popup
      if (this.ns.isPromptVisible) {
        setTimeout(() => this.triggerShow(camp), 4000);
        return;
      }

      // 2. Cooldown buffer: If notification prompt was recently dismissed (< 8s), wait for cooldown
      const timeSincePrompt = Date.now() - this.ns.promptDismissedTime();
      if (this.ns.promptDismissedTime() > 0 && timeSincePrompt < 8000) {
        setTimeout(() => this.triggerShow(camp), 8000 - timeSincePrompt + 1000);
        return;
      }
    }

    this.internalVisible.set(true);
    if (!this.isPreviewMode) {
      this.ns.isAdPopupActive.set(true);
    }

    // Record impression analytics via API and local frequency tracker
    this.ds.recordAdImpression(camp.id);
    this.eligibilityService.recordCampaignDisplay(camp);

    if (camp.enableCountdown) {
      this.startCountdown(camp);
    }
  }

  private startCountdown(camp: any) {
    this.clearTimer();
    if (!camp || !camp.enableCountdown) {
      this.countdown.set(null);
      return;
    }

    let targetMs = 0;
    if (camp.endDate) {
      const parsed = this.eligibilityService.parseScheduleTimestamp(camp.endDate, camp.endTime || '23:59', camp.timezone);
      targetMs = parsed || (Date.now() + 24 * 60 * 60 * 1000);
    } else if (camp.customEndDate) {
      targetMs = Date.parse(camp.customEndDate);
    } else {
      targetMs = Date.now() + 24 * 60 * 60 * 1000;
    }

    const updateTimer = () => {
      const nowMs = Date.now();
      const diff = Math.max(0, targetMs - nowMs);

      if (diff <= 0) {
        this.countdown.set({ days: '00', hours: '00', minutes: '00', seconds: '00' });
        this.clearTimer();
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      this.countdown.set({
        days: days.toString().padStart(2, '0'),
        hours: hours.toString().padStart(2, '0'),
        minutes: minutes.toString().padStart(2, '0'),
        seconds: seconds.toString().padStart(2, '0'),
      });
    };

    updateTimer();
    this.timerId = setInterval(updateTimer, 1000);
  }

  private clearTimer() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.countdown.set(null);
  }

  private removeListeners() {
    if (this.scrollListener && typeof window !== 'undefined') {
      window.removeEventListener('scroll', this.scrollListener);
    }
    if (this.exitListener && typeof document !== 'undefined') {
      document.removeEventListener('mouseleave', this.exitListener);
    }
  }

  public closePopup(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (this.isPreviewMode) {
      this.toast.info('Preview: Close button clicked');
      return;
    }

    const camp = this.activeCampaign();
    if (camp) {
      this.eligibilityService.dismissCampaign(camp);
    }

    this.internalVisible.set(false);
    this.ns.isAdPopupActive.set(false);
    this.ns.adPopupDismissedTime.set(Date.now());
    this.internalActiveCampaign.set(null);
    this.clearTimer();
    this.removeListeners();
  }

  public onBackdropClick(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const camp = this.activeCampaign();
    if (camp && camp.allowOutsideClickClose !== false) {
      this.closePopup(event);
    }
  }

  public copyCoupon(code: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      this.toast.success(`Coupon ${code} copied to clipboard!`);
    }
  }

  public onImageClick(camp: any) {
    const action = camp.imageClickAction || 'no_action';
    if (action === 'no_action') {
      return;
    }
    this.onCtaClick(camp);
  }

  public onCtaClick(camp: any) {
    if (this.isPreviewMode) {
      const target = camp.ctaUrl || camp.linkUrl || camp.targetUrl || '/products';
      this.toast.info(`Preview: CTA action triggered (${target})`);
      return;
    }

    this.ds.recordAdClick(camp.id);
    this.closePopup();

    const targetUrl = camp.ctaUrl || camp.linkUrl || camp.targetUrl || '';
    const action = camp.ctaAction || 'open_url';

    if (action === 'open_coupon' && camp.couponCode) {
      this.copyCoupon(camp.couponCode);
    } else if (action === 'open_cart') {
      this.router.navigate(['/cart']);
    } else if (action === 'open_whatsapp') {
      const waNumber = this.ds.settingsService.settingsData()?.supportSettings?.whatsappNumber || '919111381113';
      window.open(`https://wa.me/${waNumber}?text=Hi%2C%20I%20want%20to%20claim%20offer%3A%20${encodeURIComponent(camp.headline || camp.title || '')}`, '_blank');
    } else if (targetUrl) {
      if (camp.openInNewTab || targetUrl.startsWith('http')) {
        window.open(targetUrl, '_blank');
      } else {
        this.router.navigateByUrl(targetUrl);
      }
    }
  }

  public resolvePlaceholders(text: string): string {
    if (!text) return '';
    const camp = this.activeCampaign();
    return text
      .replace(/{{couponCode}}/g, camp?.couponCode || '')
      .replace(/{{discount}}/g, camp?.discountText || '')
      .replace(/{{endDate}}/g, camp?.endDate || '');
  }

  public dynamicPopupStyle = computed(() => {
    const camp = this.activeCampaign();
    if (!camp) return {};

    const isImgOnly = this.isImageOnlyMode(camp);
    const isMob = this.isMobile();

    if (this.isPreviewMode) {
      if (isImgOnly) {
        return {
          'width': '100%',
          'max-width': isMob ? '280px' : '440px',
          'max-height': '360px'
        };
      }
      return {
        'width': '100%',
        'max-width': isMob ? '280px' : '440px'
      };
    }

    const winW = this.eligibilityService.windowWidth();
    const winH = this.eligibilityService.windowHeight();

    if (isImgOnly) {
      const ratio = this.imageAspectRatio();
      let maxAllowedW = isMob ? Math.min(winW - 20, winW * 0.94) : 672;
      const size = camp.popupSize || 'medium';
      if (!isMob) {
        if (size === 'small') maxAllowedW = 420;
        else if (size === 'medium') maxAllowedW = 580;
        else if (size === 'large') maxAllowedW = 720;
        else if (size === 'full_width') maxAllowedW = 890;
      }

      const maxAllowedH = Math.min(winH - (isMob ? 40 : 80), winH * 0.84);

      if (ratio && ratio > 0) {
        const widthFromHeight = maxAllowedH * ratio;
        const targetWidth = Math.min(maxAllowedW, widthFromHeight);
        return {
          'width': `${Math.round(targetWidth)}px`,
          'max-width': '94vw',
          'max-height': `${Math.round(maxAllowedH)}px`
        };
      }

      return {
        'width': isMob ? '92vw' : 'auto',
        'max-width': isMob ? '94vw' : `${maxAllowedW}px`,
        'max-height': `${Math.round(maxAllowedH)}px`
      };
    }

    const maxW = isMob ? '92vw' : undefined;
    return maxW ? { 'width': maxW, 'max-width': '94vw' } : {};
  });

  public getImageClasses(isImgOnly: boolean): string {
    if (isImgOnly) {
      return this.isPreviewMode
        ? 'w-full h-auto max-h-[320px] object-contain rounded-2xl drop-shadow-2xl'
        : 'w-full h-auto max-h-[84vh] object-contain rounded-2xl sm:rounded-3xl drop-shadow-2xl';
    }
    return this.isPreviewMode
      ? 'w-full h-32 sm:h-36 object-cover'
      : 'w-full h-auto max-h-48 sm:max-h-64 object-cover';
  }

  public getPositionClasses(pos: string): string {
    switch (pos) {
      case 'bottom_right':
        return 'bottom-4 right-4 sm:bottom-6 sm:right-6 max-sm:top-1/2 max-sm:left-1/2 max-sm:-translate-x-1/2 max-sm:-translate-y-1/2 max-sm:bottom-auto max-sm:right-auto';
      case 'bottom_left':
        return 'bottom-4 left-4 sm:bottom-6 sm:left-6 max-sm:top-1/2 max-sm:left-1/2 max-sm:-translate-x-1/2 max-sm:-translate-y-1/2 max-sm:bottom-auto max-sm:left-auto';
      case 'top_right':
        return 'top-4 right-4 sm:top-6 sm:right-6 max-sm:top-1/2 max-sm:left-1/2 max-sm:-translate-x-1/2 max-sm:-translate-y-1/2';
      case 'top_left':
        return 'top-4 left-4 sm:top-6 sm:left-6 max-sm:top-1/2 max-sm:left-1/2 max-sm:-translate-x-1/2 max-sm:-translate-y-1/2';
      case 'fullscreen':
        return 'inset-2 sm:inset-6 md:inset-10';
      case 'center':
      default:
        return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
    }
  }

  public isImageOnlyMode(camp: any): boolean {
    if (!camp) return false;
    const type = (camp.type || '').toLowerCase().trim();
    if (type === 'image_only' || type === 'image_popup') return true;
    if (camp.contentMode === 'IMAGE_ONLY' || camp.contentMode === 'IMAGE_CLOSE' || camp.showImageOnly || camp.hideHeader) return true;
    const hasHeadline = !!(camp.headline && String(camp.headline).trim());
    const hasTitle = !!(camp.title && String(camp.title).trim());
    const hasSubheadline = !!(camp.subheadline && String(camp.subheadline).trim());
    const hasCta = !!(camp.ctaText && String(camp.ctaText).trim());
    return !hasHeadline && !hasTitle && !hasSubheadline && !hasCta;
  }

  public getSizeClasses(size: string, isImgOnly: boolean = false): string {
    if (this.isPreviewMode) {
      return 'w-full max-w-full';
    }
    if (isImgOnly || size === 'auto') {
      return 'w-[92vw] sm:w-auto max-w-[94vw] sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[88vh]';
    }
    switch (size) {
      case 'small': return 'w-[92vw] sm:w-full max-w-[94vw] sm:max-w-xs';
      case 'large': return 'w-[92vw] sm:w-full max-w-[94vw] sm:max-w-xl md:max-w-2xl';
      case 'full_width': return 'w-[94vw] sm:w-full max-w-[96vw] sm:max-w-3xl lg:max-w-4xl';
      case 'medium':
      default:
        return 'w-[92vw] sm:w-full max-w-[94vw] sm:max-w-md md:max-w-lg';
    }
  }

  public getAnimationClasses(anim: string): string {
    switch (anim) {
      case 'slide_up': return 'animate-slide-up';
      case 'slide_down': return 'animate-slide-down';
      case 'fade': return 'animate-fadeIn';
      case 'zoom':
      default:
        return 'animate-zoomIn';
    }
  }
}
