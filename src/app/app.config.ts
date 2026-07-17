import {
  ApplicationConfig,
  provideExperimentalZonelessChangeDetection,
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
import { loadingInterceptor } from "./core/interceptors/loading.interceptor";
import { errorInterceptor } from "./core/interceptors/error.interceptor";
import { apiUrlInterceptor } from "./core/interceptors/api-url.interceptor";
import { authInterceptor } from "./core/interceptors/auth.interceptor";
import { IdlePreloadStrategy } from "./core/strategies/idle-preload.strategy";

import { routes } from "./app.routes";

export const appConfig: ApplicationConfig = {
  providers: [
    provideExperimentalZonelessChangeDetection(),
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
        apiUrlInterceptor,
        errorInterceptor,
        authInterceptor,
        loadingInterceptor,
      ]),
    ),
  ],
};
