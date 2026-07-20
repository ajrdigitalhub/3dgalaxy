import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MarketingConfig, TrackingItem, TrackingCustomerData } from '../../models/tracking.model';

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

@Injectable({
  providedIn: 'root'
})
export class MetaTrackingService {
  private platformId = inject(PLATFORM_ID);
  private initialized = signal<boolean>(false);
  private pixelId = signal<string | null>(null);
  private eventQueue: Array<{ eventName: string; payload?: any; eventId?: string }> = [];

  public init(config: MarketingConfig) {
    if (!isPlatformBrowser(this.platformId) || !config.enabled || !config.metaPixelId) {
      return;
    }

    this.pixelId.set(config.metaPixelId);
    this.injectPixelScript(config.metaPixelId);
  }

  private injectPixelScript(pixelId: string) {
    if (window.fbq) {
      this.initialized.set(true);
      this.flushQueue();
      return;
    }

    /* tslint:disable */
    const n: any = (window.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    });
    if (!window._fbq) window._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = '2.0';
    n.queue = [];
    /* tslint:enable */

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    script.onload = () => {
      window.fbq('init', pixelId);
      this.initialized.set(true);
      this.flushQueue();
    };

    document.head.appendChild(script);
  }

  private flushQueue() {
    while (this.eventQueue.length > 0) {
      const item = this.eventQueue.shift();
      if (item) {
        this.trackEvent(item.eventName, item.payload, item.eventId);
      }
    }
  }

  public trackEvent(eventName: string, payload?: any, eventId?: string) {
    if (!isPlatformBrowser(this.platformId) || !this.pixelId()) {
      return;
    }

    if (!this.initialized()) {
      this.eventQueue.push({ eventName, payload, eventId });
      return;
    }

    try {
      const options = eventId ? { eventID: eventId } : undefined;
      if (payload) {
        window.fbq('track', eventName, payload, options);
      } else {
        window.fbq('track', eventName, undefined, options);
      }
    } catch (error) {
      console.warn(`[Meta Pixel] Error tracking event ${eventName}:`, error);
    }
  }

  public trackPageView(url?: string) {
    this.trackEvent('PageView', url ? { page_path: url } : undefined);
  }

  public trackViewContent(item: TrackingItem) {
    this.trackEvent('ViewContent', {
      content_ids: [item.item_id],
      content_name: item.item_name,
      content_type: 'product',
      content_category: item.item_category || 'General',
      value: item.price,
      currency: item.currency || 'INR'
    });
  }

  public trackAddToCart(item: TrackingItem, quantity: number = 1, eventId?: string) {
    this.trackEvent(
      'AddToCart',
      {
        content_ids: [item.item_id],
        content_name: item.item_name,
        content_type: 'product',
        value: item.price * quantity,
        currency: item.currency || 'INR',
        num_items: quantity
      },
      eventId
    );
  }

  public trackInitiateCheckout(items: TrackingItem[], totalValue: number, eventId?: string) {
    this.trackEvent(
      'InitiateCheckout',
      {
        content_ids: items.map(i => i.item_id),
        content_type: 'product',
        value: totalValue,
        currency: 'INR',
        num_items: items.reduce((acc, i) => acc + (i.quantity || 1), 0)
      },
      eventId
    );
  }

  public trackPurchase(orderId: string, items: TrackingItem[], totalValue: number, eventId?: string) {
    this.trackEvent(
      'Purchase',
      {
        content_ids: items.map(i => i.item_id),
        content_type: 'product',
        value: totalValue,
        currency: 'INR',
        num_items: items.reduce((acc, i) => acc + (i.quantity || 1), 0),
        order_id: orderId
      },
      eventId
    );
  }

  public trackLead(categoryName: string, eventId?: string) {
    this.trackEvent(
      'Lead',
      {
        content_category: categoryName,
        value: 0,
        currency: 'INR'
      },
      eventId
    );
  }

  public trackSearch(searchTerm: string) {
    this.trackEvent('Search', {
      search_string: searchTerm
    });
  }
}
