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
    if (!isPlatformBrowser(this.platformId) || !config.enabled) {
      return;
    }

    const id = config.ga4MeasurementId || 'G-4BKM2K4PS0';
    this.measurementId.set(id);
    this.injectGa4Script(id);
  }

  public isGtmManagingGa4(): boolean {
    return false;
  }

  private injectGa4Script(id: string) {
    const existing = document.getElementById('ga4-script') ||
      document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${id}"]`) ||
      document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=G-4BKM2K4PS0"]`);

    if (existing) {
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
      send_page_view: false // Virtual page_views triggered per navigation
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
      item_id: String(item.item_id || 'PRODUCT'),
      item_name: String(item.item_name || 'Product'),
      item_category: String(item.item_category || 'General'),
      item_brand: String(item.item_brand || '3DGalaxy'),
      price: Number(item.price) || 0,
      quantity: Math.max(1, Math.round(Number(item.quantity) || 1))
    };
  }

  public trackViewItem(item: TrackingItem) {
    if (!isPlatformBrowser(this.platformId) || !this.measurementId()) return;
    const mapped = this.mapItem(item);
    window.gtag('event', 'view_item', {
      currency: item.currency || 'INR',
      value: mapped.price * mapped.quantity,
      items: [mapped],
      send_to: this.measurementId()
    });
  }

  public trackViewItemList(items: TrackingItem[], listName: string = 'Catalog') {
    if (!isPlatformBrowser(this.platformId) || !this.measurementId()) return;
    window.gtag('event', 'view_item_list', {
      item_list_name: listName,
      items: items.map(i => this.mapItem(i)),
      send_to: this.measurementId()
    });
  }

  public trackAddToCart(item: TrackingItem, quantity: number = 1) {
    if (!isPlatformBrowser(this.platformId) || !this.measurementId()) return;
    const mapped = this.mapItem({ ...item, quantity });
    window.gtag('event', 'add_to_cart', {
      currency: item.currency || 'INR',
      value: mapped.price * quantity,
      items: [mapped],
      send_to: this.measurementId()
    });
  }

  public trackRemoveFromCart(item: TrackingItem) {
    if (!isPlatformBrowser(this.platformId) || !this.measurementId()) return;
    const mapped = this.mapItem(item);
    window.gtag('event', 'remove_from_cart', {
      currency: item.currency || 'INR',
      value: mapped.price * (item.quantity || 1),
      items: [mapped],
      send_to: this.measurementId()
    });
  }

  public trackBeginCheckout(items: TrackingItem[], totalValue: number) {
    if (!isPlatformBrowser(this.platformId) || !this.measurementId()) return;
    const mappedItems = items.map(i => this.mapItem(i));
    const itemsSubtotal = mappedItems.reduce((acc, it) => acc + (it.price * it.quantity), 0);
    const val = itemsSubtotal > 0 ? itemsSubtotal : totalValue;

    window.gtag('event', 'begin_checkout', {
      currency: 'INR',
      value: Number(val.toFixed(2)),
      items: mappedItems,
      send_to: this.measurementId()
    });
    window.gtag('event', 'checkout', {
      currency: 'INR',
      value: Number(val.toFixed(2)),
      items: mappedItems,
      send_to: this.measurementId()
    });
  }

  public trackPurchase(orderId: string, items: TrackingItem[], totalValue: number, tax: number = 0, shipping: number = 0) {
    if (!isPlatformBrowser(this.platformId) || !this.measurementId()) return;
    const mappedItems = items.map(i => this.mapItem(i));
    const itemsSubtotal = mappedItems.reduce((acc, it) => acc + (it.price * it.quantity), 0);
    const val = itemsSubtotal > 0 ? itemsSubtotal : totalValue;

    window.gtag('event', 'purchase', {
      transaction_id: orderId,
      value: Number(val.toFixed(2)),
      tax: Number(Number(tax || 0).toFixed(2)),
      shipping: Number(Number(shipping || 0).toFixed(2)),
      currency: 'INR',
      items: mappedItems,
      send_to: this.measurementId()
    });
  }

  public trackSearch(searchTerm: string) {
    if (!isPlatformBrowser(this.platformId) || !this.measurementId()) return;
    window.gtag('event', 'search', {
      search_term: searchTerm,
      send_to: this.measurementId()
    });
  }
}
