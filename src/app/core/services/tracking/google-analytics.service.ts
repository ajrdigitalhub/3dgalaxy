import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MarketingConfig, TrackingItem } from '../../models/tracking.model';

@Injectable({
  providedIn: 'root'
})
export class GoogleAnalyticsService {
  private platformId = inject(PLATFORM_ID);
  private measurementId = signal<string | null>(null);
  private initialized = signal<boolean>(false);

  public init(config: MarketingConfig) {
    if (!isPlatformBrowser(this.platformId) || !config.enabled || !config.ga4MeasurementId) {
      return;
    }

    this.measurementId.set(config.ga4MeasurementId);
    this.injectGa4Script(config.ga4MeasurementId);
  }

  private injectGa4Script(id: string) {
    if (document.getElementById('ga4-script')) {
      this.initialized.set(true);
      return;
    }

    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== 'function') {
      window.gtag = function () {
        window.dataLayer.push(arguments);
      };
    }

    window.gtag('js', new Date());
    window.gtag('config', id, {
      send_page_view: false // We trigger virtual page_view on NavigationEnd
    });

    const script = document.createElement('script');
    script.id = 'ga4-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    script.onload = () => {
      this.initialized.set(true);
    };

    document.head.appendChild(script);
  }

  public trackPageView(title: string, url: string) {
    if (!isPlatformBrowser(this.platformId) || !this.measurementId()) return;

    if (typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_title: title,
        page_location: window.location.href,
        page_path: url,
        send_to: this.measurementId()
      });
    }
  }

  private mapItem(item: TrackingItem) {
    return {
      item_id: item.item_id,
      item_name: item.item_name,
      item_category: item.item_category || 'General',
      item_brand: item.item_brand || '3DGalaxy',
      price: item.price,
      quantity: item.quantity || 1
    };
  }

  public trackViewItem(item: TrackingItem) {
    if (!isPlatformBrowser(this.platformId) || !this.measurementId()) return;
    window.gtag('event', 'view_item', {
      currency: item.currency || 'INR',
      value: item.price,
      items: [this.mapItem(item)]
    });
  }

  public trackViewItemList(items: TrackingItem[], listName: string = 'Catalog') {
    if (!isPlatformBrowser(this.platformId) || !this.measurementId()) return;
    window.gtag('event', 'view_item_list', {
      item_list_name: listName,
      items: items.map(i => this.mapItem(i))
    });
  }

  public trackAddToCart(item: TrackingItem, quantity: number = 1) {
    if (!isPlatformBrowser(this.platformId) || !this.measurementId()) return;
    const mapped = this.mapItem({ ...item, quantity });
    window.gtag('event', 'add_to_cart', {
      currency: item.currency || 'INR',
      value: item.price * quantity,
      items: [mapped]
    });
  }

  public trackRemoveFromCart(item: TrackingItem) {
    if (!isPlatformBrowser(this.platformId) || !this.measurementId()) return;
    window.gtag('event', 'remove_from_cart', {
      currency: item.currency || 'INR',
      value: item.price * (item.quantity || 1),
      items: [this.mapItem(item)]
    });
  }

  public trackBeginCheckout(items: TrackingItem[], totalValue: number) {
    if (!isPlatformBrowser(this.platformId) || !this.measurementId()) return;
    window.gtag('event', 'begin_checkout', {
      currency: 'INR',
      value: totalValue,
      items: items.map(i => this.mapItem(i))
    });
  }

  public trackPurchase(orderId: string, items: TrackingItem[], totalValue: number, tax: number = 0, shipping: number = 0) {
    if (!isPlatformBrowser(this.platformId) || !this.measurementId()) return;
    window.gtag('event', 'purchase', {
      transaction_id: orderId,
      value: totalValue,
      tax,
      shipping,
      currency: 'INR',
      items: items.map(i => this.mapItem(i))
    });
  }

  public trackSearch(searchTerm: string) {
    if (!isPlatformBrowser(this.platformId) || !this.measurementId()) return;
    window.gtag('event', 'search', {
      search_term: searchTerm
    });
  }
}
