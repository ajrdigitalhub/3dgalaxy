/**
 * Digital Marketing Analytics Framework - TypeScript Types & Interfaces
 * 3d Galaxy Angular SPA Architecture
 */

export type ConsentCategory = 'analytics' | 'marketing' | 'functional' | 'preferences';

export interface ConsentState {
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
  preferences: boolean;
  updatedAt: string;
}

export interface AnalyticsItem {
  item_id: string;
  item_name: string;
  item_category?: string;
  item_category2?: string;
  item_brand?: string;
  item_variant?: string;
  price: number;
  quantity?: number;
  currency?: string;
  index?: number;
  discount?: number;
  coupon?: string;
}

export interface CustomerData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  externalId?: string;
}

export interface PurchasePayload {
  transaction_id: string;
  value: number;
  tax?: number;
  shipping?: number;
  currency?: string;
  coupon?: string;
  items: AnalyticsItem[];
  customerData?: CustomerData;
}

export interface CheckoutPayload {
  value: number;
  currency?: string;
  coupon?: string;
  items: AnalyticsItem[];
  step?: number;
  option?: string;
}

export interface CartPayload {
  value: number;
  currency?: string;
  items: AnalyticsItem[];
}

export interface LeadPayload {
  lead_type?: string;
  source?: string;
  value?: number;
  currency?: string;
  customerData?: CustomerData;
}

export interface AIMarketingPayload {
  campaign_id?: string;
  campaign_name?: string;
  channel?: 'whatsapp' | 'email' | 'sms' | 'push_notification' | 'ai_recommendation';
  source?: string;
  medium?: string;
  recommendation_type?: string;
  item_id?: string;
  metadata?: Record<string, any>;
}

export interface QueuedEvent {
  id: string;
  eventType: 'page_view' | 'event' | 'purchase' | 'add_to_cart' | 'checkout' | 'lead' | 'user_properties';
  eventName?: string;
  payload?: any;
  timestamp: number;
  targetProviderId?: string;
}

export interface MetaPixelConfig {
  pixelIds: string[];
  enableAdvancedMatching?: boolean;
}

export interface GA4Config {
  measurementId: string;
  enableEnhancedEcommerce?: boolean;
  sendPageViewOnLoad?: boolean;
}

export interface GoogleAdsConfig {
  conversionIds: string[];
  purchaseConversionLabel?: string;
  leadConversionLabel?: string;
  newsletterConversionLabel?: string;
  contactConversionLabel?: string;
  callConversionLabel?: string;
  whatsappConversionLabel?: string;
  couponConversionLabel?: string;
  enableEnhancedConversions?: boolean;
  enableDynamicRemarketing?: boolean;
}

export interface GTMConfig {
  containerId: string;
  dataLayerName?: string;
}

export interface ClarityConfig {
  projectId: string;
}

export interface MicrosoftAdsConfig {
  uetId: string;
}

export interface TikTokConfig {
  pixelId: string;
}

export interface LinkedInConfig {
  partnerId: string;
}

export interface AnalyticsConfig {
  enabled: boolean;
  debugMode?: boolean;
  defaultCurrency?: string;
  ignoredRoutes?: (string | RegExp)[];
  meta?: MetaPixelConfig;
  ga4?: GA4Config;
  googleAds?: GoogleAdsConfig;
  gtm?: GTMConfig;
  clarity?: ClarityConfig;
  microsoftAds?: MicrosoftAdsConfig;
  tikTok?: TikTokConfig;
  linkedIn?: LinkedInConfig;
}

export interface AnalyticsProvider {
  readonly id: string;
  readonly name: string;
  readonly category: ConsentCategory;

  init(config: AnalyticsConfig): Promise<boolean>;
  isInitialized(): boolean;

  trackPageView(url: string, title?: string): void;
  trackEvent(eventName: string, payload?: Record<string, any>): void;
  trackPurchase(payload: PurchasePayload): void;
  trackAddToCart(item: AnalyticsItem, quantity?: number): void;
  trackCheckout(payload: CheckoutPayload): void;
  trackLead(payload: LeadPayload): void;

  setUserProperties?(properties: Record<string, any>): void;
  grantConsent?(): void;
  revokeConsent?(): void;
}

export type RemarketingAudienceType =
  | 'visitors'
  | 'product_viewers'
  | 'cart_abandoners'
  | 'checkout_abandoners'
  | 'previous_buyers'
  | 'repeat_buyers'
  | 'wishlist_users'
  | 'notification_users';
