import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { ToastService } from '../../shared/components/toast/toast.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An unexpected error occurred';
      
      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = error.error.message;
      } else {
        // Server-side error
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else {
          switch (error.status) {
            case 400:
              errorMessage = 'Bad Request: Please check your input';
              break;
            case 401:
              errorMessage = 'Unauthorized: Please login again';
              break;
            case 403:
              errorMessage = 'Forbidden: You do not have permission';
              break;
            case 404:
              errorMessage = 'Not Found: The requested resource could not be found';
              break;
            case 500:
              errorMessage = 'Internal Server Error: Please try again later';
              break;
            case 0:
              errorMessage = 'Network Error: Please check your connection';
              break;
          }
        }
      }

      const title = error.status !== 0 ? `Error ${error.status}` : 'Network Error';
      toastService.error(errorMessage, title);
      return throwError(() => error);
    })
  );
};
