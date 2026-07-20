import { TestBed } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { AnalyticsService } from '../analytics.service';
import { ScriptLoaderService } from '../services/script-loader.service';
import { MetaPixelService } from '../providers/meta-pixel.service';
import { GoogleAnalyticsService } from '../providers/google-analytics.service';

describe('SSR & Hydration Safety Tests', () => {
  let analyticsService: AnalyticsService;
  let scriptLoader: ScriptLoaderService;
  let metaPixel: MetaPixelService;
  let ga4: GoogleAnalyticsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AnalyticsService,
        ScriptLoaderService,
        MetaPixelService,
        GoogleAnalyticsService,
        { provide: PLATFORM_ID, useValue: 'server' }
      ]
    });

    analyticsService = TestBed.inject(AnalyticsService);
    scriptLoader = TestBed.inject(ScriptLoaderService);
    metaPixel = TestBed.inject(MetaPixelService);
    ga4 = TestBed.inject(GoogleAnalyticsService);
  });

  it('ScriptLoaderService should safely return false on server without throwing DOM error', async () => {
    const loaded = await scriptLoader.loadScript('https://example.com/script.js');
    expect(loaded).toBeFalse();
  });

  it('MetaPixelService should not throw window reference errors on server', async () => {
    const initialized = await metaPixel.init({
      enabled: true,
      meta: { pixelIds: ['123456'] }
    });
    expect(initialized).toBeFalse();
    expect(() => metaPixel.trackPageView('/test')).not.toThrow();
  });

  it('GoogleAnalyticsService should safely handle tracking on server without crashing', async () => {
    const initialized = await ga4.init({
      enabled: true,
      ga4: { measurementId: 'G-123456' }
    });
    expect(initialized).toBeFalse();
    expect(() => ga4.trackEvent('test_event')).not.toThrow();
  });

  it('AnalyticsService facade should execute safely under SSR', () => {
    expect(() => {
      analyticsService.init({ enabled: true });
      analyticsService.trackPageView('/server-rendered-page');
      analyticsService.trackAddToCart({ item_id: '1', item_name: 'Item', price: 100 });
    }).not.toThrow();
  });
});
