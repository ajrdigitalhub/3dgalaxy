import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { LoadingService } from '../services/loading.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);
  
  // Allow skipping the global loader by passing a specific header
  if (req.headers.has('X-Skip-Loading')) {
    const clonedReq = req.clone({ headers: req.headers.delete('X-Skip-Loading') });
    return next(clonedReq);
  }

  loadingService.startLoading();

  try {
    return next(req).pipe(
      finalize(() => {
        loadingService.stopLoading();
      })
    );
  } catch (error) {
    loadingService.stopLoading();
    throw error;
  }
};
