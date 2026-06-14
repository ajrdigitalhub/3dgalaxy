import {
  ApplicationConfig,
  provideExperimentalZonelessChangeDetection
} from '@angular/core';
import {provideRouter, withComponentInputBinding, withRouterConfig} from '@angular/router';
import {provideClientHydration, withEventReplay} from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';

import {routes} from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideExperimentalZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding(), withRouterConfig({paramsInheritanceStrategy: 'always'})),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch(), withInterceptors([loadingInterceptor]))
  ],
};
