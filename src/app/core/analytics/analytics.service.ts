import { Injectable, inject } from '@angular/core';
import {
  AnalyticsConfig,
  AnalyticsItem,
  PurchasePayload,
  CheckoutPayload,
  LeadPayload,
  AIMarketingPayload,
  RemarketingAudienceType,
  CustomerData
} from './analytics.types';
import { AnalyticsManager } from './analytics-manager';
import { RouteTrackingService } from './services/route-tracking.service';
import { ConsentService } from './services/consent.service';
import { ConfigurationService } from './services/configuration.service';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private manager = inject(AnalyticsManager);
  private routeTracker = inject(RouteTrackingService);
  private consentService = inject(ConsentService);
  private configService = inject(ConfigurationService);

  public init(config: AnalyticsConfig): void {
    this.configService.setConfig(config);
    this.manager.initializeProviders(config);
    this.routeTracker.init((url, title) => {
      this.manager.dispatchPageView(url, title);
    });
  }

  // --- General Tracking ---
  public trackPageView(url: string, title?: string): void {
    this.manager.dispatchPageView(url, title);
  }

  public trackEvent(eventName: string, payload?: Record<string, any>): void {
    this.manager.dispatchEvent(eventName, payload);
  }

  public setUserProperties(properties: Record<string, any>): void {
    this.manager.dispatchUserProperties(properties);
  }

  // --- Core Ecommerce Tracking ---
  public trackViewItem(item: AnalyticsItem): void {
    this.manager.dispatchViewItem(item);
  }

  public trackProductImpression(items: AnalyticsItem[], listName: string = 'Catalog'): void {
    this.manager.dispatchViewItemList(items, listName);
  }

  public trackProductClick(item: AnalyticsItem, listName: string = 'Catalog'): void {
    this.manager.dispatchSelectItem(item, listName);
  }

  public trackAddToCart(item: AnalyticsItem | AnalyticsItem[], quantity: number = 1): void {
    if (Array.isArray(item)) {
      item.forEach(i => this.manager.dispatchAddToCart(i, i.quantity || quantity));
    } else {
      this.manager.dispatchAddToCart(item, quantity);
    }
  }

  public trackRemoveFromCart(item: AnalyticsItem | AnalyticsItem[], quantity: number = 1): void {
    if (Array.isArray(item)) {
      item.forEach(i => this.manager.dispatchRemoveFromCart(i, i.quantity || quantity));
    } else {
      this.manager.dispatchRemoveFromCart(item, quantity);
    }
  }

  public trackViewCart(items: AnalyticsItem[], totalValue: number = 0): void {
    this.manager.dispatchViewCart(items, totalValue);
  }

  public trackWishlist(item: AnalyticsItem): void {
    this.manager.dispatchEvent('add_to_wishlist', { item });
  }

  public trackCheckout(payloadOrItems: CheckoutPayload | AnalyticsItem[], totalValue?: number): void {
    if (Array.isArray(payloadOrItems)) {
      const val = typeof totalValue === 'number' ? totalValue : payloadOrItems.reduce((acc, i) => acc + (i.price * (i.quantity || 1)), 0);
      this.manager.dispatchCheckout({
        items: payloadOrItems,
        value: val,
        currency: 'INR'
      });
    } else {
      this.manager.dispatchCheckout(payloadOrItems);
    }
  }

  public trackShippingSelected(shippingTier: string, valueOrItems: number | AnalyticsItem[] = 0, maybeItems: AnalyticsItem[] = []): void {
    const val = typeof valueOrItems === 'number' ? valueOrItems : 0;
    const items = Array.isArray(valueOrItems) ? valueOrItems : maybeItems;
    this.manager.dispatchAddShippingInfo(shippingTier, val, items);
  }

  public trackPaymentSelected(paymentType: string, valueOrItems: number | AnalyticsItem[] = 0, maybeItems: AnalyticsItem[] = []): void {
    const val = typeof valueOrItems === 'number' ? valueOrItems : 0;
    const items = Array.isArray(valueOrItems) ? valueOrItems : maybeItems;
    this.manager.dispatchAddPaymentInfo(paymentType, val, items);
  }

  public trackPurchase(payload: PurchasePayload): void {
    this.manager.dispatchPurchase(payload);
  }

  public trackRefund(transactionId: string, value?: number, items?: AnalyticsItem[]): void {
    this.manager.dispatchRefund(transactionId, value, items);
  }

  public trackCouponApplied(couponCode: string, discountAmount: number): void {
    this.manager.dispatchEvent('apply_coupon', { coupon_code: couponCode, discount_amount: discountAmount });
  }

  public trackSearch(searchTerm: string): void {
    this.manager.dispatchEvent('search', { search_term: searchTerm });
  }

  public trackFilter(filterCategory: string, filterValue: string): void {
    this.manager.dispatchEvent('filter_products', { filter_category: filterCategory, filter_value: filterValue });
  }

  public trackSort(sortBy: string): void {
    this.manager.dispatchEvent('sort_products', { sort_by: sortBy });
  }

  public trackCategoryView(categoryName: string): void {
    this.manager.dispatchEvent('view_category', { category_name: categoryName });
  }

  public trackBrandView(brandName: string): void {
    this.manager.dispatchEvent('view_brand', { brand_name: brandName });
  }

  public trackLead(payload: LeadPayload): void {
    this.manager.dispatchLead(payload);
  }

  // --- AI Marketing Events ---
  public trackNotificationOpen(campaignId: string, title: string): void {
    this.manager.dispatchEvent('notification_open', { campaign_id: campaignId, title });
    this.trackRemarketingAudience('notification_users', { campaignId });
  }

  public trackPushNotificationClick(campaignId: string, targetLink: string): void {
    this.manager.dispatchEvent('push_notification_click', { campaign_id: campaignId, target_link: targetLink });
    this.trackRemarketingAudience('notification_users', { campaignId, targetLink });
  }

  public trackCampaignClick(payload: AIMarketingPayload): void {
    this.manager.dispatchEvent('campaign_click', payload);
  }

  public trackCampaignConversion(payload: AIMarketingPayload): void {
    this.manager.dispatchEvent('campaign_conversion', payload);
  }

  public trackWhatsAppCampaign(campaignName: string, action: 'click' | 'reply' | 'conversion'): void {
    this.manager.dispatchEvent('whatsapp_campaign', { campaign_name: campaignName, action });
  }

  public trackEmailCampaign(campaignName: string, action: 'open' | 'click' | 'conversion'): void {
    this.manager.dispatchEvent('email_campaign', { campaign_name: campaignName, action });
  }

  public trackSmsCampaign(campaignName: string, action: 'click' | 'conversion'): void {
    this.manager.dispatchEvent('sms_campaign', { campaign_name: campaignName, action });
  }

  public trackAIRecommendationClick(recommendationType: string, itemId: string): void {
    this.manager.dispatchEvent('ai_recommendation_click', { recommendation_type: recommendationType, item_id: itemId });
  }

  // --- Remarketing Audience Helpers ---
  public trackRemarketingAudience(audienceType: RemarketingAudienceType, metadata?: any): void {
    this.manager.dispatchEvent('remarketing_audience_entry', {
      audience_type: audienceType,
      timestamp: new Date().toISOString(),
      metadata
    });
  }

  // --- Consent Management Shortcuts ---
  public grantAllConsent(): void {
    this.consentService.grantAll();
    this.manager.initializeProviders();
  }

  public denyAllConsent(): void {
    this.consentService.denyAll();
  }

  public updateConsent(updates: Partial<Record<'analytics' | 'marketing' | 'functional' | 'preferences', boolean>>): void {
    this.consentService.updateConsent(updates);
    this.manager.initializeProviders();
  }
}
