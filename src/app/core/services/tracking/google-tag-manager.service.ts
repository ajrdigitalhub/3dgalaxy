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

    this.containerId.set(config.gtmContainerId);
    this.injectGtmScript(config.gtmContainerId);
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
