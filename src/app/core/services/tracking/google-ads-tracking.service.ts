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

  private isPlaceholderId(id: string): boolean {
    if (!id || typeof id !== 'string') return true;
    const clean = id.replace(/^AW-/, '').trim();
    if (!clean || !/^\d{8,12}$/.test(clean)) return true;
    if (clean === '987654321' || clean === '123456789' || clean === '1234567890' || /^(\d)\1+$/.test(clean)) {
      return true;
    }
    return false;
  }

  public init(config: MarketingConfig) {
    if (!isPlatformBrowser(this.platformId) || !config.enabled || !config.googleAdsConversionId || this.isPlaceholderId(config.googleAdsConversionId)) {
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
    const formattedId = id.startsWith('AW-') ? id : `AW-${id}`;

    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== 'function') {
      window.gtag = function () {
        window.dataLayer.push(arguments);
      };
    }

    window.gtag('config', formattedId);

    // If gtag.js is already loaded (e.g. via Google tag in index.html), reuse it directly
    const existing = document.getElementById('gads-script') ||
      document.querySelector('script[src*="googletagmanager.com/gtag/js"]');
    if (existing) return;

    const script = document.createElement('script');
    script.id = 'gads-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${formattedId}`;
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

    const rawId = this.googleAdsId()!;
    const formattedId = rawId.startsWith('AW-') ? rawId : `AW-${rawId}`;
    const sendTo = this.purchaseLabel()
      ? `${formattedId}/${this.purchaseLabel()}`
      : formattedId;

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

    const rawId = this.googleAdsId()!;
    const formattedId = rawId.startsWith('AW-') ? rawId : `AW-${rawId}`;

    if (typeof window.gtag === 'function') {
      window.gtag('event', 'conversion', {
        send_to: `${formattedId}/${this.leadLabel()}`,
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
