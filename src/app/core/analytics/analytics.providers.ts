import { EnvironmentProviders, makeEnvironmentProviders, provideAppInitializer, inject } from '@angular/core';
import { AnalyticsConfig } from './analytics.types';
import { AnalyticsService } from './analytics.service';
import { ConfigurationService } from './services/configuration.service';

export function provideAnalytics(config: AnalyticsConfig): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: 'ANALYTICS_INITIAL_CONFIG',
      useValue: config
    },
    provideAppInitializer(() => {
      const analyticsService = inject(AnalyticsService);
      const configService = inject(ConfigurationService);
      configService.setConfig(config);
      if (typeof window !== 'undefined') {
        // Initialize immediately in the browser so pageviews, route transitions,
        // and immediate ecommerce actions (e.g. direct /checkout navigation or Add to Cart)
        // are fully tracked from the first interaction without a 15-second delay.
        analyticsService.init(config);
      }
    })
  ]);
}
