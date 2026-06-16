import {
  ApplicationConfig,
  provideExperimentalZonelessChangeDetection
} from '@angular/core';
import {provideRouter, withComponentInputBinding, withRouterConfig} from '@angular/router';
import {provideClientHydration, withEventReplay} from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { apiUrlInterceptor } from './core/interceptors/api-url.interceptor';
import { authInterceptor } from './core/interceptors/auth.interceptor';

import {routes} from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideExperimentalZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding(), withRouterConfig({paramsInheritanceStrategy: 'always'})),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch(), withInterceptors([apiUrlInterceptor, authInterceptor, loadingInterceptor, errorInterceptor]))
  ],
};
