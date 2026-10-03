import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { ToastService } from '../../shared/components/toast/toast.service';
import { getFriendlyErrorMessage } from '../utils/error-handler.util';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);

  return next(req).pipe(
    catchError((error) => {
      // Avoid showing duplicate global toasts for mutating operations (POST, PUT, DELETE, PATCH),
      // auth failures (401, 403), or requests with custom error handling in components.
      const isMutatingMethod = req.method !== 'GET';
      const isAuthStatus = error?.status === 401 || error?.status === 403;
      const isExplicitlyHandled = req.headers.has('X-Skip-Global-Error-Toast');

      if (!isMutatingMethod && !isAuthStatus && !isExplicitlyHandled) {
        const errorMessage = getFriendlyErrorMessage(error);
        toastService.error(errorMessage);
      }

      return throwError(() => error);
    })
  );
};
