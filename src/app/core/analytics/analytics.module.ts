import { NgModule, ModuleWithProviders, APP_INITIALIZER } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsConfig } from './analytics.types';
import { AnalyticsService } from './analytics.service';
import { ConfigurationService } from './services/configuration.service';

export function initializeAnalytics(analyticsService: AnalyticsService, configService: ConfigurationService, config: AnalyticsConfig) {
  return () => {
    configService.setConfig(config);
    analyticsService.init(config);
  };
}

@NgModule({
  imports: [CommonModule]
})
export class AnalyticsModule {
  static forRoot(config: AnalyticsConfig): ModuleWithProviders<AnalyticsModule> {
    return {
      ngModule: AnalyticsModule,
      providers: [
        {
          provide: 'ANALYTICS_INITIAL_CONFIG',
          useValue: config
        },
        {
          provide: APP_INITIALIZER,
          useFactory: initializeAnalytics,
          deps: [AnalyticsService, ConfigurationService, 'ANALYTICS_INITIAL_CONFIG'],
          multi: true
        }
      ]
    };
  }
}
