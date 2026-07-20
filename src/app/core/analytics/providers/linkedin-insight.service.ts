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
    _linkedin_partner_id: string;
    _linkedin_data_partner_ids: string[];
    lintrk: any;
  }
}

@Injectable({
  providedIn: 'root'
})
export class LinkedInInsightService implements AnalyticsProvider {
  readonly id = 'linkedin_insight';
  readonly name = 'LinkedIn Insight Tag (Future-Ready)';
  readonly category: ConsentCategory = 'marketing';

  private platformId = inject(PLATFORM_ID);
  private scriptLoader = inject(ScriptLoaderService);

  private initialized = false;
  private partnerId = '';

  public async init(config: AnalyticsConfig): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    if (!config.linkedIn || !config.linkedIn.partnerId) {
      return false;
    }

    this.partnerId = config.linkedIn.partnerId;

    window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
    window._linkedin_data_partner_ids.push(this.partnerId);

    const inlineScript = `
      (function(l) {
        if (!l){window.lintrk = function(a,b){window.lintrk.q.push([a,b])};
        window.lintrk.q=[]}
        var s = document.getElementsByTagName("script")[0];
        var b = document.createElement("script");
        b.type = "text/javascript";b.async = true;
        b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
        s.parentNode.insertBefore(b, s);
      })(window.lintrk);
    `;

    const loaded = this.scriptLoader.loadInlineScript(inlineScript, 'linkedin-insight-init');
    if (loaded) {
      this.initialized = true;
    }

    return loaded;
  }

  public isInitialized(): boolean {
    return this.initialized && isPlatformBrowser(this.platformId) && typeof window.lintrk === 'function';
  }

  public trackPageView(url: string, title?: string): void {
    if (!this.isInitialized()) return;
    window.lintrk('track', { conversion_id: 'page_view' });
  }

  public trackEvent(eventName: string, payload?: Record<string, any>): void {
    if (!this.isInitialized()) return;
    window.lintrk('track', { conversion_id: eventName, ...payload });
  }

  public trackAddToCart(item: AnalyticsItem, quantity?: number): void {
    if (!this.isInitialized()) return;
    window.lintrk('track', { conversion_id: 'add_to_cart' });
  }

  public trackCheckout(payload: CheckoutPayload): void {
    if (!this.isInitialized()) return;
    window.lintrk('track', { conversion_id: 'begin_checkout' });
  }

  public trackPurchase(payload: PurchasePayload): void {
    if (!this.isInitialized()) return;
    window.lintrk('track', { conversion_id: 'purchase' });
  }

  public trackLead(payload: LeadPayload): void {
    if (!this.isInitialized()) return;
    window.lintrk('track', { conversion_id: 'lead' });
  }
}
