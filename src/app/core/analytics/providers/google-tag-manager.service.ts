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

    if (!config.gtm || !config.gtm.containerId || config.gtm.containerId.startsWith('GTM-3DGLX')) {
      return false;
    }

    this.containerId = config.gtm.containerId;
    const dataLayerName = config.gtm.dataLayerName || 'dataLayer';

    window[dataLayerName as any] = window[dataLayerName as any] || [];

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
    return this.initialized && isPlatformBrowser(this.platformId) && Array.isArray(window.dataLayer);
  }

  public pushToDataLayer(object: Record<string, any>): void {
    if (!isPlatformBrowser(this.platformId)) return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(object);
  }

  public trackPageView(url: string, title?: string): void {
    this.pushToDataLayer({
      event: 'page_view',
      page_location: url,
      page_title: title || (typeof document !== 'undefined' ? document.title : '')
    });
  }

  public trackEvent(eventName: string, payload?: Record<string, any>): void {
    this.pushToDataLayer({
      event: eventName,
      ...payload
    });
  }

  public trackProductView(item: AnalyticsItem): void {
    this.pushToDataLayer({
      event: 'view_item',
      ecommerce: {
        currency: item.currency || 'INR',
        value: item.price,
        items: [item]
      }
    });
  }

  public trackAddToCart(item: AnalyticsItem, quantity: number = 1): void {
    this.pushToDataLayer({
      event: 'add_to_cart',
      ecommerce: {
        currency: item.currency || 'INR',
        value: item.price * quantity,
        items: [{ ...item, quantity }]
      }
    });
  }

  public trackWishlist(item: AnalyticsItem): void {
    this.pushToDataLayer({
      event: 'add_to_wishlist',
      ecommerce: {
        currency: item.currency || 'INR',
        value: item.price,
        items: [item]
      }
    });
  }

  public trackCheckout(payload: CheckoutPayload): void {
    this.pushToDataLayer({
      event: 'begin_checkout',
      ecommerce: {
        currency: payload.currency || 'INR',
        value: payload.value,
        coupon: payload.coupon,
        items: payload.items
      }
    });
  }

  public trackPurchase(payload: PurchasePayload): void {
    this.pushToDataLayer({
      event: 'purchase',
      ecommerce: {
        transaction_id: payload.transaction_id,
        value: payload.value,
        tax: payload.tax || 0,
        shipping: payload.shipping || 0,
        currency: payload.currency || 'INR',
        coupon: payload.coupon,
        items: payload.items
      }
    });
  }

  public trackLead(payload: LeadPayload): void {
    this.pushToDataLayer({
      event: 'generate_lead',
      lead_source: payload.source,
      lead_type: payload.lead_type,
      value: payload.value || 0
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
      discount_amount: discountAmount
    });
  }
}
