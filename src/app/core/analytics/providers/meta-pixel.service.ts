import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  AnalyticsProvider,
  AnalyticsConfig,
  ConsentCategory,
  AnalyticsItem,
  PurchasePayload,
  CheckoutPayload,
  LeadPayload,
  CustomerData
} from '../analytics.types';
import { ScriptLoaderService } from '../services/script-loader.service';

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

@Injectable({
  providedIn: 'root'
})
export class MetaPixelService implements AnalyticsProvider {
  readonly id = 'meta_pixel';
  readonly name = 'Meta Pixel';
  readonly category: ConsentCategory = 'marketing';

  private platformId = inject(PLATFORM_ID);
  private scriptLoader = inject(ScriptLoaderService);

  private initialized = false;
  private pixelIds: string[] = [];

  public async init(config: AnalyticsConfig): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    if (!config.meta || !config.meta.pixelIds || config.meta.pixelIds.length === 0) {
      return false;
    }

    this.pixelIds = config.meta.pixelIds;

    const inlineScript = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
    `;

    this.scriptLoader.loadInlineScript(inlineScript, 'meta-pixel-init');

    if (window.fbq) {
      this.pixelIds.forEach((pixelId) => {
        window.fbq('init', pixelId);
      });
      this.initialized = true;
      return true;
    }

    return false;
  }

  public isInitialized(): boolean {
    return this.initialized && isPlatformBrowser(this.platformId) && typeof window.fbq === 'function';
  }

  public setAdvancedMatching(customerData: CustomerData): void {
    if (!this.isInitialized()) return;

    const matchData: Record<string, string> = {};
    if (customerData.email) matchData['em'] = customerData.email.toLowerCase().trim();
    if (customerData.phone) matchData['ph'] = customerData.phone.replace(/\D/g, '');
    if (customerData.firstName) matchData['fn'] = customerData.firstName.toLowerCase().trim();
    if (customerData.lastName) matchData['ln'] = customerData.lastName.toLowerCase().trim();
    if (customerData.city) matchData['ct'] = customerData.city.toLowerCase().trim();
    if (customerData.state) matchData['st'] = customerData.state.toLowerCase().trim();
    if (customerData.postalCode) matchData['zp'] = customerData.postalCode.trim();
    if (customerData.country) matchData['country'] = customerData.country.toLowerCase().trim();

    this.pixelIds.forEach((pixelId) => {
      window.fbq('init', pixelId, matchData);
    });
  }

  public trackPageView(url: string, title?: string): void {
    if (!this.isInitialized()) return;
    window.fbq('track', 'PageView');
  }

  public trackEvent(eventName: string, payload?: Record<string, any>): void {
    if (!this.isInitialized()) return;
    window.fbq('trackCustom', eventName, payload || {});
  }

  public trackViewContent(item: AnalyticsItem): void {
    if (!this.isInitialized()) return;
    window.fbq('track', 'ViewContent', {
      content_name: item.item_name,
      content_category: item.item_category,
      content_ids: [item.item_id],
      content_type: 'product',
      value: item.price,
      currency: item.currency || 'INR'
    });
  }

  public trackAddToCart(item: AnalyticsItem, quantity: number = 1): void {
    if (!this.isInitialized()) return;
    window.fbq('track', 'AddToCart', {
      content_name: item.item_name,
      content_category: item.item_category,
      content_ids: [item.item_id],
      content_type: 'product',
      value: item.price * quantity,
      currency: item.currency || 'INR'
    });
  }

  public trackCheckout(payload: CheckoutPayload): void {
    if (!this.isInitialized()) return;
    window.fbq('track', 'InitiateCheckout', {
      content_ids: payload.items.map((i) => i.item_id),
      content_type: 'product',
      num_items: payload.items.reduce((acc, curr) => acc + (curr.quantity || 1), 0),
      value: payload.value,
      currency: payload.currency || 'INR'
    });
  }

  public trackPurchase(payload: PurchasePayload): void {
    if (!this.isInitialized()) return;

    if (payload.customerData) {
      this.setAdvancedMatching(payload.customerData);
    }

    window.fbq('track', 'Purchase', {
      content_ids: payload.items.map((i) => i.item_id),
      content_type: 'product',
      value: payload.value,
      currency: payload.currency || 'INR',
      num_items: payload.items.reduce((acc, curr) => acc + (curr.quantity || 1), 0)
    });
  }

  public trackLead(payload: LeadPayload): void {
    if (!this.isInitialized()) return;

    if (payload.customerData) {
      this.setAdvancedMatching(payload.customerData);
    }

    window.fbq('track', 'Lead', {
      content_name: payload.source || 'General Lead',
      value: payload.value || 0,
      currency: payload.currency || 'INR'
    });
  }

  public trackCompleteRegistration(method?: string): void {
    if (!this.isInitialized()) return;
    window.fbq('track', 'CompleteRegistration', {
      registration_method: method || 'Standard'
    });
  }

  public trackSearch(searchQuery: string): void {
    if (!this.isInitialized()) return;
    window.fbq('track', 'Search', {
      search_string: searchQuery
    });
  }

  public trackCustomizeProduct(item: AnalyticsItem, customizationDetails: Record<string, any>): void {
    if (!this.isInitialized()) return;
    window.fbq('track', 'CustomizeProduct', {
      content_ids: [item.item_id],
      content_name: item.item_name,
      customization_details: customizationDetails,
      value: item.price,
      currency: item.currency || 'INR'
    });
  }
}
