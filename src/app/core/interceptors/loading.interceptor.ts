import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { LoadingService } from '../services/loading.service';
import { finalize } from 'rxjs/operators';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);
  
  // Skip background requests to avoid interrupting typing or background poll
  const isBackgroundRequest = req.url.includes('/api/search/suggestions') || req.url.includes('/api/search/recent');

  if (!isBackgroundRequest) {
    loadingService.startLoading();
  }

  return next(req).pipe(
    finalize(() => {
      if (!isBackgroundRequest) {
        loadingService.stopLoading();
      }
    })
  );
};

