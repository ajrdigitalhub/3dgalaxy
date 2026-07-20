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
    uetq: any[];
  }
}

@Injectable({
  providedIn: 'root'
})
export class MicrosoftAdsService implements AnalyticsProvider {
  readonly id = 'microsoft_ads';
  readonly name = 'Microsoft Ads (UET)';
  readonly category: ConsentCategory = 'marketing';

  private platformId = inject(PLATFORM_ID);
  private scriptLoader = inject(ScriptLoaderService);

  private initialized = false;
  private uetId = '';

  public async init(config: AnalyticsConfig): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    if (!config.microsoftAds || !config.microsoftAds.uetId) {
      return false;
    }

    this.uetId = config.microsoftAds.uetId;

    window.uetq = window.uetq || [];

    const inlineScript = `
      (function(w,d,t,r,u){var f,n,i;w[u]=w[u]||[],f=function(){var o={ti:"${this.uetId}"};o.q=w[u],w[u]=new UET(o),w[u].push("pageLoad")},n=d.createElement(t),n.src=r,n.async=1,n.onload=n.onreadystatechange=function(){var s=this.readyState;s&&"loaded"!==s&&"complete"!==s||(f(),n.onload=n.onreadystatechange=null)},i=d.getElementsByTagName(t)[0],i.parentNode.insertBefore(n,i)})(window,document,"script","//bat.bing.com/bat.js","uetq");
    `;

    const loaded = this.scriptLoader.loadInlineScript(inlineScript, 'microsoft-uet-init');
    if (loaded) {
      this.initialized = true;
    }

    return loaded;
  }

  public isInitialized(): boolean {
    return this.initialized && isPlatformBrowser(this.platformId) && Array.isArray(window.uetq);
  }

  public pushUet(eventAction: string, params: Record<string, any> = {}): void {
    if (!isPlatformBrowser(this.platformId)) return;
    window.uetq = window.uetq || [];
    window.uetq.push('event', eventAction, params);
  }

  public trackPageView(url: string, title?: string): void {
    if (!this.isInitialized()) return;
    window.uetq.push('pageLoad');
  }

  public trackEvent(eventName: string, payload?: Record<string, any>): void {
    if (!this.isInitialized()) return;
    this.pushUet(eventName, payload || {});
  }

  public trackAddToCart(item: AnalyticsItem, quantity?: number): void {
    if (!this.isInitialized()) return;
    this.pushUet('add_to_cart', {
      revenue_value: item.price * (quantity || 1),
      currency: item.currency || 'INR'
    });
  }

  public trackCheckout(payload: CheckoutPayload): void {
    if (!this.isInitialized()) return;
    this.pushUet('begin_checkout', {
      revenue_value: payload.value,
      currency: payload.currency || 'INR'
    });
  }

  public trackPurchase(payload: PurchasePayload): void {
    if (!this.isInitialized()) return;
    this.pushUet('purchase', {
      revenue_value: payload.value,
      currency: payload.currency || 'INR',
      transaction_id: payload.transaction_id
    });
  }

  public trackLead(payload: LeadPayload): void {
    if (!this.isInitialized()) return;
    this.pushUet('lead', {
      revenue_value: payload.value || 0,
      currency: payload.currency || 'INR'
    });
  }

  public trackContact(): void {
    if (!this.isInitialized()) return;
    this.pushUet('contact', {});
  }

  public trackNewsletter(): void {
    if (!this.isInitialized()) return;
    this.pushUet('newsletter_signup', {});
  }

  public trackPhoneClick(): void {
    if (!this.isInitialized()) return;
    this.pushUet('phone_click', {});
  }

  public trackWhatsAppClick(): void {
    if (!this.isInitialized()) return;
    this.pushUet('whatsapp_click', {});
  }
}
