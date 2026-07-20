import { Injectable, inject, signal, PLATFORM_ID, DestroyRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService } from '../../../services/api.service';
import { ConsentService } from './consent.service';
import { MetaTrackingService } from './meta-tracking.service';
import { GoogleAnalyticsService } from './google-analytics.service';
import { GoogleAdsTrackingService } from './google-ads-tracking.service';
import { GoogleTagManagerService } from './google-tag-manager.service';
import { MetaConversionsApiService } from './meta-conversions-api.service';
import { MarketingConfig, TrackingItem, TrackingCustomerData, UtmParams } from '../../models/tracking.model';

@Injectable({
  providedIn: 'root'
})
export class TrackingService {
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private api = inject(ApiService);
  private destroyRef = inject(DestroyRef);

  private consentService = inject(ConsentService);
  private metaPixel = inject(MetaTrackingService);
  private ga4 = inject(GoogleAnalyticsService);
  private gads = inject(GoogleAdsTrackingService);
  private gtm = inject(GoogleTagManagerService);
  private capi = inject(MetaConversionsApiService);

  public config = signal<MarketingConfig | null>(null);
  public utmParams = signal<UtmParams>({});

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.captureUtmParameters();
      this.loadConfigAndInitialize();
      this.listenToRouteChanges();
    }
  }

  private captureUtmParameters() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const utm_source = urlParams.get('utm_source');
      const utm_medium = urlParams.get('utm_medium');
      const utm_campaign = urlParams.get('utm_campaign');
      const utm_term = urlParams.get('utm_term');
      const utm_content = urlParams.get('utm_content');
      const fbclid = urlParams.get('fbclid');
      const gclid = urlParams.get('gclid');

      if (utm_source || fbclid || gclid) {
        const captured: UtmParams = {
          utm_source: utm_source || undefined,
          utm_medium: utm_medium || undefined,
          utm_campaign: utm_campaign || undefined,
          utm_term: utm_term || undefined,
          utm_content: utm_content || undefined,
          fbclid: fbclid || undefined,
          gclid: gclid || undefined,
          capturedAt: new Date().toISOString()
        };

        this.utmParams.set(captured);
        sessionStorage.setItem('3dgalaxy_utm_params', JSON.stringify(captured));
      } else {
        const stored = sessionStorage.getItem('3dgalaxy_utm_params');
        if (stored) {
          this.utmParams.set(JSON.parse(stored));
        }
      }
    } catch (e) {
      console.warn('Failed to capture UTM parameters:', e);
    }
  }

  private loadConfigAndInitialize() {
    this.api.get<any>('/marketing/config').subscribe({
      next: (res) => {
        if (res && res.data) {
          const cfg: MarketingConfig = res.data;
          this.config.set(cfg);

          if (cfg.enabled) {
            this.metaPixel.init(cfg);
            this.ga4.init(cfg);
            this.gads.init(cfg);
            this.gtm.init(cfg);
          }
        }
      },
      error: () => {
        // Fallback default configuration if backend endpoint is initializing
        const fallback: MarketingConfig = {
          enabled: true,
          enableEnhancedConversions: true,
          enableDynamicRemarketing: true,
          enableConsentMode: true,
          enableServerSideCapi: true,
          debugMode: false,
          defaultCurrency: 'INR'
        };
        this.config.set(fallback);
      }
    });
  }

  private listenToRouteChanges() {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event: any) => {
        const url = event.urlAfterRedirects || event.url;
        this.trackPageView(document.title || '3DGalaxy', url);
      });
  }

  private generateEventId(): string {
    return 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  public trackPageView(title: string, url: string) {
    this.metaPixel.trackPageView(url);
    this.ga4.trackPageView(title, url);
    this.gtm.pushToDataLayer({ event: 'page_view', page_title: title, page_location: url });
    this.gads.trackDynamicRemarketing('home');
  }

  public trackViewItem(item: TrackingItem) {
    this.metaPixel.trackViewContent(item);
    this.ga4.trackViewItem(item);
    this.gtm.pushToDataLayer({ event: 'view_item', ecommerce: { items: [item] } });
    this.gads.trackDynamicRemarketing('product', [item], item.price);
  }

  public trackViewItemList(items: TrackingItem[], listName: string = 'Catalog') {
    this.ga4.trackViewItemList(items, listName);
    this.gtm.pushToDataLayer({ event: 'view_item_list', item_list_name: listName, ecommerce: { items } });
    this.gads.trackDynamicRemarketing('category', items);
  }

  public trackAddToCart(item: TrackingItem, quantity: number = 1) {
    const eventId = this.generateEventId();
    this.metaPixel.trackAddToCart(item, quantity, eventId);
    this.ga4.trackAddToCart(item, quantity);
    this.gtm.pushToDataLayer({ event: 'add_to_cart', ecommerce: { value: item.price * quantity, items: [item] } });
    this.gads.trackDynamicRemarketing('cart', [item], item.price * quantity);

    if (this.config()?.enableServerSideCapi) {
      this.capi.sendCapiEvent('AddToCart', eventId, {
        currency: 'INR',
        value: item.price * quantity,
        content_ids: [item.item_id],
        content_name: item.item_name
      }, {}, this.utmParams());
    }
  }

  public trackRemoveFromCart(item: TrackingItem) {
    this.ga4.trackRemoveFromCart(item);
    this.gtm.pushToDataLayer({ event: 'remove_from_cart', ecommerce: { items: [item] } });
  }

  public trackInitiateCheckout(items: TrackingItem[], totalValue: number) {
    const eventId = this.generateEventId();
    this.metaPixel.trackInitiateCheckout(items, totalValue, eventId);
    this.ga4.trackBeginCheckout(items, totalValue);
    this.gtm.pushToDataLayer({ event: 'begin_checkout', ecommerce: { value: totalValue, items } });

    if (this.config()?.enableServerSideCapi) {
      this.capi.sendCapiEvent('InitiateCheckout', eventId, {
        currency: 'INR',
        value: totalValue,
        content_ids: items.map(i => i.item_id),
        num_items: items.length
      }, {}, this.utmParams());
    }
  }

  public trackPurchase(
    orderId: string,
    items: TrackingItem[],
    totalValue: number,
    tax: number = 0,
    shipping: number = 0,
    customerData: TrackingCustomerData = {}
  ) {
    const eventId = this.generateEventId();
    this.metaPixel.trackPurchase(orderId, items, totalValue, eventId);
    this.ga4.trackPurchase(orderId, items, totalValue, tax, shipping);
    this.gads.trackPurchaseConversion(orderId, totalValue, customerData);
    this.gtm.pushToDataLayer({ event: 'purchase', ecommerce: { transaction_id: orderId, value: totalValue, items } });
    this.gads.trackDynamicRemarketing('purchase', items, totalValue);

    if (this.config()?.enableServerSideCapi) {
      this.capi.sendCapiEvent('Purchase', eventId, {
        currency: 'INR',
        value: totalValue,
        order_id: orderId,
        content_ids: items.map(i => i.item_id),
        num_items: items.length
      }, customerData, this.utmParams());
    }
  }

  public trackLead(sourceName: string, customerData: TrackingCustomerData = {}) {
    const eventId = this.generateEventId();
    this.metaPixel.trackLead(sourceName, eventId);
    this.gads.trackLeadConversion(0);
    this.gtm.pushToDataLayer({ event: 'generate_lead', lead_source: sourceName });

    if (this.config()?.enableServerSideCapi) {
      this.capi.sendCapiEvent('Lead', eventId, {
        content_category: sourceName
      }, customerData, this.utmParams());
    }
  }

  public trackSearch(searchTerm: string) {
    this.metaPixel.trackSearch(searchTerm);
    this.ga4.trackSearch(searchTerm);
    this.gtm.pushToDataLayer({ event: 'search', search_term: searchTerm });
  }

  public trackServiceRequest(serviceType: '3D_PRINTING_SLICER' | 'LASER_CUTTING' | 'DESIGN_CONSULTATION', details: any = {}) {
    const eventId = this.generateEventId();
    this.metaPixel.trackEvent('ServiceRequest', { serviceType, ...details }, eventId);
    this.gtm.pushToDataLayer({ event: 'service_request', service_type: serviceType, details });

    if (this.config()?.enableServerSideCapi) {
      this.capi.sendCapiEvent('ServiceRequest', eventId, { serviceType, ...details }, {}, this.utmParams());
    }
  }
}
