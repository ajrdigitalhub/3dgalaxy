import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  AnalyticsProvider,
  AnalyticsConfig,
  ConsentCategory,
  AnalyticsItem,
  PurchasePayload,
  CheckoutPayload,
  LeadPayload
} from '../analytics.types';
import { ScriptLoaderService } from '../services/script-loader.service';
import { sanitizeAnalyticsPayload, sanitizeAnalyticsItem } from '../analytics.utils';

@Injectable({
  providedIn: 'root'
})
export class GoogleTagManagerService implements AnalyticsProvider {
  readonly id = 'gtm';
  readonly name = 'Google Tag Manager';
  readonly category: ConsentCategory = 'analytics';

  private platformId = inject(PLATFORM_ID);
  private scriptLoader = inject(ScriptLoaderService);

  private initialized = false;
  private containerId = '';

  public async init(config: AnalyticsConfig): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    const targetId = config.gtm?.containerId?.trim() || 'GTM-THJDDXCK';
    if (!targetId || !targetId.startsWith('GTM-')) {
      return false;
    }

    this.containerId = targetId;
    const dataLayerName = config.gtm?.dataLayerName || 'dataLayer';

    window[dataLayerName as any] = window[dataLayerName as any] || [];

    // Check if GTM is already loaded or injected via index.html snippet to prevent duplicate tag loading
    const existingScript = document.querySelector(`script[src*="googletagmanager.com/gtm.js?id=${this.containerId}"]`) ||
      document.querySelector('script[src*="googletagmanager.com/gtm.js"]') ||
      (window as any).google_tag_manager?.[this.containerId];

    if (existingScript) {
      this.initialized = true;
      return true;
    }

    const inlineScript = `
      (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
      new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
      'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
      })(window,document,'script','${dataLayerName}','${this.containerId}');
    `;

    const loaded = this.scriptLoader.loadInlineScript(inlineScript, 'gtm-init-script');
    if (loaded) {
      this.initialized = true;
    }

    return loaded;
  }

  public isInitialized(): boolean {
    return isPlatformBrowser(this.platformId) && (this.initialized || Array.isArray(window.dataLayer));
  }

  public pushToDataLayer(object: Record<string, any>): void {
    if (!isPlatformBrowser(this.platformId)) return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(object);
  }

  /**
   * Pushes a GA4-compliant ecommerce event to window.dataLayer.
   * Crucial rule: Always clears the previous ecommerce object ({ ecommerce: null })
   * prior to pushing new ecommerce data to avoid parameter bleeding and malformed arrays.
   */
  public pushEcommerce(eventName: string, ecommerceData: Record<string, any>): void {
    if (!isPlatformBrowser(this.platformId)) return;
    window.dataLayer = window.dataLayer || [];

    // Push sanitized ecommerce payload directly without wiping shared dataLayer state
    window.dataLayer.push({
      event: eventName,
      ecommerce: sanitizeAnalyticsPayload(ecommerceData)
    });
  }

  public trackPageView(url: string, title?: string): void {
    this.pushToDataLayer({
      event: 'page_view',
      page_location: typeof window !== 'undefined' ? window.location.href : url,
      page_path: url,
      page_title: title || (typeof document !== 'undefined' ? document.title : '')
    });
  }

  public trackEvent(eventName: string, payload?: Record<string, any>): void {
    let normalized = eventName;
    if (eventName === 'product') normalized = 'view_item';
    if (eventName === 'checkout') normalized = 'begin_checkout';

    const cleanPayload = sanitizeAnalyticsPayload(payload || {});
    this.pushToDataLayer({
      event: normalized,
      ...cleanPayload
    });
  }

  public trackViewItem(item: AnalyticsItem): void {
    const cleanItem = sanitizeAnalyticsItem(item);
    const value = cleanItem.price * (cleanItem.quantity || 1);

    this.pushEcommerce('view_item', {
      currency: cleanItem.currency || 'INR',
      value: Number(value.toFixed(2)),
      items: [cleanItem]
    });
  }

  public trackProductView(item: AnalyticsItem): void {
    this.trackViewItem(item);
  }

  public trackViewItemList(items: AnalyticsItem[], listName: string = 'Catalog'): void {
    const cleanItems = (items || []).map((i, idx) => sanitizeAnalyticsItem({ ...i, index: i.index ?? idx + 1 }));

    this.pushEcommerce('view_item_list', {
      item_list_name: listName,
      items: cleanItems
    });
  }

  public trackSelectItem(item: AnalyticsItem, listName: string = 'Catalog'): void {
    const cleanItem = sanitizeAnalyticsItem(item);

    this.pushEcommerce('select_item', {
      item_list_name: listName,
      items: [cleanItem]
    });
  }

  public trackViewCart(items: AnalyticsItem[], totalValue: number): void {
    const cleanItems = (items || []).map((i) => sanitizeAnalyticsItem(i));

    this.pushEcommerce('view_cart', {
      currency: 'INR',
      value: Number(Number(totalValue || 0).toFixed(2)),
      items: cleanItems
    });
  }

  public trackAddToCart(item: AnalyticsItem, quantity: number = 1): void {
    const cleanItem = sanitizeAnalyticsItem({ ...item, quantity });
    const value = cleanItem.price * cleanItem.quantity!;

    this.pushEcommerce('add_to_cart', {
      currency: cleanItem.currency || 'INR',
      value: Number(value.toFixed(2)),
      items: [cleanItem]
    });
  }

  public trackRemoveFromCart(item: AnalyticsItem, quantity: number = 1): void {
    const cleanItem = sanitizeAnalyticsItem({ ...item, quantity });
    const value = cleanItem.price * cleanItem.quantity!;

    this.pushEcommerce('remove_from_cart', {
      currency: cleanItem.currency || 'INR',
      value: Number(value.toFixed(2)),
      items: [cleanItem]
    });
  }

  public trackWishlist(item: AnalyticsItem): void {
    const cleanItem = sanitizeAnalyticsItem(item);

    this.pushEcommerce('add_to_wishlist', {
      currency: cleanItem.currency || 'INR',
      value: Number(cleanItem.price.toFixed(2)),
      items: [cleanItem]
    });
  }

  public trackCheckout(payload: CheckoutPayload): void {
    const cleanItems = (payload.items || []).map((i) => sanitizeAnalyticsItem(i));
    const itemsSubtotal = cleanItems.reduce((acc, it) => acc + (it.price * (it.quantity || 1)), 0);
    const val = itemsSubtotal > 0 ? itemsSubtotal : Number(payload.value || 0);

    const ecommerce: Record<string, any> = {
      currency: payload.currency || 'INR',
      value: Number(val.toFixed(2)),
      items: cleanItems
    };

    if (payload.coupon) {
      ecommerce['coupon'] = payload.coupon;
    }

    this.pushEcommerce('begin_checkout', ecommerce);
  }

  public trackAddShippingInfo(shippingTier: string, value: number, items: AnalyticsItem[] = []): void {
    const cleanItems = items.map((i) => sanitizeAnalyticsItem(i));
    const itemsSubtotal = cleanItems.reduce((acc, it) => acc + (it.price * (it.quantity || 1)), 0);
    const val = itemsSubtotal > 0 ? itemsSubtotal : Number(value || 0);

    this.pushEcommerce('add_shipping_info', {
      currency: 'INR',
      value: Number(val.toFixed(2)),
      shipping_tier: shippingTier,
      items: cleanItems
    });
  }

  public trackAddPaymentInfo(paymentType: string, value: number, items: AnalyticsItem[] = []): void {
    const cleanItems = items.map((i) => sanitizeAnalyticsItem(i));
    const itemsSubtotal = cleanItems.reduce((acc, it) => acc + (it.price * (it.quantity || 1)), 0);
    const val = itemsSubtotal > 0 ? itemsSubtotal : Number(value || 0);

    this.pushEcommerce('add_payment_info', {
      currency: 'INR',
      value: Number(val.toFixed(2)),
      payment_type: paymentType,
      items: cleanItems
    });
  }

  public trackPurchase(payload: PurchasePayload): void {
    const cleanItems = (payload.items || []).map((i) => sanitizeAnalyticsItem(i));
    const itemsSubtotal = cleanItems.reduce((acc, it) => acc + (it.price * (it.quantity || 1)), 0);
    const val = itemsSubtotal > 0 ? itemsSubtotal : Number(payload.value || 0);

    const ecommerce: Record<string, any> = {
      transaction_id: String(payload.transaction_id),
      value: Number(val.toFixed(2)),
      currency: payload.currency || 'INR',
      items: cleanItems
    };

    if (payload.tax !== undefined && !isNaN(Number(payload.tax))) {
      ecommerce['tax'] = Number(Number(payload.tax).toFixed(2));
    }
    if (payload.shipping !== undefined && !isNaN(Number(payload.shipping))) {
      ecommerce['shipping'] = Number(Number(payload.shipping).toFixed(2));
    }
    if (payload.coupon) {
      ecommerce['coupon'] = payload.coupon;
    }

    this.pushEcommerce('purchase', ecommerce);
  }

  public trackRefund(transactionId: string, value?: number, items?: AnalyticsItem[]): void {
    const cleanItems = items ? items.map((i) => sanitizeAnalyticsItem(i)) : undefined;

    const ecommerce: Record<string, any> = {
      transaction_id: transactionId,
      currency: 'INR'
    };

    if (value !== undefined) ecommerce['value'] = Number(value.toFixed(2));
    if (cleanItems) ecommerce['items'] = cleanItems;

    this.pushEcommerce('refund', ecommerce);
  }

  public trackLead(payload: LeadPayload): void {
    this.pushToDataLayer({
      event: 'generate_lead',
      lead_source: payload.source,
      lead_type: payload.lead_type,
      currency: payload.currency || 'INR',
      value: Number(Number(payload.value || 0).toFixed(2))
    });
  }

  public trackSearch(searchTerm: string): void {
    this.pushToDataLayer({
      event: 'search',
      search_term: searchTerm
    });
  }

  public trackCoupon(couponCode: string, discountAmount: number): void {
    this.pushToDataLayer({
      event: 'apply_coupon',
      coupon_code: couponCode,
      discount_amount: Number(Number(discountAmount || 0).toFixed(2))
    });
  }
}
