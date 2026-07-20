export interface MarketingConfig {
  enabled: boolean;
  metaPixelId?: string | null;
  metaCapiToken?: string | null;
  metaCatalogId?: string | null;
  ga4MeasurementId?: string | null;
  googleAdsConversionId?: string | null;
  googleAdsConversionLabel?: string | null;
  googleAdsLeadLabel?: string | null;
  gtmContainerId?: string | null;
  googleMerchantCenterId?: string | null;
  enableEnhancedConversions: boolean;
  enableDynamicRemarketing: boolean;
  enableConsentMode: boolean;
  enableServerSideCapi: boolean;
  debugMode: boolean;
  defaultCurrency: string;
}

export interface TrackingItem {
  item_id: string;
  item_name: string;
  sku?: string | null;
  variant_id?: string | null;
  variant_name?: string | null;
  item_category?: string | null;
  item_brand?: string | null;
  price: number;
  discount?: number | null;
  currency?: string;
  quantity?: number;
  in_stock?: boolean;
  item_image?: string | null;
  item_url?: string | null;
}

export interface TrackingCustomerData {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  externalId?: string | null;
}

export interface UtmParams {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  fbclid?: string | null;
  gclid?: string | null;
  capturedAt?: string;
}

export interface ConsentState {
  ad_storage: 'granted' | 'denied';
  analytics_storage: 'granted' | 'denied';
  ad_user_data: 'granted' | 'denied';
  ad_personalization: 'granted' | 'denied';
}

export interface MetaCapiPayload {
  eventName: string;
  eventId: string;
  eventTime?: number;
  eventSourceUrl?: string;
  userData: TrackingCustomerData;
  customData: {
    currency?: string;
    value?: number;
    content_ids?: string[];
    content_name?: string;
    content_type?: string;
    content_category?: string;
    num_items?: number;
    order_id?: string;
    items?: Array<{ id: string; quantity: number; item_price: number }>;
    [key: string]: any;
  };
  utmParams?: UtmParams;
}

export interface MerchantFeedItem {
  id: string;
  title: string;
  description: string;
  link: string;
  image_link: string;
  additional_image_links?: string[];
  availability: 'in_stock' | 'out_of_stock';
  price: string;
  sale_price?: string;
  brand: string;
  gtin?: string;
  mpn?: string;
  condition: 'new' | 'refurbished' | 'used';
  google_product_category?: string;
  custom_label_0?: string;
}

export interface MarketingDashboardStats {
  metaPixelStatus: 'active' | 'inactive' | 'error';
  metaCapiStatus: 'active' | 'inactive' | 'error';
  ga4Status: 'active' | 'inactive' | 'error';
  googleAdsStatus: 'active' | 'inactive' | 'error';
  gtmStatus: 'active' | 'inactive' | 'error';
  totalEventsSentToday: number;
  capiSuccessRate: number;
  lastEventTime?: string;
  recentLogs: Array<{
    id: string;
    eventName: string;
    channel: string;
    status: 'success' | 'failed';
    timestamp: string;
    details?: any;
  }>;
}
