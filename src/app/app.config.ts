import {
  ApplicationConfig,
  provideExperimentalZonelessChangeDetection,
  provideAppInitializer,
  inject
} from "@angular/core";
import {
  provideRouter,
  withComponentInputBinding,
  withRouterConfig,
  withPreloading,
  withInMemoryScrolling,
} from "@angular/router";
import {
  provideClientHydration,
  withEventReplay,
} from "@angular/platform-browser";
import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from "@angular/common/http";
import { deduplicationInterceptor } from "./core/interceptors/deduplication.interceptor";
import { loadingInterceptor } from "./core/interceptors/loading.interceptor";
import { errorInterceptor } from "./core/interceptors/error.interceptor";
import { apiUrlInterceptor } from "./core/interceptors/api-url.interceptor";
import { authInterceptor } from "./core/interceptors/auth.interceptor";
import { IdlePreloadStrategy } from "./core/strategies/idle-preload.strategy";
import { provideAnalytics } from "./core/analytics";
import { TrackingService } from "./core/services/tracking/tracking.service";

import { ErrorHandler } from "@angular/core";
import { loggingInterceptor } from "./interceptors/logging.interceptor";
import { GlobalErrorHandler } from "./services/global-error-handler";

import { DATE_PIPE_DEFAULT_OPTIONS } from "@angular/common";
import { routes } from "./app.routes";
import { SettingsService } from "./core/services/settings.service";
import { DatastoreService } from "./services/datastore";

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    { provide: DATE_PIPE_DEFAULT_OPTIONS, useValue: { timezone: '+0530' } },
    provideExperimentalZonelessChangeDetection(),
    provideAppInitializer(() => {
      const settingsService = inject(SettingsService);
      settingsService.initSync();
      if (typeof window !== 'undefined') {
        settingsService.loadSettings();
      }
      const datastore = inject(DatastoreService);
      datastore.loadHeaderMenu();
      datastore.loadConsolidatedHome();
    }),
    provideAnalytics({
      enabled: true,
      debugMode: false,
      defaultCurrency: 'INR',
      ga4: {
        measurementId: 'G-4BKM2K4PS0',
        enableEnhancedEcommerce: true
      },
      gtm: {
        containerId: 'GTM-THJDDXCK'
      }
    }),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withRouterConfig({ paramsInheritanceStrategy: "always" }),
      withInMemoryScrolling({
        scrollPositionRestoration: "disabled",
        anchorScrolling: "enabled",
      }),
      withPreloading(IdlePreloadStrategy),
    ),
    provideClientHydration(withEventReplay()),
    provideHttpClient(
      withFetch(),
      withInterceptors([
        loggingInterceptor,
        apiUrlInterceptor,
        errorInterceptor,
        authInterceptor,
        deduplicationInterceptor,
        loadingInterceptor,
      ]),
    ),
  ],
};
