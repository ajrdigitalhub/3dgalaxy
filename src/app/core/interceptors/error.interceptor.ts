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
      const errorMessage = getFriendlyErrorMessage(error);
      
      // Let unauthorized and forbidden errors be handled, but don't show duplicate toasts for login failures
      // because the login component already catches and shows it.
      // But for global errors like 500, 404, 0, show the toast immediately.
      toastService.error(errorMessage);
      
      return throwError(() => error);
    })
  );
};
