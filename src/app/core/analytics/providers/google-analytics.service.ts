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
    window.gtag = window.gtag || function () {
      window.dataLayer.push(arguments);
    };

    window.gtag('js', new Date());
    window.gtag('config', this.measurementId, {
      send_page_view: config.ga4.sendPageViewOnLoad ?? false
    });

    const scriptUrl = `https://www.googletagmanager.com/gtag/js?id=${this.measurementId}`;
    const loaded = await this.scriptLoader.loadScript(scriptUrl);

    if (loaded) {
      this.initialized = true;
    }

    return loaded;
  }

  public isInitialized(): boolean {
    return this.initialized && isPlatformBrowser(this.platformId) && typeof window.gtag === 'function';
  }

  public trackPageView(url: string, title?: string): void {
    if (!this.isInitialized()) return;
    window.gtag('event', 'page_view', {
      page_title: title || (typeof document !== 'undefined' ? document.title : ''),
      page_location: url,
      send_to: this.measurementId
    });
  }

  public trackEvent(eventName: string, payload?: Record<string, any>): void {
    if (!this.isInitialized()) return;
    window.gtag('event', eventName, payload || {});
  }

  public trackViewItem(item: AnalyticsItem): void {
    if (!this.isInitialized()) return;
    window.gtag('event', 'view_item', {
      currency: item.currency || 'INR',
      value: item.price,
      items: [item]
    });
  }

  public trackViewItemList(items: AnalyticsItem[], listName: string = 'Catalog'): void {
    if (!this.isInitialized()) return;
    window.gtag('event', 'view_item_list', {
      item_list_name: listName,
      items
    });
  }

  public trackViewCart(items: AnalyticsItem[], totalValue: number): void {
    if (!this.isInitialized()) return;
    window.gtag('event', 'view_cart', {
      currency: 'INR',
      value: totalValue,
      items
    });
  }

  public trackAddToCart(item: AnalyticsItem, quantity: number = 1): void {
    if (!this.isInitialized()) return;
    window.gtag('event', 'add_to_cart', {
      currency: item.currency || 'INR',
      value: item.price * quantity,
      items: [{ ...item, quantity }]
    });
  }

  public trackRemoveFromCart(item: AnalyticsItem, quantity: number = 1): void {
    if (!this.isInitialized()) return;
    window.gtag('event', 'remove_from_cart', {
      currency: item.currency || 'INR',
      value: item.price * quantity,
      items: [{ ...item, quantity }]
    });
  }

  public trackCheckout(payload: CheckoutPayload): void {
    if (!this.isInitialized()) return;
    window.gtag('event', 'begin_checkout', {
      currency: payload.currency || 'INR',
      value: payload.value,
      coupon: payload.coupon,
      items: payload.items
    });
  }

  public trackAddPaymentInfo(paymentType: string, payload: CheckoutPayload): void {
    if (!this.isInitialized()) return;
    window.gtag('event', 'add_payment_info', {
      currency: payload.currency || 'INR',
      value: payload.value,
      payment_type: paymentType,
      items: payload.items
    });
  }

  public trackPurchase(payload: PurchasePayload): void {
    if (!this.isInitialized()) return;
    window.gtag('event', 'purchase', {
      transaction_id: payload.transaction_id,
      value: payload.value,
      tax: payload.tax || 0,
      shipping: payload.shipping || 0,
      currency: payload.currency || 'INR',
      coupon: payload.coupon,
      items: payload.items
    });
  }

  public trackRefund(transactionId: string, value?: number, items?: AnalyticsItem[]): void {
    if (!this.isInitialized()) return;
    window.gtag('event', 'refund', {
      transaction_id: transactionId,
      value,
      currency: 'INR',
      items
    });
  }

  public trackLead(payload: LeadPayload): void {
    if (!this.isInitialized()) return;
    window.gtag('event', 'generate_lead', {
      value: payload.value || 0,
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
    window.gtag('set', 'user_properties', properties);
  }
}
