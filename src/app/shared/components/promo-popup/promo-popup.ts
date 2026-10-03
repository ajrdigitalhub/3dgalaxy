import { Component, ChangeDetectionStrategy, inject, computed, signal, OnInit, OnDestroy, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { DatastoreService, Advertisement } from '../../../services/datastore';
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
        <!-- BACKDROP OVERLAY -->
        <div
          class="fixed inset-0 z-50 transition-opacity duration-300 animate-fadeIn"
          [class.bg-black-30]="camp.overlay === 'light'"
          [class.bg-black-70]="camp.overlay === 'dark'"
          [class.bg-black-50-blur]="camp.overlay === 'blur'"
          [class.pointer-events-none]="camp.overlay === 'none'"
          (click)="onBackdropClick()"
        >
          <!-- POPUP CONTAINER -->
          <div
            class="fixed z-50 p-4 transition-all duration-300 pointer-events-auto"
            [ngClass]="getPositionClasses(camp.popupPosition || 'center')"
          >
            <div
              class="relative bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden group flex flex-col"
              [ngClass]="[
                getSizeClasses(camp.popupSize || 'medium'),
                getAnimationClasses(camp.animation || 'zoom')
              ]"
              (click)="$event.stopPropagation()"
            >
              <!-- CLOSE BUTTON -->
              @if (camp.showCloseButton !== false) {
                <button
                  (click)="closePopup()"
                  class="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer shadow-md"
                  aria-label="Close popup"
                >
                  <mat-icon class="text-lg">close</mat-icon>
                </button>
              }

              <!-- CAMPAIGN IMAGE -->
              @if (displayImageUrl()) {
                <div class="relative w-full overflow-hidden bg-zinc-900 min-h-[160px] max-h-[280px]">
                  <img
                    [src]="displayImageUrl()"
                    [alt]="camp.headline || camp.title || 'Promotional Offer'"
                    class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  @if (camp.discountText) {
                    <div class="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-lg">
                      {{ camp.discountText }}
                    </div>
                  }
                </div>
              }

              <!-- CAMPAIGN CONTENT -->
              <div class="p-6 space-y-4 text-center sm:text-left">
                <div>
                  @if (camp.type) {
                    <span class="inline-block text-[9px] font-black uppercase tracking-widest text-orange-500 bg-orange-500/10 px-2.5 py-0.5 rounded-full mb-1">
                      {{ camp.type.replace('_', ' ') }}
                    </span>
                  }
                  <h3 class="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white leading-tight">
                    {{ resolvePlaceholders(camp.headline || camp.title || '') }}
                  </h3>
                  @if (camp.subheadline) {
                    <p class="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
                      {{ resolvePlaceholders(camp.subheadline) }}
                    </p>
                  }
                </div>

                <!-- COUNTDOWN TIMER DISPLAY -->
                @if (camp.enableCountdown && countdown()) {
                  <div class="py-2 px-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                    <span class="block text-[9px] font-black uppercase tracking-widest text-zinc-400 text-center mb-1.5">
                      OFFER ENDS IN
                    </span>
                    <div class="grid grid-cols-4 gap-2 text-center font-mono">
                      <div class="bg-white dark:bg-zinc-900 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800">
                        <span class="block text-base font-black text-orange-600 dark:text-orange-400 leading-none">{{ countdown()?.days }}</span>
                        <span class="text-[8px] text-zinc-400 font-bold uppercase">Days</span>
                      </div>
                      <div class="bg-white dark:bg-zinc-900 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800">
                        <span class="block text-base font-black text-zinc-800 dark:text-zinc-200 leading-none">{{ countdown()?.hours }}</span>
                        <span class="text-[8px] text-zinc-400 font-bold uppercase">Hours</span>
                      </div>
                      <div class="bg-white dark:bg-zinc-900 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800">
                        <span class="block text-base font-black text-zinc-800 dark:text-zinc-200 leading-none">{{ countdown()?.minutes }}</span>
                        <span class="text-[8px] text-zinc-400 font-bold uppercase">Mins</span>
                      </div>
                      <div class="bg-white dark:bg-zinc-900 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800">
                        <span class="block text-base font-black text-zinc-800 dark:text-zinc-200 leading-none">{{ countdown()?.seconds }}</span>
                        <span class="text-[8px] text-zinc-400 font-bold uppercase">Secs</span>
                      </div>
                    </div>
                  </div>
                }

                <!-- COUPON CODE QUICK COPY BOX -->
                @if (camp.couponCode) {
                  <div class="flex items-center justify-between p-2.5 bg-orange-500/10 border border-dashed border-orange-500/40 rounded-xl">
                    <div class="flex items-center gap-2">
                      <mat-icon class="text-orange-500 text-sm">confirmation_number</mat-icon>
                      <span class="text-xs font-mono font-black uppercase text-orange-600 dark:text-orange-400 tracking-wider">
                        {{ camp.couponCode }}
                      </span>
                    </div>
                    <button
                      (click)="copyCoupon(camp.couponCode)"
                      class="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
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
                      class="w-full py-3.5 px-6 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg hover:shadow-orange-500/30 transition-all transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>{{ resolvePlaceholders(camp.ctaText || 'Claim Offer Now') }}</span>
                      <mat-icon class="text-sm">arrow_forward</mat-icon>
                    </button>
                  </div>
                }
              </div>
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
  `]
})
export class PromoPopupComponent implements OnInit, OnDestroy {
  public ds = inject(DatastoreService);
  public router = inject(Router);
  public toast = inject(ToastService);
  private platformId = inject(PLATFORM_ID);

  public isVisible = signal<boolean>(false);
  public activeCampaign = signal<any | null>(null);
  public countdown = signal<CountdownTime | null>(null);
  public isMobile = signal<boolean>(false);

  private timerId: any = null;
  private scrollListener: any = null;
  private exitListener: any = null;

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.checkDevice();
    this.evaluateEligibility();
  }

  ngOnDestroy() {
    this.clearTimer();
    this.removeListeners();
  }

  private checkDevice() {
    if (typeof window !== 'undefined') {
      this.isMobile.set(window.innerWidth < 768);
    }
  }

  public displayImageUrl = computed(() => {
    const camp = this.activeCampaign();
    if (!camp) return '';
    if (this.isMobile() && camp.mobileImageUrl) {
      return camp.mobileImageUrl;
    }
    return camp.imageUrl || camp.mediaUrl || '';
  });

  private evaluateEligibility() {
    const rawAds = this.ds.advertisements() || [];
    if (!rawAds.length) return;

    const now = new Date().getTime();
    const currentPath = this.router.url;

    // Filter campaigns for active, popup-enabled, non-expired items
    const eligible = rawAds.filter((ad: any) => {
      if (!ad) return false;
      // Must be marked popup or floating_popup placement
      const isPopup = ad.isPopup === true || ad.type === 'popup' || ad.placement === 'floating_popup';
      if (!isPopup) return false;

      // Status check
      const status = ad.status || 'active';
      if (status === 'draft' || status === 'paused' || status === 'archived') return false;

      // Schedule timeline
      if (ad.startDate) {
        const startMs = Date.parse(`${ad.startDate}T${ad.startTime || '00:00'}:00`);
        if (!isNaN(startMs) && now < startMs) return false;
      }
      if (ad.endDate) {
        const endMs = Date.parse(`${ad.endDate}T${ad.endTime || '23:59'}:59`);
        if (!isNaN(endMs) && now > endMs) return false;
      }

      // Page targeting
      const pageTarget = ad.pageTargeting || 'all';
      if (pageTarget === 'homepage' && currentPath !== '/' && currentPath !== '') return false;
      if (pageTarget === 'product_page' && !currentPath.includes('/products/')) return false;
      if (pageTarget === 'category_page' && !currentPath.includes('/categories/')) return false;
      if (pageTarget === 'cart' && !currentPath.includes('/cart')) return false;
      if (pageTarget === 'checkout' && !currentPath.includes('/checkout')) return false;
      if (pageTarget === 'specific_url' && ad.targetUrlPath && !currentPath.includes(ad.targetUrlPath)) return false;

      // Device targeting
      const dev = ad.deviceTargeting || 'all';
      if (dev === 'desktop' && this.isMobile()) return false;
      if (dev === 'mobile' && !this.isMobile()) return false;

      // Frequency capping check via localStorage
      if (typeof localStorage !== 'undefined') {
        const freq = ad.frequency || 'always';
        const keyPrefix = `3d_ad_${ad.id}`;

        if (freq === 'session' && sessionStorage.getItem(`${keyPrefix}_shown`)) {
          return false;
        }

        if (freq === 'daily') {
          const lastShown = localStorage.getItem(`${keyPrefix}_last_shown`);
          if (lastShown) {
            const lastDate = new Date(parseInt(lastShown, 10)).toDateString();
            if (lastDate === new Date().toDateString()) return false;
          }
        }

        if (freq === 'campaign' && localStorage.getItem(`${keyPrefix}_campaign_shown`)) {
          return false;
        }

        if (ad.maxImpressionsPerUser && ad.maxImpressionsPerUser > 0) {
          const count = parseInt(localStorage.getItem(`${keyPrefix}_impressions`) || '0', 10);
          if (count >= ad.maxImpressionsPerUser) return false;
        }
      }

      return true;
    });

    if (!eligible.length) return;

    // Pick highest priority campaign
    eligible.sort((a, b) => (b.priority || 1) - (a.priority || 1));
    const targetCampaign = eligible[0];
    this.activeCampaign.set(targetCampaign);

    // Setup popup trigger
    this.setupTrigger(targetCampaign);
  }

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
    this.isVisible.set(true);

    // Record impression analytics
    this.ds.recordAdImpression(camp.id);

    // Record frequency caps
    if (typeof localStorage !== 'undefined') {
      const keyPrefix = `3d_ad_${camp.id}`;
      sessionStorage.setItem(`${keyPrefix}_shown`, 'true');
      localStorage.setItem(`${keyPrefix}_last_shown`, Date.now().toString());
      localStorage.setItem(`${keyPrefix}_campaign_shown`, 'true');
      const count = parseInt(localStorage.getItem(`${keyPrefix}_impressions`) || '0', 10);
      localStorage.setItem(`${keyPrefix}_impressions`, (count + 1).toString());
    }

    // Start local countdown timer if enabled
    if (camp.enableCountdown) {
      this.startCountdown(camp);
    }
  }

  private startCountdown(camp: any) {
    this.clearTimer();

    let targetMs = 0;
    if (camp.endDate) {
      targetMs = Date.parse(`${camp.endDate}T${camp.endTime || '23:59'}:59`);
    } else if (camp.customEndDate) {
      targetMs = Date.parse(camp.customEndDate);
    } else {
      // Fallback: 24 hours from now
      targetMs = Date.now() + 24 * 60 * 60 * 1000;
    }

    const updateTimer = () => {
      const nowMs = new Date().getTime();
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
  }

  private removeListeners() {
    if (this.scrollListener && typeof window !== 'undefined') {
      window.removeEventListener('scroll', this.scrollListener);
    }
    if (this.exitListener && typeof document !== 'undefined') {
      document.removeEventListener('mouseleave', this.exitListener);
    }
  }

  public closePopup() {
    this.isVisible.set(false);
    this.clearTimer();
  }

  public onBackdropClick() {
    const camp = this.activeCampaign();
    if (camp && camp.allowOutsideClickClose !== false) {
      this.closePopup();
    }
  }

  public copyCoupon(code: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      this.toast.success(`Coupon ${code} copied to clipboard!`);
    }
  }

  public onCtaClick(camp: any) {
    this.ds.recordAdClick(camp.id);
    this.closePopup();

    const targetUrl = camp.ctaUrl || camp.linkUrl || camp.targetUrl || '';
    const action = camp.ctaAction || 'open_url';

    if (action === 'open_coupon' && camp.couponCode) {
      this.copyCoupon(camp.couponCode);
    } else if (action === 'open_cart') {
      this.router.navigate(['/cart']);
    } else if (action === 'open_whatsapp') {
      const waNumber = this.ds.settingsService.settingsData()?.supportSettings?.whatsappNumber || '919876543210';
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

  public getPositionClasses(pos: string): string {
    switch (pos) {
      case 'bottom_right': return 'bottom-6 right-6';
      case 'bottom_left': return 'bottom-6 left-6';
      case 'top_right': return 'top-6 right-6';
      case 'top_left': return 'top-6 left-6';
      case 'fullscreen': return 'inset-4 sm:inset-10 flex items-center justify-center';
      case 'center':
      default:
        return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
    }
  }

  public getSizeClasses(size: string): string {
    switch (size) {
      case 'small': return 'max-w-xs w-full';
      case 'large': return 'max-w-xl w-full';
      case 'full_width': return 'max-w-3xl w-full';
      case 'medium':
      default:
        return 'max-w-md w-full';
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
