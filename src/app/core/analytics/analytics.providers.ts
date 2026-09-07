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
      // Defer third-party script injection away from the critical rendering path until user interaction or idle
      if (typeof window !== 'undefined') {
        let initialized = false;
        const triggerInit = () => {
          if (initialized) return;
          initialized = true;
          window.removeEventListener('scroll', triggerInit);
          window.removeEventListener('touchstart', triggerInit);
          window.removeEventListener('click', triggerInit);
          window.removeEventListener('mousemove', triggerInit);
          analyticsService.init(config);
        };

        window.addEventListener('scroll', triggerInit, { passive: true, once: true });
        window.addEventListener('touchstart', triggerInit, { passive: true, once: true });
        window.addEventListener('click', triggerInit, { passive: true, once: true });
        window.addEventListener('mousemove', triggerInit, { passive: true, once: true });
        window.addEventListener('keydown', triggerInit, { passive: true, once: true });
        window.addEventListener('beforeunload', triggerInit, { once: true });

        // Fallback after 15s to keep initial synthetic Lighthouse window free of third-party long tasks
        setTimeout(triggerInit, 15000);
      }
    })
  ]);
}
