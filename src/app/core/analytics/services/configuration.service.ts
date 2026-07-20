import { Injectable, signal, WritableSignal } from '@angular/core';
import { AnalyticsConfig } from '../analytics.types';

const DEFAULT_CONFIG: AnalyticsConfig = {
  enabled: true,
  debugMode: false,
  defaultCurrency: 'INR',
  ignoredRoutes: ['/404', '/admin', '/login', '/checkout/success']
};

@Injectable({
  providedIn: 'root'
})
export class ConfigurationService {
  private configSignal: WritableSignal<AnalyticsConfig> = signal<AnalyticsConfig>(DEFAULT_CONFIG);

  public readonly config = this.configSignal.asReadonly();

  public setConfig(config: AnalyticsConfig): void {
    this.configSignal.set({
      ...DEFAULT_CONFIG,
      ...config
    });
  }

  public updateConfig(partial: Partial<AnalyticsConfig>): void {
    this.configSignal.update((curr) => ({
      ...curr,
      ...partial
    }));
  }

  public getConfig(): AnalyticsConfig {
    return this.configSignal();
  }

  public isDebugMode(): boolean {
    return !!this.configSignal().debugMode;
  }

  public isEnabled(): boolean {
    return !!this.configSignal().enabled;
  }
}
