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
    ttq: any;
  }
}

@Injectable({
  providedIn: 'root'
})
export class TikTokPixelService implements AnalyticsProvider {
  readonly id = 'tiktok_pixel';
  readonly name = 'TikTok Pixel (Future-Ready)';
  readonly category: ConsentCategory = 'marketing';

  private platformId = inject(PLATFORM_ID);
  private scriptLoader = inject(ScriptLoaderService);

  private initialized = false;
  private pixelId = '';

  public async init(config: AnalyticsConfig): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    if (!config.tikTok || !config.tikTok.pixelId) {
      return false;
    }

    this.pixelId = config.tikTok.pixelId;

    const inlineScript = `
      !function (w, d, t) {
        w.TiktokAnalyticsObject = t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
        ttq.load('${this.pixelId}');
        ttq.page();
      }(window, document, 'ttq');
    `;

    const loaded = this.scriptLoader.loadInlineScript(inlineScript, 'tiktok-pixel-init');
    if (loaded) {
      this.initialized = true;
    }

    return loaded;
  }

  public isInitialized(): boolean {
    return this.initialized && isPlatformBrowser(this.platformId) && typeof window.ttq === 'object';
  }

  public trackPageView(url: string, title?: string): void {
    if (!this.isInitialized()) return;
    window.ttq.page();
  }

  public trackEvent(eventName: string, payload?: Record<string, any>): void {
    if (!this.isInitialized()) return;
    window.ttq.track(eventName, payload || {});
  }

  public trackAddToCart(item: AnalyticsItem, quantity?: number): void {
    if (!this.isInitialized()) return;
    window.ttq.track('AddToCart', {
      content_id: item.item_id,
      content_name: item.item_name,
      value: item.price * (quantity || 1),
      currency: item.currency || 'INR'
    });
  }

  public trackCheckout(payload: CheckoutPayload): void {
    if (!this.isInitialized()) return;
    window.ttq.track('InitiateCheckout', {
      value: payload.value,
      currency: payload.currency || 'INR'
    });
  }

  public trackPurchase(payload: PurchasePayload): void {
    if (!this.isInitialized()) return;
    window.ttq.track('CompletePayment', {
      value: payload.value,
      currency: payload.currency || 'INR'
    });
  }

  public trackLead(payload: LeadPayload): void {
    if (!this.isInitialized()) return;
    window.ttq.track('SubmitForm', {
      value: payload.value || 0,
      currency: payload.currency || 'INR'
    });
  }
}
