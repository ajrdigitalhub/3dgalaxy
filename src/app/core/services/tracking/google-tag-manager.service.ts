import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MarketingConfig } from '../../models/tracking.model';

@Injectable({
  providedIn: 'root'
})
export class GoogleTagManagerService {
  private platformId = inject(PLATFORM_ID);
  private containerId = signal<string | null>(null);

  public init(config: MarketingConfig) {
    if (!isPlatformBrowser(this.platformId) || !config.enabled || !config.gtmContainerId) {
      return;
    }

    const trimmed = config.gtmContainerId.trim();
    if (!trimmed.startsWith('GTM-')) {
      console.warn(`[GTM] Invalid container ID "${trimmed}". Web GTM container IDs must start with "GTM-". Script injection skipped.`);
      return;
    }

    this.containerId.set(trimmed);
    this.injectGtmScript(trimmed);
  }

  private injectGtmScript(id: string) {
    if (document.getElementById('gtm-script')) return;

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });

    const script = document.createElement('script');
    script.id = 'gtm-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${id}`;
    document.head.appendChild(script);
  }

  public pushToDataLayer(data: any) {
    if (!isPlatformBrowser(this.platformId)) return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(data);
  }
}
