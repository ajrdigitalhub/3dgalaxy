import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ConsentState } from '../../models/tracking.model';

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

@Injectable({
  providedIn: 'root'
})
export class ConsentService {
  private platformId = inject(PLATFORM_ID);

  public consentState = signal<ConsentState>({
    ad_storage: 'granted',
    analytics_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted'
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.initConsentMode();
    }
  }

  private initConsentMode() {
    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== 'function') {
      window.gtag = function () {
        window.dataLayer.push(arguments);
      };
    }

    const saved = localStorage.getItem('3dgalaxy_consent_preferences');
    let state: ConsentState = {
      ad_storage: 'granted',
      analytics_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted'
    };

    if (saved) {
      try {
        state = { ...state, ...JSON.parse(saved) };
      } catch (e) {
        console.warn('Failed to parse saved consent state:', e);
      }
    }

    this.consentState.set(state);

    window.gtag('consent', 'default', {
      ad_storage: state.ad_storage,
      analytics_storage: state.analytics_storage,
      ad_user_data: state.ad_user_data,
      ad_personalization: state.ad_personalization,
      wait_for_update: 500
    });
  }

  public updateConsent(updated: Partial<ConsentState>) {
    const newState: ConsentState = { ...this.consentState(), ...updated };
    this.consentState.set(newState);

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('3dgalaxy_consent_preferences', JSON.stringify(newState));
      if (typeof window.gtag === 'function') {
        window.gtag('consent', 'update', newState);
      }
    }
  }

  public acceptAll() {
    this.updateConsent({
      ad_storage: 'granted',
      analytics_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted'
    });
  }

  public rejectAll() {
    this.updateConsent({
      ad_storage: 'denied',
      analytics_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
  }
}
