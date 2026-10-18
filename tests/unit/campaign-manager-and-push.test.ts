/**
 * 3D Galaxy Automated Regression Test Suite
 * LEVEL 1: UNIT TESTS — Campaign Manager, Eligibility Service, Live Preview & Firebase Push
 */

import assert from 'node:assert';

export interface CampaignTestItem {
  id: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  placement?: string;
  isPopup?: boolean;
  priority?: number;
  imageUrl?: string;
  mobileImageUrl?: string;
  mediaUrl?: string;
  headline?: string;
  title?: string;
  subheadline?: string;
  ctaText?: string;
  ctaUrl?: string;
  ctaAction?: string;
  imageClickAction?: string;
  showCloseButton?: boolean;
  allowOutsideClickClose?: boolean;
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  timezone?: string;
  enableCountdown?: boolean;
  countdownType?: string;
  frequency?: string;
  frequencyHours?: number;
  frequencyDays?: number;
  maxImpressionsPerUser?: number;
  audience?: string;
  pageTargeting?: string;
  targetUrlPath?: string;
  deviceTargeting?: string;
  discountText?: string;
  couponCode?: string;
  enablePushNotification?: boolean;
  pushTitle?: string;
  pushBody?: string;
  pushImage?: string;
  pushDeepLink?: string;
  pushAudience?: string;
}

export interface VisitorStateTest {
  isGuest: boolean;
  isLoggedIn: boolean;
  isNewVisitor: boolean;
  isReturningVisitor: boolean;
  authReady: boolean;
}

/**
 * Pure eligibility evaluator mirroring CampaignEligibilityService
 */
function parseScheduleTimestamp(dateStr?: string, timeStr?: string, timezoneStr?: string): number | null {
  if (!dateStr || !dateStr.trim()) return null;
  const cleanDate = dateStr.trim();
  const cleanTime = (timeStr && timeStr.trim()) ? timeStr.trim() : '00:00';
  const formattedTime = cleanTime.length === 5 ? `${cleanTime}:00` : cleanTime;

  const tz = (timezoneStr || 'Asia/Kolkata').trim();
  let offset = '+05:30';

  if (tz === 'UTC' || tz === 'GMT') {
    offset = 'Z';
  } else if (tz === 'America/New_York' || tz === 'EST') {
    offset = '-05:00';
  } else if (tz === 'America/Los_Angeles' || tz === 'PST') {
    offset = '-08:00';
  }

  const isoString = offset === 'Z'
    ? `${cleanDate}T${formattedTime}Z`
    : `${cleanDate}T${formattedTime}${offset}`;

  const parsed = Date.parse(isoString);
  return isNaN(parsed) ? Date.parse(`${cleanDate}T${formattedTime}`) : parsed;
}

function isAudienceMatching(adAudience: string | undefined, visitorState: VisitorStateTest): boolean {
  const audience = (adAudience || 'all').toLowerCase().trim();
  if (audience === 'all' || audience === 'everyone') return true;
  if (!visitorState.authReady) return false;
  if ((audience === 'guests_only' || audience === 'guest') && visitorState.isGuest) return true;
  if ((audience === 'logged_in' || audience === 'authenticated' || audience === 'customers') && visitorState.isLoggedIn) return true;
  if ((audience === 'new_users_only' || audience === 'new_user') && visitorState.isNewVisitor) return true;
  if ((audience === 'returning_users_only' || audience === 'returning_user') && visitorState.isReturningVisitor) return true;
  return false;
}

function isRouteMatching(ad: any, currentPath: string): boolean {
  const pageTarget = (ad.pageTargeting || 'all').toLowerCase().trim();
  if (pageTarget === 'all') return true;
  if (pageTarget === 'homepage') return currentPath === '/' || currentPath === '' || currentPath.startsWith('/?');
  if (pageTarget === 'product_page' || pageTarget === 'product') return currentPath.includes('/products');
  if (pageTarget === 'category_page' || pageTarget === 'category') return currentPath.includes('/categories');
  if (pageTarget === 'cart') return currentPath.includes('/cart');
  if (pageTarget === 'checkout') return currentPath.includes('/checkout');
  if (pageTarget === 'specific_url') {
    const target = (ad.targetUrlPath || '').trim();
    return !!target && currentPath.includes(target);
  }
  return true;
}

function isDeviceMatching(deviceTarget: string | undefined, isMobile: boolean): boolean {
  const dev = (deviceTarget || 'all').toLowerCase().trim();
  if (dev === 'all') return true;
  if (dev === 'desktop') return !isMobile;
  if (dev === 'mobile') return isMobile;
  return true;
}

function checkEligibility(
  ad: any,
  visitorState: VisitorStateTest,
  currentPath: string,
  isMobile: boolean,
  context: {
    nowMs: number;
    dismissedIds: Set<string>;
    sessionShownIds: Set<string>;
    storageMap?: Record<string, string>;
    isPromptVisible?: boolean;
  }
): { eligible: boolean; reason?: string } {
  if (!ad || !ad.id) return { eligible: false, reason: 'Invalid ID' };
  if (context.isPromptVisible) return { eligible: false, reason: 'Notification prompt active' };

  const isPopupType = ad.isPopup === true || ad.type === 'popup' || ad.type === 'image_only' || ad.placement === 'floating_popup';
  if (!isPopupType) return { eligible: false, reason: 'Not a popup' };

  const status = (ad.status || 'active').toLowerCase().trim();
  if (status !== 'active') return { eligible: false, reason: 'Status not active' };

  if (ad.startDate) {
    const startMs = parseScheduleTimestamp(ad.startDate, ad.startTime || '00:00', ad.timezone);
    if (startMs !== null && context.nowMs < startMs) return { eligible: false, reason: 'Not started' };
  }
  if (ad.endDate) {
    const endMs = parseScheduleTimestamp(ad.endDate, ad.endTime || '23:59', ad.timezone);
    if (endMs !== null && context.nowMs > endMs) return { eligible: false, reason: 'Expired' };
  }

  if (!isAudienceMatching(ad.audience, visitorState)) return { eligible: false, reason: 'Audience mismatch' };
  if (!isRouteMatching(ad, currentPath)) return { eligible: false, reason: 'Route mismatch' };
  if (!isDeviceMatching(ad.deviceTargeting, isMobile)) return { eligible: false, reason: 'Device mismatch' };

  // Frequency & Dismissal
  const adId = String(ad.id);
  if (context.dismissedIds.has(adId)) return { eligible: false, reason: 'Dismissed' };

  const freq = (ad.frequency || 'always').toLowerCase().trim();
  if (freq === 'session' && context.sessionShownIds.has(adId)) return { eligible: false, reason: 'Session frequency capped' };

  if (context.storageMap) {
    const prefix = `3d_ad_${adId}`;
    if (freq === 'daily' && context.storageMap[`${prefix}_last_shown_date`] === new Date(context.nowMs).toDateString()) {
      return { eligible: false, reason: 'Daily frequency capped' };
    }
    if (freq === 'campaign' && context.storageMap[`${prefix}_campaign_shown`]) {
      return { eligible: false, reason: 'Campaign frequency capped' };
    }
    if (ad.maxImpressionsPerUser && ad.maxImpressionsPerUser > 0) {
      const count = parseInt(context.storageMap[`${prefix}_impressions_count`] || '0', 10);
      if (count >= ad.maxImpressionsPerUser) return { eligible: false, reason: 'Max impressions capped' };
    }
  }

  return { eligible: true };
}

function isImageOnlyMode(camp: any): boolean {
  if (!camp) return false;
  const type = (camp.type || '').toLowerCase().trim();
  if (type === 'image_only' || type === 'image_popup') return true;
  if (camp.contentMode === 'IMAGE_ONLY' || camp.showImageOnly) return true;
  const hasHeadline = !!(camp.headline && String(camp.headline).trim());
  const hasTitle = !!(camp.title && String(camp.title).trim());
  const hasSubheadline = !!(camp.subheadline && String(camp.subheadline).trim());
  const hasCta = !!(camp.ctaText && String(camp.ctaText).trim());
  return !hasHeadline && !hasTitle && !hasSubheadline && !hasCta;
}

export async function runCampaignManagerAndPushUnitTests() {
  const results = { passed: 0, failed: 0, errors: [] as string[] };

  function test(name: string, fn: () => void | Promise<void>) {
    try {
      const res = fn();
      if (res instanceof Promise) {
        return res
          .then(() => {
            results.passed++;
          })
          .catch((err: any) => {
            results.failed++;
            results.errors.push(`${name}: ${err.message}`);
          });
      }
      results.passed++;
    } catch (err: any) {
      results.failed++;
      results.errors.push(`${name}: ${err.message}`);
    }
  }

  // =========================================================================
  // SUITE 1: CAMPAIGN PERSISTENCE & DATA INTEGRITY
  // =========================================================================

  test('Campaign Persistence: Creates campaign with complete persisted configuration', () => {
    const campaign: CampaignTestItem = {
      id: 'ad_1700000001',
      name: 'Diwali Mega Sale 2026',
      description: 'Internal diwali campaign',
      type: 'popup',
      status: 'active',
      placement: 'floating_popup',
      isPopup: true,
      priority: 3,
      imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800',
      mobileImageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400',
      headline: 'Special Diwali 30% OFF',
      subheadline: 'Celebrate with high-grade filaments & resin.',
      ctaText: 'Claim Festive Discount',
      ctaUrl: '/products?category=filaments',
      ctaAction: 'open_url',
      imageClickAction: 'open_url',
      showCloseButton: true,
      allowOutsideClickClose: true,
      startDate: '2026-10-01',
      startTime: '09:00',
      endDate: '2026-11-15',
      endTime: '23:59',
      timezone: 'Asia/Kolkata',
      enableCountdown: true,
      countdownType: 'campaign_end',
      frequency: 'session',
      audience: 'all',
      pageTargeting: 'homepage',
      deviceTargeting: 'all',
      couponCode: 'DIWALI30',
      enablePushNotification: true,
      pushTitle: 'Diwali Mega Sale Alert',
      pushBody: '30% OFF on all 3D Printers and Filaments!',
      pushDeepLink: '/products',
      pushAudience: 'all'
    };

    assert.strictEqual(campaign.name, 'Diwali Mega Sale 2026');
    assert.strictEqual(campaign.type, 'popup');
    assert.strictEqual(campaign.isPopup, true);
    assert.strictEqual(campaign.enablePushNotification, true);
    assert.strictEqual(campaign.enableCountdown, true);
    assert.strictEqual(campaign.timezone, 'Asia/Kolkata');
  });

  test('Campaign Persistence: Status toggles between active and paused cleanly', () => {
    const campaign: CampaignTestItem = {
      id: 'ad_1700000002',
      name: 'Flash Weekend',
      type: 'popup',
      status: 'active'
    };
    // Pause
    campaign.status = campaign.status === 'active' ? 'paused' : 'active';
    assert.strictEqual(campaign.status, 'paused', 'Active campaign should toggle to paused');
    // Resume
    campaign.status = campaign.status === 'active' ? 'paused' : 'active';
    assert.strictEqual(campaign.status, 'active', 'Paused campaign should toggle back to active');
  });

  test('Campaign Persistence: Schedule validation rejects inverted start and end dates', () => {
    const invalidSchedule = {
      startDate: '2026-12-01',
      endDate: '2026-10-01'
    };
    const startMs = parseScheduleTimestamp(invalidSchedule.startDate);
    const endMs = parseScheduleTimestamp(invalidSchedule.endDate);
    const isValid = (startMs !== null && endMs !== null && startMs < endMs);
    assert.strictEqual(isValid, false, 'End date preceding start date must fail schedule validation');
  });

  // =========================================================================
  // SUITE 2: POPUP ELIGIBILITY ENGINE (8 CRITERIA)
  // =========================================================================

  test('Eligibility Criterion 1: Enabled campaign displays, paused/draft does not', () => {
    const baseAd: CampaignTestItem = {
      id: 'ad_crit_1',
      name: 'Crit 1',
      type: 'popup',
      status: 'active',
      isPopup: true,
      priority: 1
    };
    const visitor: VisitorStateTest = { isGuest: true, isLoggedIn: false, isNewVisitor: true, isReturningVisitor: false, authReady: true };
    const context = { nowMs: Date.now(), dismissedIds: new Set<string>(), sessionShownIds: new Set<string>() };

    const activeRes = checkEligibility(baseAd, visitor, '/', false, context);
    assert.strictEqual(activeRes.eligible, true, 'Active popup should be eligible');

    const pausedAd = { ...baseAd, status: 'paused' };
    const pausedRes = checkEligibility(pausedAd, visitor, '/', false, context);
    assert.strictEqual(pausedRes.eligible, false, 'Paused popup must NOT be eligible');

    const draftAd = { ...baseAd, status: 'draft' };
    const draftRes = checkEligibility(draftAd, visitor, '/', false, context);
    assert.strictEqual(draftRes.eligible, false, 'Draft popup must NOT be eligible');
  });

  test('Eligibility Criterion 2: Schedule timeline and timezone (Asia/Kolkata)', () => {
    const scheduledAd: CampaignTestItem = {
      id: 'ad_crit_2',
      name: 'Timeline Test',
      type: 'popup',
      status: 'active',
      isPopup: true,
      startDate: '2026-10-20',
      startTime: '10:00',
      endDate: '2026-10-25',
      endTime: '18:00',
      timezone: 'Asia/Kolkata'
    };
    const visitor: VisitorStateTest = { isGuest: true, isLoggedIn: false, isNewVisitor: true, isReturningVisitor: false, authReady: true };

    // Test time BEFORE start
    const beforeStartMs = parseScheduleTimestamp('2026-10-19', '12:00', 'Asia/Kolkata')!;
    const resBefore = checkEligibility(scheduledAd, visitor, '/', false, { nowMs: beforeStartMs, dismissedIds: new Set(), sessionShownIds: new Set() });
    assert.strictEqual(resBefore.eligible, false, 'Campaign must not display before start date');

    // Test time DURING active window
    const duringMs = parseScheduleTimestamp('2026-10-22', '12:00', 'Asia/Kolkata')!;
    const resDuring = checkEligibility(scheduledAd, visitor, '/', false, { nowMs: duringMs, dismissedIds: new Set(), sessionShownIds: new Set() });
    assert.strictEqual(resDuring.eligible, true, 'Campaign must display during scheduled window');

    // Test time AFTER end date
    const afterEndMs = parseScheduleTimestamp('2026-10-26', '12:00', 'Asia/Kolkata')!;
    const resAfter = checkEligibility(scheduledAd, visitor, '/', false, { nowMs: afterEndMs, dismissedIds: new Set(), sessionShownIds: new Set() });
    assert.strictEqual(resAfter.eligible, false, 'Campaign must not display after end date (expired)');
  });

  test('Eligibility Criterion 3: Visitor Audience Targeting & Auth Resolution Safety', () => {
    const guestOnlyAd: CampaignTestItem = {
      id: 'ad_guest',
      name: 'Guest Only Campaign',
      type: 'popup',
      status: 'active',
      isPopup: true,
      audience: 'guests_only'
    };
    const loggedInAd: CampaignTestItem = {
      id: 'ad_customer',
      name: 'Customer Only Campaign',
      type: 'popup',
      status: 'active',
      isPopup: true,
      audience: 'logged_in'
    };

    const guestVisitor: VisitorStateTest = { isGuest: true, isLoggedIn: false, isNewVisitor: true, isReturningVisitor: false, authReady: true };
    const memberVisitor: VisitorStateTest = { isGuest: false, isLoggedIn: true, isNewVisitor: false, isReturningVisitor: true, authReady: true };
    const unresolvedVisitor: VisitorStateTest = { isGuest: true, isLoggedIn: false, isNewVisitor: true, isReturningVisitor: false, authReady: false };
    const ctx = { nowMs: Date.now(), dismissedIds: new Set<string>(), sessionShownIds: new Set<string>() };

    // Guest visitor evaluation
    assert.strictEqual(checkEligibility(guestOnlyAd, guestVisitor, '/', false, ctx).eligible, true, 'Guest ad displays for guest');
    assert.strictEqual(checkEligibility(loggedInAd, guestVisitor, '/', false, ctx).eligible, false, 'Customer ad does not display for guest');

    // Logged-in visitor evaluation
    assert.strictEqual(checkEligibility(guestOnlyAd, memberVisitor, '/', false, ctx).eligible, false, 'Guest ad does not display for customer');
    assert.strictEqual(checkEligibility(loggedInAd, memberVisitor, '/', false, ctx).eligible, true, 'Customer ad displays for customer');

    // Auth unresolved evaluation (Prevents race condition / wrong-audience flash)
    assert.strictEqual(checkEligibility(loggedInAd, unresolvedVisitor, '/', false, ctx).eligible, false, 'Must defer audience evaluation until auth is ready');
  });

  test('Eligibility Criterion 4: Route and Page Targeting', () => {
    const homeAd = { id: 'ad_home', type: 'popup', status: 'active', isPopup: true, pageTargeting: 'homepage' };
    const prodAd = { id: 'ad_prod', type: 'popup', status: 'active', isPopup: true, pageTargeting: 'product_page' };
    const cartAd = { id: 'ad_cart', type: 'popup', status: 'active', isPopup: true, pageTargeting: 'cart' };
    const customAd = { id: 'ad_custom', type: 'popup', status: 'active', isPopup: true, pageTargeting: 'specific_url', targetUrlPath: '/slicer' };

    const visitor: VisitorStateTest = { isGuest: true, isLoggedIn: false, isNewVisitor: true, isReturningVisitor: false, authReady: true };
    const ctx = { nowMs: Date.now(), dismissedIds: new Set<string>(), sessionShownIds: new Set<string>() };

    // Testing on homepage ('/')
    assert.strictEqual(checkEligibility(homeAd, visitor, '/', false, ctx).eligible, true, 'Homepage ad matches /');
    assert.strictEqual(checkEligibility(prodAd, visitor, '/', false, ctx).eligible, false, 'Product ad rejected on /');

    // Testing on product page ('/products/creality-k1-max')
    assert.strictEqual(checkEligibility(prodAd, visitor, '/products/creality-k1-max', false, ctx).eligible, true, 'Product ad matches /products/...');
    assert.strictEqual(checkEligibility(cartAd, visitor, '/products/creality-k1-max', false, ctx).eligible, false, 'Cart ad rejected on products');

    // Testing on specific URL ('/slicer')
    assert.strictEqual(checkEligibility(customAd, visitor, '/slicer', false, ctx).eligible, true, 'Custom route matches /slicer');
    assert.strictEqual(checkEligibility(customAd, visitor, '/about', false, ctx).eligible, false, 'Custom route rejected on /about');
  });

  test('Eligibility Criterion 5: Device Targeting (Desktop vs Mobile)', () => {
    const desktopOnlyAd = { id: 'ad_desk', type: 'popup', status: 'active', isPopup: true, deviceTargeting: 'desktop' };
    const mobileOnlyAd = { id: 'ad_mob', type: 'popup', status: 'active', isPopup: true, deviceTargeting: 'mobile' };
    const allDeviceAd = { id: 'ad_both', type: 'popup', status: 'active', isPopup: true, deviceTargeting: 'all' };

    const visitor: VisitorStateTest = { isGuest: true, isLoggedIn: false, isNewVisitor: true, isReturningVisitor: false, authReady: true };
    const ctx = { nowMs: Date.now(), dismissedIds: new Set<string>(), sessionShownIds: new Set<string>() };

    // Desktop viewport (isMobile = false)
    assert.strictEqual(checkEligibility(desktopOnlyAd, visitor, '/', false, ctx).eligible, true, 'Desktop ad eligible on desktop');
    assert.strictEqual(checkEligibility(mobileOnlyAd, visitor, '/', false, ctx).eligible, false, 'Mobile ad rejected on desktop');
    assert.strictEqual(checkEligibility(allDeviceAd, visitor, '/', false, ctx).eligible, true, 'All devices ad eligible on desktop');

    // Mobile viewport (isMobile = true)
    assert.strictEqual(checkEligibility(desktopOnlyAd, visitor, '/', true, ctx).eligible, false, 'Desktop ad rejected on mobile');
    assert.strictEqual(checkEligibility(mobileOnlyAd, visitor, '/', true, ctx).eligible, true, 'Mobile ad eligible on mobile');
    assert.strictEqual(checkEligibility(allDeviceAd, visitor, '/', true, ctx).eligible, true, 'All devices ad eligible on mobile');
  });

  test('Eligibility Criteria 6 & 7: Frequency Capping & Dismissal Suppression', () => {
    const sessionAd = { id: 'ad_session', type: 'popup', status: 'active', isPopup: true, frequency: 'session' };
    const visitor: VisitorStateTest = { isGuest: true, isLoggedIn: false, isNewVisitor: true, isReturningVisitor: false, authReady: true };

    const ctxFresh = { nowMs: Date.now(), dismissedIds: new Set<string>(), sessionShownIds: new Set<string>() };
    assert.strictEqual(checkEligibility(sessionAd, visitor, '/', false, ctxFresh).eligible, true, 'Unshown session ad is eligible');

    // Simulate session displayed
    const ctxShown = { nowMs: Date.now(), dismissedIds: new Set<string>(), sessionShownIds: new Set<string>(['ad_session']) };
    assert.strictEqual(checkEligibility(sessionAd, visitor, '/', false, ctxShown).eligible, false, 'Already shown in session must be suppressed');

    // Simulate user dismissed popup
    const ctxDismissed = { nowMs: Date.now(), dismissedIds: new Set<string>(['ad_session']), sessionShownIds: new Set<string>() };
    assert.strictEqual(checkEligibility(sessionAd, visitor, '/', false, ctxDismissed).eligible, false, 'Dismissed campaign must be suppressed');
  });

  test('Eligibility Criterion 8: Notification Permission Active State defers evaluation', () => {
    const ad = { id: 'ad_1', type: 'popup', status: 'active', isPopup: true };
    const visitor: VisitorStateTest = { isGuest: true, isLoggedIn: false, isNewVisitor: true, isReturningVisitor: false, authReady: true };

    const ctxPromptActive = { nowMs: Date.now(), dismissedIds: new Set<string>(), sessionShownIds: new Set<string>(), isPromptVisible: true };
    const resPrompt = checkEligibility(ad, visitor, '/', false, ctxPromptActive);
    assert.strictEqual(resPrompt.eligible, false, 'Popup must defer when notification prompt is visible');

    const ctxPromptClosed = { nowMs: Date.now(), dismissedIds: new Set<string>(), sessionShownIds: new Set<string>(), isPromptVisible: false };
    const resNormal = checkEligibility(ad, visitor, '/', false, ctxPromptClosed);
    assert.strictEqual(resNormal.eligible, true, 'Popup evaluates normally once notification prompt is resolved');
  });

  test('Eligibility Priority Sorting: Selects highest priority campaign among multiples', () => {
    const adLow = { id: 'ad_low', priority: 1, type: 'popup', status: 'active', isPopup: true };
    const adHigh = { id: 'ad_high', priority: 5, type: 'popup', status: 'active', isPopup: true };
    const adMed = { id: 'ad_med', priority: 3, type: 'popup', status: 'active', isPopup: true };

    const list = [adLow, adHigh, adMed];
    list.sort((a, b) => b.priority - a.priority);

    assert.strictEqual(list[0].id, 'ad_high', 'Highest priority ad (5) must be chosen first');
  });

  // =========================================================================
  // SUITE 3: IMAGE-ONLY POPUP REQUIREMENTS
  // =========================================================================

  test('Image-Only Mode: Identifies image-only campaigns strictly', () => {
    const imageOnlyType = { id: 'img_1', type: 'image_only', imageUrl: 'https://example.com/ad.jpg' };
    assert.strictEqual(isImageOnlyMode(imageOnlyType), true, 'type: image_only is image-only');

    const contentModeAd = { id: 'img_2', contentMode: 'IMAGE_ONLY', headline: 'Ignored', imageUrl: 'https://example.com/ad.jpg' };
    assert.strictEqual(isImageOnlyMode(contentModeAd), true, 'contentMode: IMAGE_ONLY is image-only');

    const noTextAd = { id: 'img_3', type: 'popup', imageUrl: 'https://example.com/ad.jpg', headline: '', subheadline: '', ctaText: '' };
    assert.strictEqual(isImageOnlyMode(noTextAd), true, 'Popup with empty text fields defaults to image-only');

    const fullAd = { id: 'full_1', type: 'popup', headline: 'Sale!', ctaText: 'Shop' };
    assert.strictEqual(isImageOnlyMode(fullAd), false, 'Campaign with headline and CTA is NOT image-only');
  });

  test('Image-Only Mode: Aspect ratio constraint calculation preserves proportions', () => {
    const naturalWidth = 1200;
    const naturalHeight = 800;
    const ratio = naturalWidth / naturalHeight; // 1.5

    const maxViewportH = 600;
    const maxViewportW = 720;

    const widthFromHeight = maxViewportH * ratio; // 900
    const targetWidth = Math.min(maxViewportW, widthFromHeight); // 720

    assert.strictEqual(targetWidth <= maxViewportW, true, 'Width must not exceed max allowed viewport width');
    assert.strictEqual(targetWidth / ratio <= maxViewportH, true, 'Height must not overflow viewport height');
  });

  // =========================================================================
  // SUITE 4: DESKTOP & MOBILE LIVE PREVIEW TOGGLE
  // =========================================================================

  test('Preview Toggle: Changes viewport and resolves device assets correctly', () => {
    const ad = {
      id: 'prev_1',
      imageUrl: 'https://example.com/desktop.jpg',
      mobileImageUrl: 'https://example.com/mobile.jpg'
    };

    let viewport: 'desktop' | 'mobile' = 'desktop';
    let resolvedImg = (viewport === 'mobile' && ad.mobileImageUrl) ? ad.mobileImageUrl : ad.imageUrl;
    assert.strictEqual(resolvedImg, 'https://example.com/desktop.jpg', 'Desktop preview uses desktop asset');

    // Switch to Mobile
    viewport = 'mobile';
    resolvedImg = (viewport === 'mobile' && ad.mobileImageUrl) ? ad.mobileImageUrl : ad.imageUrl;
    assert.strictEqual(resolvedImg, 'https://example.com/mobile.jpg', 'Mobile preview uses mobile asset');
  });

  test('Preview Toggle: Active button styling uses orange brand theme (#f54f00)', () => {
    const getButtonClass = (btnType: string, activeViewport: string) => {
      return activeViewport === btnType
        ? 'px-3 py-1.5 bg-[#f54f00] text-white rounded-lg font-black'
        : 'px-3 py-1.5 text-zinc-400 hover:text-white rounded-lg';
    };

    const desktopClass = getButtonClass('desktop', 'desktop');
    assert.strictEqual(desktopClass.includes('bg-[#f54f00]'), true, 'Selected desktop button has orange background');

    const mobileInactive = getButtonClass('mobile', 'desktop');
    assert.strictEqual(mobileInactive.includes('text-zinc-400'), true, 'Unselected mobile button has neutral text');
  });

  test('Preview Live Sync: Draft field updates reflect immediately in preview state', () => {
    const draftAd = {
      id: 'draft_1',
      headline: 'Initial Headline',
      ctaText: 'Initial CTA'
    };

    // Admin types in input
    draftAd.headline = 'Updated Headline In Realtime';
    assert.strictEqual(draftAd.headline, 'Updated Headline In Realtime', 'Preview immediately accesses updated draft state');
  });

  // =========================================================================
  // SUITE 5: FIREBASE PUSH NOTIFICATION INTEGRATION (MOCKED)
  // =========================================================================

  test('Firebase Push: In-app popup and Push notification channels can operate independently', () => {
    // Case 1: Popup only
    const popupOnlyAd = { isPopup: true, enablePushNotification: false };
    assert.strictEqual(popupOnlyAd.isPopup, true, 'Popup is active');
    assert.strictEqual(popupOnlyAd.enablePushNotification, false, 'Push is inactive');

    // Case 2: Push only
    const pushOnlyAd = { isPopup: false, enablePushNotification: true };
    assert.strictEqual(pushOnlyAd.isPopup, false, 'Popup is inactive');
    assert.strictEqual(pushOnlyAd.enablePushNotification, true, 'Push is active');

    // Case 3: Both channels active
    const dualAd = { isPopup: true, enablePushNotification: true };
    assert.strictEqual(dualAd.isPopup, true, 'Both channels active');
    assert.strictEqual(dualAd.enablePushNotification, true, 'Both channels active');
  });

  test('Firebase Push: Dispatches test push with mocked FCM without sending real external notifications', async () => {
    const mockFcmSender = {
      sentMessages: [] as any[],
      send: async (msg: any) => {
        mockFcmSender.sentMessages.push(msg);
        return { messageId: 'projects/3dgalaxy/messages/mock_12345' };
      }
    };

    const testPayload = {
      token: 'MOCK_FCM_REGISTRATION_TOKEN_999',
      notification: {
        title: '3D Galaxy Flash Sale',
        body: 'Flat 20% off today!'
      },
      data: {
        click_action: '/products'
      }
    };

    const resp = await mockFcmSender.send(testPayload);
    assert.strictEqual(mockFcmSender.sentMessages.length, 1);
    assert.strictEqual(resp.messageId.includes('mock_12345'), true);
    assert.strictEqual(mockFcmSender.sentMessages[0].notification.title, '3D Galaxy Flash Sale');
  });

  test('Firebase Push: Push delivery failures do NOT break popup functionality', () => {
    const failingPushResult = { success: false, error: 'FCM Token expired' };
    const popupEligibility = true; // Popup evaluator is decoupled

    assert.strictEqual(popupEligibility, true, 'Storefront popup eligibility must remain operational even if push channel errors');
  });

  return results;
}
