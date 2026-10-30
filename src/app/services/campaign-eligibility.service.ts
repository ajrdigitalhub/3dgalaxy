import { Injectable, inject, signal, computed, effect, PLATFORM_ID, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { DatastoreService, Advertisement } from './datastore';
import { NotificationService } from './notification.service';
import { filter } from 'rxjs';

export interface VisitorState {
  isGuest: boolean;
  isLoggedIn: boolean;
  isNewVisitor: boolean;
  isReturningVisitor: boolean;
  authReady: boolean;
}

export interface EligibilityResult {
  eligible: boolean;
  reason?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CampaignEligibilityService {
  private ds = inject(DatastoreService);
  private ns = inject(NotificationService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private ngZone = inject(NgZone);

  // Currently eligible top-priority campaign ready for storefront display
  public eligibleCampaign = signal<any | null>(null);
  public isEvaluating = signal<boolean>(false);

  // Dismissed campaigns tracked in memory and session
  public dismissedCampaignIds = new Set<string>();
  public sessionShownCampaignIds = new Set<string>();

  // Device dimension signals
  public isMobile = signal<boolean>(false);
  public windowWidth = signal<number>(typeof window !== 'undefined' ? window.innerWidth : 1024);
  public windowHeight = signal<number>(typeof window !== 'undefined' ? window.innerHeight : 768);

  private evaluationTimeoutId: any = null;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.updateDeviceDimensions();

      if (typeof window !== 'undefined') {
        window.addEventListener('resize', () => {
          this.ngZone.run(() => this.updateDeviceDimensions());
        }, { passive: true });
      }

      // Listen to Router URL changes to re-evaluate page targeting
      this.router.events
        .pipe(filter(event => event instanceof NavigationEnd))
        .subscribe(() => {
          this.scheduleEvaluation('route_change');
        });

      // Reactive Effect tracking campaigns, auth state, and notification prompt visibility
      effect(() => {
        const ads = this.ds.advertisements();
        const user = this.ds.currentUser();
        const authReady = this.ds.authReady();
        const promptActive = this.ns.isPromptVisible;

        this.scheduleEvaluation('reactive_state_change');
      });
    }
  }

  private devLog(...args: any[]) {
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || (window as any).__DEBUG_CAMPAIGNS__)) {
      console.log('[CampaignEligibility]', ...args);
    }
  }

  public updateDeviceDimensions() {
    if (typeof window !== 'undefined') {
      this.windowWidth.set(window.innerWidth);
      this.windowHeight.set(window.innerHeight);
      this.isMobile.set(window.innerWidth < 768);
    }
  }

  public scheduleEvaluation(triggerReason: string = 'unknown') {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.evaluationTimeoutId) {
      clearTimeout(this.evaluationTimeoutId);
    }
    // Small debounce to let auth state and route settle
    this.evaluationTimeoutId = setTimeout(() => {
      this.evaluate(triggerReason);
    }, 150);
  }

  public getVisitorState(): VisitorState {
    const authReady = this.ds.authReady();
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

    return {
      isGuest,
      isLoggedIn,
      isNewVisitor,
      isReturningVisitor,
      authReady
    };
  }

  /**
   * Parse date and time taking timezone into account.
   * Default timezone: Asia/Kolkata (+05:30)
   */
  public parseScheduleTimestamp(dateStr?: string, timeStr?: string, timezoneStr?: string): number | null {
    if (!dateStr || !dateStr.trim()) return null;

    const cleanDate = dateStr.trim();
    const cleanTime = (timeStr && timeStr.trim()) ? timeStr.trim() : '00:00';
    const formattedTime = cleanTime.length === 5 ? `${cleanTime}:00` : cleanTime;

    // Timezone offset mapping or ISO construction
    const tz = (timezoneStr || 'Asia/Kolkata').trim();
    let offset = '+05:30'; // Default IST

    if (tz === 'UTC' || tz === 'GMT') {
      offset = 'Z';
    } else if (tz === 'America/New_York' || tz === 'EST') {
      offset = '-05:00';
    } else if (tz === 'America/Los_Angeles' || tz === 'PST') {
      offset = '-08:00';
    } else if (tz === 'Europe/London' || tz === 'BST') {
      offset = '+01:00';
    } else if (tz === 'Asia/Dubai') {
      offset = '+04:00';
    } else if (tz === 'Asia/Singapore') {
      offset = '+08:00';
    }

    // Attempt parsing ISO formatted with explicit timezone offset
    const isoString = offset === 'Z' 
      ? `${cleanDate}T${formattedTime}Z`
      : `${cleanDate}T${formattedTime}${offset}`;

    const parsed = Date.parse(isoString);
    if (!isNaN(parsed)) {
      return parsed;
    }

    // Fallback to local Date.parse
    const fallback = Date.parse(`${cleanDate}T${formattedTime}`);
    return isNaN(fallback) ? null : fallback;
  }

  /**
   * Verify audience targeting against resolved visitor state.
   */
  public isAudienceMatching(adAudience: string | undefined, visitorState: VisitorState): boolean {
    const audience = (adAudience || 'all').toLowerCase().trim();

    if (audience === 'all' || audience === 'everyone') {
      return true;
    }

    // If auth state has not yet resolved, avoid flashing wrong audience campaigns
    if (!visitorState.authReady) {
      return false;
    }

    if ((audience === 'guests_only' || audience === 'guest') && visitorState.isGuest) {
      return true;
    }

    if ((audience === 'logged_in' || audience === 'authenticated' || audience === 'customers') && visitorState.isLoggedIn) {
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

  /**
   * Check route and page targeting eligibility.
   */
  public isRouteMatching(ad: any, currentPath: string): boolean {
    const pageTarget = (ad.pageTargeting || 'all').toLowerCase().trim();

    if (pageTarget === 'all') return true;

    // Homepage targeting
    if (pageTarget === 'homepage') {
      return currentPath === '/' || currentPath === '' || currentPath.startsWith('/?');
    }

    // Product pages
    if (pageTarget === 'product_page' || pageTarget === 'product') {
      return currentPath.includes('/products/') || currentPath === '/products';
    }

    // Category pages
    if (pageTarget === 'category_page' || pageTarget === 'category') {
      return currentPath.includes('/categories/') || currentPath === '/categories';
    }

    // Cart
    if (pageTarget === 'cart') {
      return currentPath.includes('/cart');
    }

    // Checkout
    if (pageTarget === 'checkout') {
      return currentPath.includes('/checkout');
    }

    // Specific URL path
    if (pageTarget === 'specific_url' || pageTarget === 'custom') {
      const targetPath = (ad.targetUrlPath || ad.targetUrl || '').trim();
      return !!targetPath && currentPath.includes(targetPath);
    }

    return true;
  }

  /**
   * Check device targeting: all, desktop, or mobile.
   */
  public isDeviceMatching(deviceTarget: string | undefined, isMobile: boolean): boolean {
    const dev = (deviceTarget || 'all').toLowerCase().trim();
    if (dev === 'all') return true;
    if (dev === 'desktop') return !isMobile;
    if (dev === 'mobile') return isMobile;
    return true;
  }

  /**
   * Check frequency capping, cooldown, and impressions.
   */
  public isFrequencyAllowed(ad: any, nowMs: number = Date.now()): boolean {
    if (!ad || !ad.id) return false;
    const adId = String(ad.id);

    // Dismissal suppression
    if (this.dismissedCampaignIds.has(adId)) return false;
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(`3d_ad_dismissed_${adId}`)) {
      return false;
    }

    // Frequency checks
    const freq = (ad.frequency || 'always').toLowerCase().trim();
    const keyPrefix = `3d_ad_${adId}`;

    if (typeof sessionStorage !== 'undefined') {
      if (freq === 'session' && (this.sessionShownCampaignIds.has(adId) || sessionStorage.getItem(`${keyPrefix}_session_shown`))) {
        return false;
      }
    }

    if (typeof localStorage !== 'undefined') {
      // Cooldown in hours/days if configured
      const lastShownMsStr = localStorage.getItem(`${keyPrefix}_last_shown_time`);
      if (lastShownMsStr) {
        const lastShownMs = Number(lastShownMsStr);
        if (ad.frequencyHours && ad.frequencyHours > 0) {
          const hoursPassed = (nowMs - lastShownMs) / (1000 * 60 * 60);
          if (hoursPassed < ad.frequencyHours) return false;
        }
        if (ad.frequencyDays && ad.frequencyDays > 0) {
          const daysPassed = (nowMs - lastShownMs) / (1000 * 60 * 60 * 24);
          if (daysPassed < ad.frequencyDays) return false;
        }
      }

      // Once per day check
      if (freq === 'daily' || freq === 'once_per_day') {
        const lastShownDate = localStorage.getItem(`${keyPrefix}_last_shown_date`);
        if (lastShownDate && lastShownDate === new Date(nowMs).toDateString()) {
          return false;
        }
      }

      // Once per campaign check
      if (freq === 'campaign' || freq === 'once_per_campaign') {
        if (localStorage.getItem(`${keyPrefix}_campaign_shown`)) {
          return false;
        }
      }

      // Max impressions per user
      if (ad.maxImpressionsPerUser && ad.maxImpressionsPerUser > 0) {
        const count = parseInt(localStorage.getItem(`${keyPrefix}_impressions_count`) || '0', 10);
        if (count >= ad.maxImpressionsPerUser) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Complete 8-point eligibility assessment for a single campaign.
   */
  public checkEligibility(
    ad: any,
    visitorState: VisitorState,
    currentPath: string,
    isMobile: boolean,
    nowMs: number = Date.now()
  ): EligibilityResult {
    if (!ad || !ad.id) {
      return { eligible: false, reason: 'Invalid campaign or missing ID' };
    }

    // 1. Popup Type check
    const isPopupType = ad.isPopup === true || ad.type === 'popup' || ad.type === 'image_only' || ad.type === 'image_popup' || ad.placement === 'floating_popup';
    if (!isPopupType) {
      return { eligible: false, reason: 'Campaign is not a popup' };
    }

    // 2. Status check (must be active or enabled)
    const status = (ad.status || (ad.enabled ? 'active' : 'draft')).toLowerCase().trim();
    if (status !== 'active') {
      return { eligible: false, reason: `Campaign status is ${status}` };
    }

    // 3. Schedule & Timezone check
    if (ad.startDate) {
      const startMs = this.parseScheduleTimestamp(ad.startDate, ad.startTime || '00:00', ad.timezone);
      if (startMs !== null && nowMs < startMs) {
        return { eligible: false, reason: 'Campaign schedule has not started' };
      }
    }
    if (ad.endDate) {
      const endMs = this.parseScheduleTimestamp(ad.endDate, ad.endTime || '23:59', ad.timezone);
      if (endMs !== null && nowMs > endMs) {
        return { eligible: false, reason: 'Campaign schedule has expired' };
      }
    }

    // 4. Visitor Audience Targeting
    if (!this.isAudienceMatching(ad.audience, visitorState)) {
      return { eligible: false, reason: `Audience mismatch (${ad.audience || 'all'})` };
    }

    // 5. Page / Route Targeting
    if (!this.isRouteMatching(ad, currentPath)) {
      return { eligible: false, reason: `Route mismatch (${ad.pageTargeting || 'all'} vs ${currentPath})` };
    }

    // 6. Device Targeting
    if (!this.isDeviceMatching(ad.deviceTargeting, isMobile)) {
      return { eligible: false, reason: `Device mismatch (${ad.deviceTargeting || 'all'})` };
    }

    // 7 & 8. Frequency Capping, Cooldown, and Dismissal Suppression
    if (!this.isFrequencyAllowed(ad, nowMs)) {
      return { eligible: false, reason: `Frequency or dismissal limit reached (${ad.frequency || 'always'})` };
    }

    return { eligible: true };
  }

  /**
   * Main evaluation runner: filters all campaigns, ranks by priority, and selects winner.
   */
  public evaluate(triggerReason: string = 'manual') {
    if (!isPlatformBrowser(this.platformId)) return;

    this.isEvaluating.set(true);

    const rawAds = this.ds.advertisements() || [];
    if (!rawAds.length) {
      this.devLog('No advertisements found in datastore.');
      this.eligibleCampaign.set(null);
      this.isEvaluating.set(false);
      return;
    }

    // Check if notification permission prompt is currently active
    // If active, defer popup evaluation until prompt finishes
    if (this.ns.isPromptVisible) {
      this.devLog('Notification prompt is active; deferring promo popup evaluation.');
      this.isEvaluating.set(false);
      return;
    }

    const timeSincePrompt = Date.now() - this.ns.promptDismissedTime();
    if (this.ns.promptDismissedTime() > 0 && timeSincePrompt < 8000) {
      this.devLog('Notification prompt was recently active; deferring promo popup evaluation.');
      this.isEvaluating.set(false);
      setTimeout(() => this.scheduleEvaluation('prompt_cooldown_elapsed'), 8000 - timeSincePrompt + 1000);
      return;
    }

    const currentPath = this.router.url;
    const visitorState = this.getVisitorState();
    const isMobile = this.isMobile();
    const nowMs = Date.now();

    this.devLog(`Evaluating campaigns [Reason: ${triggerReason}]. Total ads: ${rawAds.length}. AuthReady: ${visitorState.authReady}, Guest: ${visitorState.isGuest}`);

    const eligibleList = rawAds.filter(ad => {
      const result = this.checkEligibility(ad, visitorState, currentPath, isMobile, nowMs);
      if (!result.eligible) {
        this.devLog(`Ad [${ad.name || ad.id}] excluded: ${result.reason}`);
      }
      return result.eligible;
    });

    this.devLog(`Eligible campaigns found: ${eligibleList.length}`);

    if (eligibleList.length === 0) {
      this.eligibleCampaign.set(null);
      this.isEvaluating.set(false);
      return;
    }

    // Sort by priority descending (higher number = higher priority)
    eligibleList.sort((a, b) => {
      const prioA = typeof a.priority === 'number' ? a.priority : 1;
      const prioB = typeof b.priority === 'number' ? b.priority : 1;
      return prioB - prioA;
    });

    const topCampaign = eligibleList[0];
    this.eligibleCampaign.set(topCampaign);
    this.isEvaluating.set(false);
  }

  /**
   * Record that a campaign has been shown to update frequency tracking.
   */
  public recordCampaignDisplay(camp: any) {
    if (!camp || !camp.id) return;
    const adId = String(camp.id);
    this.sessionShownCampaignIds.add(adId);

    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(`3d_ad_${adId}_session_shown`, 'true');
    }

    if (typeof localStorage !== 'undefined') {
      const keyPrefix = `3d_ad_${adId}`;
      localStorage.setItem(`${keyPrefix}_last_shown_date`, new Date().toDateString());
      localStorage.setItem(`${keyPrefix}_last_shown_time`, Date.now().toString());
      localStorage.setItem(`${keyPrefix}_campaign_shown`, 'true');

      const count = parseInt(localStorage.getItem(`${keyPrefix}_impressions_count`) || '0', 10);
      localStorage.setItem(`${keyPrefix}_impressions_count`, (count + 1).toString());

      // Mark returning visitor
      localStorage.setItem('3dgalaxy_returning_visitor', 'true');
    }
  }

  /**
   * Dismiss campaign and suppress redisplay according to configuration.
   */
  public dismissCampaign(camp: any) {
    if (!camp || !camp.id) return;
    const adId = String(camp.id);

    this.dismissedCampaignIds.add(adId);

    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(`3d_ad_dismissed_${adId}`, 'true');
    }

    if (this.eligibleCampaign()?.id === camp.id) {
      this.eligibleCampaign.set(null);
    }
  }
}
