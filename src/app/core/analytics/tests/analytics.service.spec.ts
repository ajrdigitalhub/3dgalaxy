import { TestBed } from '@angular/core/testing';
import { AnalyticsService } from '../analytics.service';
import { AnalyticsManager } from '../analytics-manager';
import { ConsentService } from '../services/consent.service';
import { ConfigurationService } from '../services/configuration.service';
import { AnalyticsItem, PurchasePayload } from '../analytics.types';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let managerSpy: jasmine.SpyObj<AnalyticsManager>;

  beforeEach(() => {
    managerSpy = jasmine.createSpyObj('AnalyticsManager', [
      'initializeProviders',
      'dispatchPageView',
      'dispatchEvent',
      'dispatchAddToCart',
      'dispatchCheckout',
      'dispatchPurchase',
      'dispatchLead',
      'dispatchUserProperties'
    ]);

    TestBed.configureTestingModule({
      providers: [
        AnalyticsService,
        ConsentService,
        ConfigurationService,
        { provide: AnalyticsManager, useValue: managerSpy }
      ]
    });

    service = TestBed.inject(AnalyticsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should dispatch page views to AnalyticsManager', () => {
    service.trackPageView('/products/3d-printer', '3D Printer Details');
    expect(managerSpy.dispatchPageView).toHaveBeenCalledWith('/products/3d-printer', '3D Printer Details');
  });

  it('should dispatch add_to_cart events', () => {
    const item: AnalyticsItem = { item_id: '123', item_name: 'PLA Filament', price: 999 };
    service.trackAddToCart(item, 2);
    expect(managerSpy.dispatchAddToCart).toHaveBeenCalledWith(item, 2);
  });

  it('should dispatch purchase events', () => {
    const payload: PurchasePayload = {
      transaction_id: 'ORD-101',
      value: 1999,
      items: [{ item_id: '123', item_name: 'PLA Filament', price: 999, quantity: 2 }]
    };
    service.trackPurchase(payload);
    expect(managerSpy.dispatchPurchase).toHaveBeenCalledWith(payload);
  });

  it('should dispatch AI marketing push notification click events', () => {
    service.trackPushNotificationClick('SUMMER_SALE', '/promo');
    expect(managerSpy.dispatchEvent).toHaveBeenCalledWith('push_notification_click', {
      campaign_id: 'SUMMER_SALE',
      target_link: '/promo'
    });
  });
});
