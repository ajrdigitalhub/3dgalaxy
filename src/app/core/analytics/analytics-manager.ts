import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  AnalyticsProvider,
  AnalyticsConfig,
  AnalyticsItem,
  PurchasePayload,
  CheckoutPayload,
  LeadPayload,
  QueuedEvent
} from './analytics.types';
import { ConfigurationService } from './services/configuration.service';
import { ConsentService } from './services/consent.service';
import { EventQueueService } from './services/event-queue.service';

import { MetaPixelService } from './providers/meta-pixel.service';
import { GoogleAnalyticsService } from './providers/google-analytics.service';
import { GoogleAdsService } from './providers/google-ads.service';
import { GoogleTagManagerService } from './providers/google-tag-manager.service';
import { MicrosoftClarityService } from './providers/microsoft-clarity.service';
import { MicrosoftAdsService } from './providers/microsoft-ads.service';
import { TikTokPixelService } from './providers/tiktok-pixel.service';
import { LinkedInInsightService } from './providers/linkedin-insight.service';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsManager {
  private platformId = inject(PLATFORM_ID);
  private configService = inject(ConfigurationService);
  private consentService = inject(ConsentService);
  private eventQueue = inject(EventQueueService);

  private metaPixel = inject(MetaPixelService);
  private ga4 = inject(GoogleAnalyticsService);
  private googleAds = inject(GoogleAdsService);
  private gtm = inject(GoogleTagManagerService);
  private clarity = inject(MicrosoftClarityService);
  private microsoftAds = inject(MicrosoftAdsService);
  private tikTok = inject(TikTokPixelService);
  private linkedIn = inject(LinkedInInsightService);

  private providers: AnalyticsProvider[] = [];
  private initializedProviders = new Set<string>();

  constructor() {
    this.registerProvider(this.metaPixel);
    this.registerProvider(this.ga4);
    this.registerProvider(this.googleAds);
    this.registerProvider(this.gtm);
    this.registerProvider(this.clarity);
    this.registerProvider(this.microsoftAds);
    this.registerProvider(this.tikTok);
    this.registerProvider(this.linkedIn);
  }

  public registerProvider(provider: AnalyticsProvider): void {
    if (!this.providers.some((p) => p.id === provider.id)) {
      this.providers.push(provider);
    }
  }

  public async initializeProviders(config?: AnalyticsConfig): Promise<void> {
    if (config) {
      this.configService.setConfig(config);
    }

    const currentConfig = this.configService.getConfig();

    if (!currentConfig.enabled) {
      this.logDebug('Analytics Framework Disabled by Configuration');
      return;
    }

    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    for (const provider of this.providers) {
      if (this.consentService.hasConsent(provider.category)) {
        await this.initSingleProvider(provider, currentConfig);
      } else {
        this.logDebug(`[Provider Ignored: Pending Consent] ${provider.name} (${provider.category})`);
      }
    }

    this.flushQueue();
  }

  private async initSingleProvider(provider: AnalyticsProvider, config: AnalyticsConfig): Promise<void> {
    try {
      const success = await provider.init(config);
      if (success) {
        this.initializedProviders.add(provider.id);
        this.logDebug(`[Loaded Provider] ${provider.name} (ID: ${provider.id})`);
      }
    } catch (err) {
      console.error(`[Analytics Error] Failed to initialize provider ${provider.name}`, err);
    }
  }

  public dispatchPageView(url: string, title?: string): void {
    this.broadcast((provider) => provider.trackPageView(url, title), {
      eventType: 'page_view',
      payload: { url, title }
    });
  }

  public dispatchEvent(eventName: string, payload?: Record<string, any>): void {
    this.broadcast((provider) => provider.trackEvent(eventName, payload), {
      eventType: 'event',
      eventName,
      payload
    });
  }

  public dispatchPurchase(payload: PurchasePayload): void {
    this.broadcast((provider) => provider.trackPurchase(payload), {
      eventType: 'purchase',
      payload
    });
  }

  public dispatchAddToCart(item: AnalyticsItem, quantity: number = 1): void {
    this.broadcast((provider) => provider.trackAddToCart(item, quantity), {
      eventType: 'add_to_cart',
      payload: { item, quantity }
    });
  }

  public dispatchCheckout(payload: CheckoutPayload): void {
    this.broadcast((provider) => provider.trackCheckout(payload), {
      eventType: 'checkout',
      payload
    });
  }

  public dispatchLead(payload: LeadPayload): void {
    this.broadcast((provider) => provider.trackLead(payload), {
      eventType: 'lead',
      payload
    });
  }

  public dispatchUserProperties(properties: Record<string, any>): void {
    this.broadcast((provider) => provider.setUserProperties && provider.setUserProperties(properties), {
      eventType: 'user_properties',
      payload: properties
    });
  }

  private broadcast(
    action: (provider: AnalyticsProvider) => void,
    queueable: Omit<QueuedEvent, 'id' | 'timestamp'>
  ): void {
    if (!this.configService.isEnabled()) return;

    let executedCount = 0;

    for (const provider of this.providers) {
      if (this.consentService.hasConsent(provider.category)) {
        if (provider.isInitialized()) {
          try {
            action(provider);
            executedCount++;
            this.logDebug(`[Sent Event] Provider: ${provider.name} | Type: ${queueable.eventType}`, queueable.payload);
          } catch (err) {
            console.error(`[Analytics Error] Provider ${provider.name} failed sending event`, err);
          }
        }
      }
    }

    if (executedCount === 0) {
      this.logDebug(`[Queueing Event] No ready providers for type: ${queueable.eventType}`, queueable.payload);
      this.eventQueue.enqueue(queueable);
    }
  }

  public flushQueue(): void {
    this.eventQueue.flush((queuedEvent) => {
      let processed = false;

      for (const provider of this.providers) {
        if (this.consentService.hasConsent(provider.category) && provider.isInitialized()) {
          switch (queuedEvent.eventType) {
            case 'page_view':
              provider.trackPageView(queuedEvent.payload.url, queuedEvent.payload.title);
              break;
            case 'event':
              provider.trackEvent(queuedEvent.eventName!, queuedEvent.payload);
              break;
            case 'purchase':
              provider.trackPurchase(queuedEvent.payload);
              break;
            case 'add_to_cart':
              provider.trackAddToCart(queuedEvent.payload.item, queuedEvent.payload.quantity);
              break;
            case 'checkout':
              provider.trackCheckout(queuedEvent.payload);
              break;
            case 'lead':
              provider.trackLead(queuedEvent.payload);
              break;
            case 'user_properties':
              if (provider.setUserProperties) provider.setUserProperties(queuedEvent.payload);
              break;
          }
          processed = true;
        }
      }

      if (processed) {
        this.logDebug(`[Replayed Event] Replayed buffered event ${queuedEvent.id} (${queuedEvent.eventType})`);
      }

      return processed;
    });
  }

  private logDebug(message: string, payload?: any): void {
    if (this.configService.isDebugMode()) {
      console.log(
        `%c[3DGalaxy Analytics Manager]%c ${message}`,
        'background: #1e1b4b; color: #818cf8; font-weight: bold; padding: 2px 6px; border-radius: 4px;',
        'color: #06b6d4;',
        payload || ''
      );
    }
  }
}
