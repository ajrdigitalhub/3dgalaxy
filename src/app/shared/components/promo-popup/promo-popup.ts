import { Component, ChangeDetectionStrategy, inject, computed, signal, OnInit, OnDestroy, PLATFORM_ID, effect } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { DatastoreService, Advertisement } from '../../../services/datastore';
import { NotificationService } from '../../../services/notification.service';
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
          class="fixed inset-0 z-50 transition-opacity duration-300 animate-fadeIn"
          [class.bg-black-30]="camp.overlay === 'light'"
          [class.bg-black-70]="camp.overlay === 'dark'"
          [class.bg-black-50-blur]="camp.overlay === 'blur'"
          [class.pointer-events-none]="camp.overlay === 'none'"
          (click)="onBackdropClick($event)"
        >
          <!-- POPUP CONTAINER -->
          <div
            class="fixed z-50 p-3 sm:p-4 transition-all duration-300 pointer-events-auto"
            [ngClass]="getPositionClasses(camp.popupPosition || 'center')"
          >
            <div
              class="relative rounded-3xl overflow-hidden group flex flex-col transition-all duration-300"
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
              (click)="$event.stopPropagation()"
            >
              <!-- CLOSE BUTTON -->
              @if (camp.showCloseButton !== false) {
                <button
                  type="button"
                  (click)="closePopup($event)"
                  class="absolute top-3 right-3 z-30 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer shadow-lg border border-white/20 hover:scale-110 active:scale-95"
                  aria-label="Close popup"
                >
                  <mat-icon class="text-lg">close</mat-icon>
                </button>
              }

              <!-- CAMPAIGN IMAGE -->
              @if (displayImageUrl()) {
                <div
                  class="relative w-full overflow-hidden flex items-center justify-center group"
                  [class.cursor-pointer]="(camp.imageClickAction || 'no_action') !== 'no_action'"
                  [class.rounded-3xl]="isImgOnly"
                  (click)="onImageClick(camp)"
                >
                  <img
                    [src]="displayImageUrl()"
                    [alt]="camp.headline || camp.title || 'Promotional Offer'"
                    class="max-w-full max-h-[82vh] w-auto h-auto object-contain transition-transform duration-500 group-hover:scale-[1.01] block"
                    [class.rounded-3xl]="isImgOnly"
                    [class.drop-shadow-2xl]="isImgOnly"
                    loading="lazy"
                  />
                  @if (camp.discountText && !isImgOnly) {
                    <div class="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-lg z-20">
                      {{ camp.discountText }}
                    </div>
                  }
                </div>
              }

              <!-- CAMPAIGN TEXT CONTENT (Only rendered if NOT in Image-Only mode) -->
              @if (!isImgOnly) {
                <div class="p-6 space-y-4 text-center sm:text-left bg-white dark:bg-zinc-900">
                  <div>
                    @if (camp.type) {
                      <span class="inline-block text-[9px] font-black uppercase tracking-widest text-orange-500 bg-orange-500/10 px-2.5 py-0.5 rounded-full mb-1">
                        {{ camp.type.replace('_', ' ') }}
                      </span>
                    }
                    @if (camp.headline || camp.title) {
                      <h3 class="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white leading-tight">
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
  `]
})
export class PromoPopupComponent implements OnInit, OnDestroy {
  public ds = inject(DatastoreService);
  public ns = inject(NotificationService);
  public router = inject(Router);
  public toast = inject(ToastService);
  private platformId = inject(PLATFORM_ID);

  public isVisible = signal<boolean>(false);
  public activeCampaign = signal<any | null>(null);
  public countdown = signal<CountdownTime | null>(null);
  public isMobile = signal<boolean>(false);
  public dismissedCampaignIds = new Set<string>();

  private timerId: any = null;
  private scrollListener: any = null;
  private exitListener: any = null;
  private lastEvaluatedPath = '';

  constructor() {
    // Reactive Effect listening to Campaign data, Auth changes, Notification permission state
    effect(() => {
      const ads = this.ds.advertisements();
      const currentUser = this.ds.currentUser();
      const currentUrl = this.router.url;

      if (!isPlatformBrowser(this.platformId)) return;

      this.devLog(`Effect triggered — Ads count: ${ads.length}, User: ${currentUser?.email || 'Guest'}`);
      this.evaluateEligibility();
    });
  }

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.checkDevice();
    // Ensure initial advertisements fetch is initiated
    this.ds.reloadAdvertisements();
  }

  ngOnDestroy() {
    this.clearTimer();
    this.removeListeners();
  }

  private devLog(...args: any[]) {
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || (window as any).__DEBUG_CAMPAIGNS__)) {
      console.log('[Campaign]', ...args);
    }
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

  private getVisitorState() {
    const currentUser = this.ds.currentUser();
    const isLoggedIn = !!currentUser;
    const isGuest = !isLoggedIn;

    let hasReturningMarker = false;
    if (typeof localStorage !== 'undefined') {
      hasReturningMarker = localStorage.getItem('3dgalaxy_returning_visitor') === 'true';
    }

    let isNewAccount = false;
    if (currentUser && currentUser.metadata && currentUser.metadata.creationTime) {
      const createdMs = Date.parse(currentUser.metadata.creationTime);
      const ageMs = Date.now() - createdMs;
      if (ageMs < 24 * 60 * 60 * 1000) {
        isNewAccount = true;
      }
    }

    const isNewVisitor = !hasReturningMarker && (isGuest || isNewAccount);
    const isReturningVisitor = hasReturningMarker || (isLoggedIn && !isNewAccount);

    return { isGuest, isLoggedIn, isNewVisitor, isReturningVisitor };
  }

  private isAudienceMatching(adAudience: string | undefined, visitorState: any): boolean {
    const audience = (adAudience || 'all').toLowerCase();

    if (audience === 'all' || audience === 'everyone') {
      return true;
    }
    if ((audience === 'guests_only' || audience === 'guest') && visitorState.isGuest) {
      return true;
    }
    if ((audience === 'logged_in' || audience === 'authenticated') && visitorState.isLoggedIn) {
      return true;
    }
    if ((audience === 'new_users_only' || audience === 'new_user') && visitorState.isNewVisitor) {
      return true;
    }
    if ((audience === 'returning_users_only' || audience === 'returning_user') && visitorState.isReturningVisitor) {
      return true;
    }

    return false;
  }

  private isFrequencyAllowed(ad: any): boolean {
    if (!ad || !ad.id) return false;
    if (this.dismissedCampaignIds.has(String(ad.id))) return false;
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(`3d_ad_dismissed_${ad.id}`)) {
      return false;
    }
    if (typeof localStorage === 'undefined') return true;

    const freq = (ad.frequency || 'always').toLowerCase();
    const keyPrefix = `3d_ad_${ad.id}`;

    if (freq === 'session' && sessionStorage.getItem(`${keyPrefix}_session_shown`)) {
      return false;
    }

    if (freq === 'daily' || freq === 'once_per_day') {
      const lastShown = localStorage.getItem(`${keyPrefix}_last_shown_date`);
      if (lastShown && lastShown === new Date().toDateString()) {
        return false;
      }
    }

    if (freq === 'campaign' || freq === 'once_per_campaign') {
      if (localStorage.getItem(`${keyPrefix}_campaign_shown`)) {
        return false;
      }
    }

    if (ad.maxImpressionsPerUser && ad.maxImpressionsPerUser > 0) {
      const count = parseInt(localStorage.getItem(`${keyPrefix}_impressions_count`) || '0', 10);
      if (count >= ad.maxImpressionsPerUser) {
        return false;
      }
    }

    return true;
  }

  public evaluateEligibility() {
    if (!isPlatformBrowser(this.platformId)) return;

    const rawAds = this.ds.advertisements() || [];
    this.devLog(`API loaded: ${rawAds.length} total advertisements`);

    if (!rawAds.length) return;

    // Check notification prompt state so modal popups don't clash
    if (this.ns.isPromptVisible) {
      this.devLog('Notification permission prompt is currently active. Deferring popup evaluation.');
      setTimeout(() => this.evaluateEligibility(), 2500);
      return;
    }

    const now = new Date().getTime();
    const currentPath = this.router.url;
    const visitorState = this.getVisitorState();

    this.devLog(`Visitor state: Guest=${visitorState.isGuest}, LoggedIn=${visitorState.isLoggedIn}, NewVisitor=${visitorState.isNewVisitor}, ReturningVisitor=${visitorState.isReturningVisitor}`);

    // Filter campaigns for active, popup-enabled, matching audience & route
    const eligible = rawAds.filter((ad: any) => {
      if (!ad || !ad.id) return false;
      if (this.dismissedCampaignIds.has(String(ad.id))) return false;
      if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(`3d_ad_dismissed_${ad.id}`)) return false;

      // Must be marked popup or floating_popup placement
      const isPopup = ad.isPopup === true || ad.type === 'popup' || ad.placement === 'floating_popup';
      if (!isPopup) return false;

      // Status check
      const status = (ad.status || 'active').toLowerCase();
      if (status === 'draft' || status === 'paused' || status === 'archived') return false;

      // Schedule timeline check
      if (ad.startDate) {
        const startMs = Date.parse(`${ad.startDate}T${ad.startTime || '00:00'}:00`);
        if (!isNaN(startMs) && now < startMs) return false;
      }
      if (ad.endDate) {
        const endMs = Date.parse(`${ad.endDate}T${ad.endTime || '23:59'}:59`);
        if (!isNaN(endMs) && now > endMs) return false;
      }

      // Audience targeting check
      if (!this.isAudienceMatching(ad.audience, visitorState)) {
        this.devLog(`Campaign "${ad.name || ad.id}" skipped due to audience mismatch (${ad.audience})`);
        return false;
      }

      // Page targeting check
      const pageTarget = ad.pageTargeting || 'all';
      if (pageTarget === 'homepage' && currentPath !== '/' && currentPath !== '') return false;
      if (pageTarget === 'product_page' && !currentPath.includes('/products/')) return false;
      if (pageTarget === 'category_page' && !currentPath.includes('/categories/')) return false;
      if (pageTarget === 'cart' && !currentPath.includes('/cart')) return false;
      if (pageTarget === 'checkout' && !currentPath.includes('/checkout')) return false;
      if (pageTarget === 'specific_url' && ad.targetUrlPath && !currentPath.includes(ad.targetUrlPath)) return false;

      // Device targeting check
      const dev = ad.deviceTargeting || 'all';
      if (dev === 'desktop' && this.isMobile()) return false;
      if (dev === 'mobile' && !this.isMobile()) return false;

      // Frequency capping check
      if (!this.isFrequencyAllowed(ad)) {
        this.devLog(`Campaign "${ad.name || ad.id}" skipped due to frequency capping (${ad.frequency})`);
        return false;
      }

      return true;
    });

    this.devLog(`Eligible campaigns count: ${eligible.length}`);
    if (!eligible.length) {
      // If currently active campaign is no longer eligible (e.g. user logged in), hide it
      if (this.isVisible()) {
        this.closePopup();
      }
      return;
    }

    // Sort by priority (highest priority first)
    eligible.sort((a, b) => (b.priority || 1) - (a.priority || 1));
    const targetCampaign = eligible[0];

    // Avoid re-triggering same popup if already displaying
    if (this.isVisible() && this.activeCampaign()?.id === targetCampaign.id) {
      return;
    }

    this.activeCampaign.set(targetCampaign);
    this.setupTrigger(targetCampaign);
  }

  private setupTrigger(camp: any) {
    const trigger = camp.trigger || 'immediate';
    this.devLog(`Setting up trigger "${trigger}" for campaign "${camp.name || camp.id}"`);

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
    if (this.dismissedCampaignIds.has(String(camp.id))) return;
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(`3d_ad_dismissed_${camp.id}`)) return;

    this.isVisible.set(true);

    // Record impression analytics via API
    this.ds.recordAdImpression(camp.id);

    // Record isolated frequency caps for this specific campaign
    if (typeof localStorage !== 'undefined') {
      const keyPrefix = `3d_ad_${camp.id}`;
      sessionStorage.setItem(`${keyPrefix}_session_shown`, 'true');
      localStorage.setItem(`${keyPrefix}_last_shown_date`, new Date().toDateString());
      localStorage.setItem(`${keyPrefix}_last_shown_time`, Date.now().toString());
      localStorage.setItem(`${keyPrefix}_campaign_shown`, 'true');

      const count = parseInt(localStorage.getItem(`${keyPrefix}_impressions_count`) || '0', 10);
      localStorage.setItem(`${keyPrefix}_impressions_count`, (count + 1).toString());

      // Mark user as returning visitor for subsequent checks
      localStorage.setItem('3dgalaxy_returning_visitor', 'true');
    }

    if (camp.enableCountdown) {
      this.startCountdown(camp);
    }

    this.devLog(`Popup DISPLAYED: ${camp.name || camp.id}`);
  }

  private startCountdown(camp: any) {
    this.clearTimer();

    let targetMs = 0;
    if (camp.endDate) {
      targetMs = Date.parse(`${camp.endDate}T${camp.endTime || '23:59'}:59`);
    } else if (camp.customEndDate) {
      targetMs = Date.parse(camp.customEndDate);
    } else {
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

  public closePopup(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const camp = this.activeCampaign();
    if (camp && camp.id) {
      this.dismissedCampaignIds.add(String(camp.id));
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(`3d_ad_dismissed_${camp.id}`, 'true');
      }
    }
    this.isVisible.set(false);
    this.activeCampaign.set(null);
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

  public isImageOnlyMode(camp: any): boolean {
    if (!camp) return false;
    if (camp.contentMode === 'IMAGE_ONLY' || camp.contentMode === 'IMAGE_CLOSE' || camp.showImageOnly || camp.hideHeader) return true;
    const hasHeadline = !!(camp.headline && String(camp.headline).trim());
    const hasTitle = !!(camp.title && String(camp.title).trim());
    const hasSubheadline = !!(camp.subheadline && String(camp.subheadline).trim());
    return !hasHeadline && !hasTitle && !hasSubheadline;
  }

  public getSizeClasses(size: string, isImgOnly: boolean = false): string {
    if (isImgOnly || size === 'auto') {
      return 'max-w-[92vw] sm:max-w-[85vw] md:max-w-2xl lg:max-w-3xl w-auto max-h-[88vh]';
    }
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
