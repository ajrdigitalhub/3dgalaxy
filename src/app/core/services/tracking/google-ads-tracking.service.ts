import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MarketingConfig, TrackingItem, TrackingCustomerData } from '../../models/tracking.model';

@Injectable({
  providedIn: 'root'
})
export class GoogleAdsTrackingService {
  private platformId = inject(PLATFORM_ID);
  private googleAdsId = signal<string | null>(null);
  private purchaseLabel = signal<string | null>(null);
  private leadLabel = signal<string | null>(null);
  private enableEnhancedConversions = signal<boolean>(false);
  private enableDynamicRemarketing = signal<boolean>(false);

  public init(config: MarketingConfig) {
    if (!isPlatformBrowser(this.platformId) || !config.enabled || !config.googleAdsConversionId) {
      return;
    }

    this.googleAdsId.set(config.googleAdsConversionId);
    this.purchaseLabel.set(config.googleAdsConversionLabel || null);
    this.leadLabel.set(config.googleAdsLeadLabel || null);
    this.enableEnhancedConversions.set(config.enableEnhancedConversions);
    this.enableDynamicRemarketing.set(config.enableDynamicRemarketing);

    this.injectGoogleAdsScript(config.googleAdsConversionId);
  }

  private injectGoogleAdsScript(id: string) {
    if (document.getElementById('gads-script')) return;

    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== 'function') {
      window.gtag = function () {
        window.dataLayer.push(arguments);
      };
    }

    window.gtag('config', id);

    const script = document.createElement('script');
    script.id = 'gads-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    document.head.appendChild(script);
  }

  // SHA-256 Hashing for Enhanced Conversions
  private async hashValue(val: string): Promise<string> {
    const clean = val.trim().toLowerCase();
    const encoder = new TextEncoder();
    const data = encoder.encode(clean);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  public async setEnhancedConversionUserData(user: TrackingCustomerData) {
    if (!isPlatformBrowser(this.platformId) || !this.enableEnhancedConversions()) return;

    const userData: any = {};
    if (user.email) userData.email = await this.hashValue(user.email);
    if (user.phone) userData.phone_number = await this.hashValue(user.phone);
    if (user.firstName) userData.first_name = await this.hashValue(user.firstName);
    if (user.lastName) userData.last_name = await this.hashValue(user.lastName);

    if (typeof window.gtag === 'function') {
      window.gtag('set', 'user_data', userData);
    }
  }

  public trackPurchaseConversion(orderId: string, value: number, customerData?: TrackingCustomerData) {
    if (!isPlatformBrowser(this.platformId) || !this.googleAdsId()) return;

    if (customerData) {
      this.setEnhancedConversionUserData(customerData);
    }

    const sendTo = this.purchaseLabel()
      ? `${this.googleAdsId()}/${this.purchaseLabel()}`
      : this.googleAdsId()!;

    if (typeof window.gtag === 'function') {
      window.gtag('event', 'conversion', {
        send_to: sendTo,
        value,
        currency: 'INR',
        transaction_id: orderId
      });
    }
  }

  public trackLeadConversion(value: number = 0) {
    if (!isPlatformBrowser(this.platformId) || !this.googleAdsId() || !this.leadLabel()) return;

    if (typeof window.gtag === 'function') {
      window.gtag('event', 'conversion', {
        send_to: `${this.googleAdsId()}/${this.leadLabel()}`,
        value,
        currency: 'INR'
      });
    }
  }

  public trackDynamicRemarketing(pageType: 'home' | 'category' | 'product' | 'cart' | 'purchase', items?: TrackingItem[], totalValue: number = 0) {
    if (!isPlatformBrowser(this.platformId) || !this.enableDynamicRemarketing()) return;

    const prodIds = items && items.length > 0 ? items.map(i => i.item_id) : [];

    if (typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        ecomm_pagetype: pageType,
        ecomm_prodid: prodIds,
        ecomm_totalvalue: totalValue
      });
    }
  }
}
