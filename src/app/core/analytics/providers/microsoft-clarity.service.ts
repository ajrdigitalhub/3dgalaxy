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
    clarity: any;
  }
}

@Injectable({
  providedIn: 'root'
})
export class MicrosoftClarityService implements AnalyticsProvider {
  readonly id = 'microsoft_clarity';
  readonly name = 'Microsoft Clarity';
  readonly category: ConsentCategory = 'analytics';

  private platformId = inject(PLATFORM_ID);
  private scriptLoader = inject(ScriptLoaderService);

  private initialized = false;
  private projectId = '';

  public async init(config: AnalyticsConfig): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    if (!config.clarity || !config.clarity.projectId) {
      return false;
    }

    this.projectId = config.clarity.projectId;

    const inlineScript = `
      (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window, document, "clarity", "script", "${this.projectId}");
    `;

    const loaded = this.scriptLoader.loadInlineScript(inlineScript, 'clarity-init-script');
    if (loaded) {
      this.initialized = true;
    }

    return loaded;
  }

  public isInitialized(): boolean {
    return this.initialized && isPlatformBrowser(this.platformId) && typeof window.clarity === 'function';
  }

  public trackPageView(url: string, title?: string): void {
    if (!this.isInitialized()) return;
    // Clarity automatically records session & route navigation
    window.clarity('set', 'page', url);
  }

  public trackEvent(eventName: string, payload?: Record<string, any>): void {
    if (!this.isInitialized()) return;
    window.clarity('event', eventName);
  }

  public trackPurchase(payload: PurchasePayload): void {
    if (!this.isInitialized()) return;
    window.clarity('event', 'purchase');
    window.clarity('set', 'order_value', payload.value.toString());
  }

  public trackAddToCart(item: AnalyticsItem, quantity?: number): void {
    if (!this.isInitialized()) return;
    window.clarity('event', 'add_to_cart');
  }

  public trackCheckout(payload: CheckoutPayload): void {
    if (!this.isInitialized()) return;
    window.clarity('event', 'checkout');
  }

  public trackLead(payload: LeadPayload): void {
    if (!this.isInitialized()) return;
    window.clarity('event', 'lead');
  }

  public setUserProperties(properties: Record<string, any>): void {
    if (!this.isInitialized()) return;
    Object.keys(properties).forEach((key) => {
      window.clarity('set', key, String(properties[key]));
    });
  }

  public setCustomTag(key: string, value: string): void {
    if (!this.isInitialized()) return;
    window.clarity('set', key, value);
  }

  public identifyUser(userId: string, sessionId?: string, pageId?: string, friendlyName?: string): void {
    if (!this.isInitialized()) return;
    window.clarity('identify', userId, sessionId, pageId, friendlyName);
  }
}
