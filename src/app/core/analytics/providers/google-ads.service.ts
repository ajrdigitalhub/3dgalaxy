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

@Injectable({
  providedIn: 'root'
})
export class GoogleAdsService implements AnalyticsProvider {
  readonly id = 'google_ads';
  readonly name = 'Google Ads Conversion & Remarketing';
  readonly category: ConsentCategory = 'marketing';

  private platformId = inject(PLATFORM_ID);
  private scriptLoader = inject(ScriptLoaderService);

  private initialized = false;
  private conversionIds: string[] = [];
  private purchaseLabel?: string;
  private leadLabel?: string;
  private newsletterLabel?: string;
  private contactLabel?: string;
  private callLabel?: string;
  private whatsappLabel?: string;
  private couponLabel?: string;

  public async init(config: AnalyticsConfig): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    if (!config.googleAds || !config.googleAds.conversionIds || config.googleAds.conversionIds.length === 0) {
      return false;
    }

    this.conversionIds = config.googleAds.conversionIds;
    this.purchaseLabel = config.googleAds.purchaseConversionLabel;
    this.leadLabel = config.googleAds.leadConversionLabel;
    this.newsletterLabel = config.googleAds.newsletterConversionLabel;
    this.contactLabel = config.googleAds.contactConversionLabel;
    this.callLabel = config.googleAds.callConversionLabel;
    this.whatsappLabel = config.googleAds.whatsappConversionLabel;
    this.couponLabel = config.googleAds.couponConversionLabel;

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () {
      window.dataLayer.push(arguments);
    };

    window.gtag('js', new Date());

    this.conversionIds.forEach((convId) => {
      window.gtag('config', convId);
    });

    const scriptUrl = `https://www.googletagmanager.com/gtag/js?id=${this.conversionIds[0]}`;
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
    // Handled by remarketing page type tracking
    this.trackDynamicRemarketing('other');
  }

  public trackEvent(eventName: string, payload?: Record<string, any>): void {
    if (!this.isInitialized()) return;
    window.gtag('event', eventName, payload || {});
  }

  public trackAddToCart(item: AnalyticsItem, quantity: number = 1): void {
    this.trackDynamicRemarketing('cart', [item], item.price * quantity);
  }

  public trackCheckout(payload: CheckoutPayload): void {
    this.trackDynamicRemarketing('checkout', payload.items, payload.value);
  }

  public trackPurchase(payload: PurchasePayload): void {
    if (!this.isInitialized()) return;

    const convId = this.conversionIds[0];
    const sendTo = this.purchaseLabel ? `${convId}/${this.purchaseLabel}` : convId;

    const conversionData: Record<string, any> = {
      send_to: sendTo,
      value: payload.value,
      currency: payload.currency || 'INR',
      transaction_id: payload.transaction_id
    };

    if (payload.customerData) {
      this.setEnhancedConversions(payload.customerData);
    }

    window.gtag('event', 'conversion', conversionData);
    this.trackDynamicRemarketing('purchase', payload.items, payload.value);
  }

  public trackLead(payload: LeadPayload): void {
    if (!this.isInitialized()) return;

    const convId = this.conversionIds[0];
    const sendTo = this.leadLabel ? `${convId}/${this.leadLabel}` : convId;

    if (payload.customerData) {
      this.setEnhancedConversions(payload.customerData);
    }

    window.gtag('event', 'conversion', {
      send_to: sendTo,
      value: payload.value || 0,
      currency: payload.currency || 'INR'
    });
  }

  public trackNewsletter(email?: string): void {
    if (!this.isInitialized()) return;
    const convId = this.conversionIds[0];
    const sendTo = this.newsletterLabel ? `${convId}/${this.newsletterLabel}` : convId;
    if (email) {
      this.setEnhancedConversions({ email });
    }
    window.gtag('event', 'conversion', { send_to: sendTo });
  }

  public trackContact(): void {
    if (!this.isInitialized()) return;
    const convId = this.conversionIds[0];
    const sendTo = this.contactLabel ? `${convId}/${this.contactLabel}` : convId;
    window.gtag('event', 'conversion', { send_to: sendTo });
  }

  public trackCall(): void {
    if (!this.isInitialized()) return;
    const convId = this.conversionIds[0];
    const sendTo = this.callLabel ? `${convId}/${this.callLabel}` : convId;
    window.gtag('event', 'conversion', { send_to: sendTo });
  }

  public trackWhatsApp(): void {
    if (!this.isInitialized()) return;
    const convId = this.conversionIds[0];
    const sendTo = this.whatsappLabel ? `${convId}/${this.whatsappLabel}` : convId;
    window.gtag('event', 'conversion', { send_to: sendTo });
  }

  public trackCoupon(couponCode: string): void {
    if (!this.isInitialized()) return;
    const convId = this.conversionIds[0];
    const sendTo = this.couponLabel ? `${convId}/${this.couponLabel}` : convId;
    window.gtag('event', 'conversion', {
      send_to: sendTo,
      coupon_code: couponCode
    });
  }

  public trackDynamicRemarketing(
    pageType: 'home' | 'searchresults' | 'category' | 'product' | 'cart' | 'checkout' | 'purchase' | 'other',
    items?: AnalyticsItem[],
    totalValue?: number
  ): void {
    if (!this.isInitialized()) return;

    window.gtag('event', 'page_view', {
      ecomm_pagetype: pageType,
      ecomm_prodid: items ? items.map((i) => i.item_id) : undefined,
      ecomm_totalvalue: totalValue !== undefined ? totalValue : items ? items.reduce((acc, curr) => acc + curr.price * (curr.quantity || 1), 0) : undefined
    });
  }

  public setEnhancedConversions(customerData: CustomerData): void {
    if (!this.isInitialized()) return;

    const userData: Record<string, string> = {};
    if (customerData.email) userData['email'] = customerData.email;
    if (customerData.phone) userData['phone_number'] = customerData.phone;
    if (customerData.firstName) userData['first_name'] = customerData.firstName;
    if (customerData.lastName) userData['last_name'] = customerData.lastName;

    window.gtag('set', 'user_data', userData);
  }
}
