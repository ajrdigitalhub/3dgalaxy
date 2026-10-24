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

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

@Injectable({
  providedIn: 'root'
})
export class GoogleAnalyticsService implements AnalyticsProvider {
  readonly id = 'ga4';
  readonly name = 'Google Analytics 4';
  readonly category: ConsentCategory = 'analytics';

  private platformId = inject(PLATFORM_ID);
  private scriptLoader = inject(ScriptLoaderService);

  private initialized = false;
  private measurementId = '';

  public async init(config: AnalyticsConfig): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    if (!config.ga4 || !config.ga4.measurementId) {
      return false;
    }

    this.measurementId = config.ga4.measurementId;

    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== 'function') {
      window.gtag = function () {
        window.dataLayer.push(arguments);
      };
    }

    // Configure Measurement ID with send_page_view: false so SPA route tracker manages virtual page views
    window.gtag('config', this.measurementId, {
      send_page_view: false
    });

    // In GTM-managed GA4 tracking architecture, GTM is the central container loading the Google Tag.
    // If GTM is present in DOM or window, we don't load a separate direct gtag.js to prevent duplicate network hits.
    const gtmActive = !!document.querySelector('script[src*="googletagmanager.com/gtm.js"]') ||
      !!(window as any).google_tag_manager;

    if (gtmActive) {
      this.initialized = true;
      return true;
    }

    const scriptUrl = `https://www.googletagmanager.com/gtag/js?id=${this.measurementId}`;
    
    // Check if tag is already loaded via direct tag snippet in index.html to avoid duplicate network loads
    const existing = document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${this.measurementId}"]`) ||
      document.querySelector(`script[src*="googletagmanager.com/gtag/js"]`);

    if (existing) {
      this.initialized = true;
      return true;
    }

    const loaded = await this.scriptLoader.loadScript(scriptUrl);
    if (loaded) {
      this.initialized = true;
    }

    return loaded;
  }

  public isGtmManagingGa4(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    return !!(
      document.querySelector('script[src*="googletagmanager.com/gtm.js"]') ||
      (window as any).google_tag_manager
    );
  }

  public isInitialized(): boolean {
    return isPlatformBrowser(this.platformId) && (this.initialized || typeof window.gtag === 'function');
  }

  public trackPageView(url: string, title?: string): void {
    if (!this.isInitialized() || this.isGtmManagingGa4()) return;
    window.gtag('event', 'page_view', {
      page_title: title || (typeof document !== 'undefined' ? document.title : ''),
      page_location: typeof window !== 'undefined' ? window.location.href : url,
      page_path: url,
      send_to: this.measurementId
    });
  }

  public trackEvent(eventName: string, payload?: Record<string, any>): void {
    if (!this.isInitialized() || this.isGtmManagingGa4()) return;

    // Remap non-standard legacy ecommerce event names to GA4 recommended events
    let normalizedEvent = eventName;
    if (eventName === 'product') {
      normalizedEvent = 'view_item';
    } else if (eventName === 'checkout') {
      normalizedEvent = 'begin_checkout';
    }

    const cleanPayload = sanitizeAnalyticsPayload(payload || {});
    window.gtag('event', normalizedEvent, cleanPayload);
  }

  public trackViewItem(item: AnalyticsItem): void {
    if (!this.isInitialized() || this.isGtmManagingGa4()) return;
    const cleanItem = sanitizeAnalyticsItem(item);
    const value = cleanItem.price * (cleanItem.quantity || 1);

    window.gtag('event', 'view_item', {
      currency: cleanItem.currency || 'INR',
      value: Number(value.toFixed(2)),
      items: [cleanItem]
    });
  }

  public trackViewItemList(items: AnalyticsItem[], listName: string = 'Catalog'): void {
    if (!this.isInitialized() || this.isGtmManagingGa4()) return;
    const cleanItems = (items || []).map((i, idx) => sanitizeAnalyticsItem({ ...i, index: i.index ?? idx + 1 }));

    window.gtag('event', 'view_item_list', {
      item_list_name: listName,
      items: cleanItems
    });
  }

  public trackSelectItem(item: AnalyticsItem, listName: string = 'Catalog'): void {
    if (!this.isInitialized() || this.isGtmManagingGa4()) return;
    const cleanItem = sanitizeAnalyticsItem(item);

    window.gtag('event', 'select_item', {
      item_list_name: listName,
      items: [cleanItem]
    });
  }

  public trackViewCart(items: AnalyticsItem[], totalValue: number): void {
    if (!this.isInitialized() || this.isGtmManagingGa4()) return;
    const cleanItems = (items || []).map((i) => sanitizeAnalyticsItem(i));

    window.gtag('event', 'view_cart', {
      currency: 'INR',
      value: Number(Number(totalValue || 0).toFixed(2)),
      items: cleanItems
    });
  }

  public trackAddToCart(item: AnalyticsItem, quantity: number = 1): void {
    if (!this.isInitialized() || this.isGtmManagingGa4()) return;
    const cleanItem = sanitizeAnalyticsItem({ ...item, quantity });
    const value = cleanItem.price * cleanItem.quantity!;

    window.gtag('event', 'add_to_cart', {
      currency: cleanItem.currency || 'INR',
      value: Number(value.toFixed(2)),
      items: [cleanItem]
    });
  }

  public trackRemoveFromCart(item: AnalyticsItem, quantity: number = 1): void {
    if (!this.isInitialized() || this.isGtmManagingGa4()) return;
    const cleanItem = sanitizeAnalyticsItem({ ...item, quantity });
    const value = cleanItem.price * cleanItem.quantity!;

    window.gtag('event', 'remove_from_cart', {
      currency: cleanItem.currency || 'INR',
      value: Number(value.toFixed(2)),
      items: [cleanItem]
    });
  }

  public trackCheckout(payload: CheckoutPayload): void {
    if (!this.isInitialized() || this.isGtmManagingGa4()) return;
    const cleanItems = (payload.items || []).map((i) => sanitizeAnalyticsItem(i));
    const cleanPayload: Record<string, any> = {
      currency: payload.currency || 'INR',
      value: Number(Number(payload.value || 0).toFixed(2)),
      items: cleanItems
    };

    if (payload.coupon) {
      cleanPayload['coupon'] = payload.coupon;
    }

    window.gtag('event', 'begin_checkout', cleanPayload);
  }

  public trackAddShippingInfo(shippingTier: string, value: number, items: AnalyticsItem[] = []): void {
    if (!this.isInitialized() || this.isGtmManagingGa4()) return;
    const cleanItems = items.map((i) => sanitizeAnalyticsItem(i));

    window.gtag('event', 'add_shipping_info', {
      currency: 'INR',
      value: Number(Number(value || 0).toFixed(2)),
      shipping_tier: shippingTier,
      items: cleanItems
    });
  }

  public trackAddPaymentInfo(paymentType: string, value: number, items: AnalyticsItem[] = []): void {
    if (!this.isInitialized() || this.isGtmManagingGa4()) return;
    const cleanItems = items.map((i) => sanitizeAnalyticsItem(i));

    window.gtag('event', 'add_payment_info', {
      currency: 'INR',
      value: Number(Number(value || 0).toFixed(2)),
      payment_type: paymentType,
      items: cleanItems
    });
  }

  public trackPurchase(payload: PurchasePayload): void {
    if (!this.isInitialized() || this.isGtmManagingGa4()) return;
    const cleanItems = (payload.items || []).map((i) => sanitizeAnalyticsItem(i));

    const cleanPayload: Record<string, any> = {
      transaction_id: String(payload.transaction_id),
      value: Number(Number(payload.value || 0).toFixed(2)),
      tax: Number(Number(payload.tax || 0).toFixed(2)),
      shipping: Number(Number(payload.shipping || 0).toFixed(2)),
      currency: payload.currency || 'INR',
      items: cleanItems
    };

    if (payload.coupon) {
      cleanPayload['coupon'] = payload.coupon;
    }

    window.gtag('event', 'purchase', cleanPayload);
  }

  public trackRefund(transactionId: string, value?: number, items?: AnalyticsItem[]): void {
    if (!this.isInitialized() || this.isGtmManagingGa4()) return;
    const cleanItems = items ? items.map((i) => sanitizeAnalyticsItem(i)) : undefined;

    const cleanPayload: Record<string, any> = {
      transaction_id: transactionId,
      currency: 'INR'
    };

    if (value !== undefined) cleanPayload['value'] = Number(value.toFixed(2));
    if (cleanItems) cleanPayload['items'] = cleanItems;

    window.gtag('event', 'refund', cleanPayload);
  }

  public trackLead(payload: LeadPayload): void {
    if (!this.isInitialized()) return;
    window.gtag('event', 'generate_lead', {
      value: Number(Number(payload.value || 0).toFixed(2)),
      currency: payload.currency || 'INR',
      lead_type: payload.lead_type || 'general'
    });
  }

  public trackSearch(searchTerm: string): void {
    if (!this.isInitialized()) return;
    window.gtag('event', 'search', {
      search_term: searchTerm
    });
  }

  public trackLogin(method: string = 'email'): void {
    if (!this.isInitialized()) return;
    window.gtag('event', 'login', { method });
  }

  public trackSignup(method: string = 'email'): void {
    if (!this.isInitialized()) return;
    window.gtag('event', 'sign_up', { method });
  }

  public trackShare(method: string, contentType: string, itemId: string): void {
    if (!this.isInitialized()) return;
    window.gtag('event', 'share', {
      method,
      content_type: contentType,
      item_id: itemId
    });
  }

  public setUserProperties(properties: Record<string, any>): void {
    if (!this.isInitialized()) return;
    const cleanProperties = sanitizeAnalyticsPayload(properties);
    window.gtag('set', 'user_properties', cleanProperties);
  }
}
