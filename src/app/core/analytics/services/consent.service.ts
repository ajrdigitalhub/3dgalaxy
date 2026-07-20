import { Injectable, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ConsentCategory, ConsentState } from '../analytics.types';

const STORAGE_KEY = '3dgalaxy_analytics_consent';

const DEFAULT_CONSENT: ConsentState = {
  analytics: true,
  marketing: true,
  functional: true,
  preferences: true,
  updatedAt: new Date().toISOString()
};

@Injectable({
  providedIn: 'root'
})
export class ConsentService {
  private platformId = inject(PLATFORM_ID);
  
  private consentSignal = signal<ConsentState>(this.loadStoredConsent());
  public readonly consentState = this.consentSignal.asReadonly();

  private loadStoredConsent(): ConsentState {
    if (!isPlatformBrowser(this.platformId)) {
      return DEFAULT_CONSENT;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as ConsentState;
      }
    } catch (err) {
      console.warn('[ConsentService] Failed to read consent from localStorage', err);
    }

    return DEFAULT_CONSENT;
  }

  public updateConsent(updates: Partial<Record<ConsentCategory, boolean>>): void {
    const currentState = this.consentSignal();
    const updatedState: ConsentState = {
      ...currentState,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.consentSignal.set(updatedState);
    this.persistConsent(updatedState);
  }

  public grantAll(): void {
    this.updateConsent({
      analytics: true,
      marketing: true,
      functional: true,
      preferences: true
    });
  }

  public denyAll(): void {
    this.updateConsent({
      analytics: false,
      marketing: false,
      functional: true,
      preferences: true
    });
  }

  public hasConsent(category: ConsentCategory): boolean {
    const state = this.consentSignal();
    return !!state[category];
  }

  public getConsentState(): ConsentState {
    return this.consentSignal();
  }

  private persistConsent(state: ConsentState): void {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('[ConsentService] Failed to save consent to localStorage', err);
    }
  }
}
