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
import { sanitizeAnalyticsPayload, sanitizeAnalyticsItem, validateEcommercePayload } from '../analytics.utils';

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
  private measurementId = 'G-4BKM2K4PS0';

  public async init(config: AnalyticsConfig): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    if (config.ga4?.measurementId) {
      this.measurementId = config.ga4.measurementId;
    }

    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== 'function') {
      window.gtag = function () {
        window.dataLayer.push(arguments);
      };
    }

    window.gtag('js', new Date());
    // Configure Measurement ID with send_page_view: false so SPA route tracker manages virtual page views
    window.gtag('config', this.measurementId, {
      send_page_view: false
    });

    const scriptUrl = `https://www.googletagmanager.com/gtag/js?id=${this.measurementId}`;
    
    // Check if direct tag is already in DOM
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
    // Direct gtag.js is configured for GA4 (G-4BKM2K4PS0). Never suppress gtag events.
    return false;
  }

  public isInitialized(): boolean {
    return isPlatformBrowser(this.platformId) && (this.initialized || typeof window.gtag === 'function');
  }

  public trackPageView(url: string, title?: string): void {
    if (!this.isInitialized()) return;
    window.gtag('event', 'page_view', {
      page_title: title || (typeof document !== 'undefined' ? document.title : ''),
      page_location: typeof window !== 'undefined' ? window.location.href : url,
      page_path: url,
      send_to: this.measurementId
    });
  }

  public trackEvent(eventName: string, payload?: Record<string, any>): void {
    if (!this.isInitialized()) return;

    // Remap non-standard legacy ecommerce event names to GA4 recommended events
    let normalizedEvent = eventName;
    if (eventName === 'product') {
      normalizedEvent = 'view_item';
    } else if (eventName === 'checkout') {
      normalizedEvent = 'begin_checkout';
    }

    const cleanPayload = sanitizeAnalyticsPayload(payload || {});
    window.gtag('event', normalizedEvent, {
      ...cleanPayload,
      send_to: this.measurementId
    });

    // If caller explicitly sent custom 'checkout' event, also send 'checkout'
    if (eventName === 'checkout') {
      window.gtag('event', 'checkout', {
        ...cleanPayload,
        send_to: this.measurementId
      });
    }
  }

  public trackViewItem(item: AnalyticsItem): void {
    if (!this.isInitialized()) return;
    const cleanItem = sanitizeAnalyticsItem(item);
    const value = cleanItem.price * (cleanItem.quantity || 1);

    const payload = {
      currency: cleanItem.currency || 'INR',
      value: Number(value.toFixed(2)),
      items: [cleanItem],
      send_to: this.measurementId
    };

    validateEcommercePayload('view_item', payload);
    window.gtag('event', 'view_item', payload);
  }

  public trackViewItemList(items: AnalyticsItem[], listName: string = 'Catalog'): void {
    if (!this.isInitialized()) return;
    const cleanItems = (items || []).map((i, idx) => sanitizeAnalyticsItem({ ...i, index: i.index ?? idx + 1 }));

    const payload = {
      item_list_name: listName,
      items: cleanItems,
      send_to: this.measurementId
    };

    validateEcommercePayload('view_item_list', payload);
    window.gtag('event', 'view_item_list', payload);
  }

  public trackSelectItem(item: AnalyticsItem, listName: string = 'Catalog'): void {
    if (!this.isInitialized()) return;
    const cleanItem = sanitizeAnalyticsItem(item);

    const payload = {
      item_list_name: listName,
      items: [cleanItem],
      send_to: this.measurementId
    };

    validateEcommercePayload('select_item', payload);
    window.gtag('event', 'select_item', payload);
  }

  public trackViewCart(items: AnalyticsItem[], totalValue: number): void {
    if (!this.isInitialized()) return;
    const cleanItems = (items || []).map((i) => sanitizeAnalyticsItem(i));
    const itemsSubtotal = cleanItems.reduce((acc, it) => acc + (it.price * (it.quantity || 1)), 0);
    const val = itemsSubtotal > 0 ? itemsSubtotal : Number(totalValue || 0);

    const payload = {
      currency: 'INR',
      value: Number(val.toFixed(2)),
      items: cleanItems,
      send_to: this.measurementId
    };

    validateEcommercePayload('view_cart', payload);
    // Standard GA4 event
    window.gtag('event', 'view_cart', payload);
    // Custom 'cart' event for custom reports/conversions
    window.gtag('event', 'cart', payload);
  }

  private lastAddToCartTime = 0;
  private lastAddToCartItemId = '';

  public trackAddToCart(item: AnalyticsItem, quantity: number = 1): void {
    if (!this.isInitialized()) return;
    const cleanItem = sanitizeAnalyticsItem({ ...item, quantity });
    const now = Date.now();
    // Debounce duplicate add_to_cart for the same item within 400ms
    if (this.lastAddToCartItemId === cleanItem.item_id && now - this.lastAddToCartTime < 400) {
      return;
    }
    this.lastAddToCartItemId = cleanItem.item_id;
    this.lastAddToCartTime = now;

    const value = cleanItem.price * cleanItem.quantity!;

    const payload = {
      currency: cleanItem.currency || 'INR',
      value: Number(value.toFixed(2)),
      items: [cleanItem],
      send_to: this.measurementId
    };

    validateEcommercePayload('add_to_cart', payload);
    window.gtag('event', 'add_to_cart', payload);
  }

  public trackRemoveFromCart(item: AnalyticsItem, quantity: number = 1): void {
    if (!this.isInitialized()) return;
    const cleanItem = sanitizeAnalyticsItem({ ...item, quantity });
    const value = cleanItem.price * cleanItem.quantity!;

    const payload = {
      currency: cleanItem.currency || 'INR',
      value: Number(value.toFixed(2)),
      items: [cleanItem],
      send_to: this.measurementId
    };

    validateEcommercePayload('remove_from_cart', payload);
    window.gtag('event', 'remove_from_cart', payload);
  }

  public trackCheckout(payload: CheckoutPayload): void {
    if (!this.isInitialized()) return;
    const cleanItems = (payload.items || []).map((i) => sanitizeAnalyticsItem(i));
    const itemsSubtotal = cleanItems.reduce((acc, it) => acc + (it.price * (it.quantity || 1)), 0);
    const val = (payload.value !== undefined && !isNaN(Number(payload.value)) && Number(payload.value) > 0)
      ? Number(payload.value)
      : (itemsSubtotal > 0 ? itemsSubtotal : 0);

    const cleanPayload: Record<string, any> = {
      currency: payload.currency || 'INR',
      value: Number(val.toFixed(2)),
      items: cleanItems,
      send_to: this.measurementId
    };

    if (payload.coupon) {
      cleanPayload['coupon'] = payload.coupon;
    }

    validateEcommercePayload('begin_checkout', cleanPayload);
    // Standard GA4 Recommended Ecommerce Event (populates "Checkouts" and "Checkout Value" metrics)
    window.gtag('event', 'begin_checkout', cleanPayload);
    // Also dispatch custom 'checkout' event so custom reports/funnels filtering by 'checkout' receive value and items
    window.gtag('event', 'checkout', cleanPayload);
  }

  public trackAddShippingInfo(shippingTier: string, value: number, items: AnalyticsItem[] = []): void {
    if (!this.isInitialized()) return;
    const cleanItems = items.map((i) => sanitizeAnalyticsItem(i));
    const itemsSubtotal = cleanItems.reduce((acc, it) => acc + (it.price * (it.quantity || 1)), 0);
    const val = (value !== undefined && !isNaN(Number(value)) && Number(value) > 0)
      ? Number(value)
      : (itemsSubtotal > 0 ? itemsSubtotal : 0);

    const payload = {
      currency: 'INR',
      value: Number(val.toFixed(2)),
      shipping_tier: shippingTier,
      items: cleanItems,
      send_to: this.measurementId
    };

    validateEcommercePayload('add_shipping_info', payload);
    window.gtag('event', 'add_shipping_info', payload);
  }

  public trackAddPaymentInfo(paymentType: string, value: number, items: AnalyticsItem[] = []): void {
    if (!this.isInitialized()) return;
    const cleanItems = items.map((i) => sanitizeAnalyticsItem(i));
    const itemsSubtotal = cleanItems.reduce((acc, it) => acc + (it.price * (it.quantity || 1)), 0);
    const val = (value !== undefined && !isNaN(Number(value)) && Number(value) > 0)
      ? Number(value)
      : (itemsSubtotal > 0 ? itemsSubtotal : 0);

    const payload = {
      currency: 'INR',
      value: Number(val.toFixed(2)),
      payment_type: paymentType,
      items: cleanItems,
      send_to: this.measurementId
    };

    validateEcommercePayload('add_payment_info', payload);
    window.gtag('event', 'add_payment_info', payload);
  }

  public trackPurchase(payload: PurchasePayload): void {
    if (!this.isInitialized()) return;
    const cleanItems = (payload.items || []).map((i) => sanitizeAnalyticsItem(i));
    const itemsSubtotal = cleanItems.reduce((acc, it) => acc + (it.price * (it.quantity || 1)), 0);
    // GA4 standard: value is total transaction revenue (including shipping & tax) passed by caller
    const val = (payload.value !== undefined && !isNaN(Number(payload.value)) && Number(payload.value) > 0)
      ? Number(payload.value)
      : (itemsSubtotal > 0 ? itemsSubtotal : 0);

    const cleanPayload: Record<string, any> = {
      transaction_id: String(payload.transaction_id),
      value: Number(val.toFixed(2)),
      currency: payload.currency || 'INR',
      items: cleanItems,
      send_to: this.measurementId
    };

    if (payload.tax !== undefined && !isNaN(Number(payload.tax))) {
      cleanPayload['tax'] = Number(Number(payload.tax).toFixed(2));
    }
    if (payload.shipping !== undefined && !isNaN(Number(payload.shipping))) {
      cleanPayload['shipping'] = Number(Number(payload.shipping).toFixed(2));
    }
    if (payload.coupon) {
      cleanPayload['coupon'] = payload.coupon;
    }

    validateEcommercePayload('purchase', cleanPayload);
    window.gtag('event', 'purchase', cleanPayload);
  }

  public trackRefund(transactionId: string, value?: number, items?: AnalyticsItem[]): void {
    if (!this.isInitialized()) return;
    const cleanItems = items ? items.map((i) => sanitizeAnalyticsItem(i)) : undefined;

    const cleanPayload: Record<string, any> = {
      transaction_id: transactionId,
      currency: 'INR',
      send_to: this.measurementId
    };

    if (value !== undefined) cleanPayload['value'] = Number(value.toFixed(2));
    if (cleanItems) cleanPayload['items'] = cleanItems;

    validateEcommercePayload('refund', cleanPayload);
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
