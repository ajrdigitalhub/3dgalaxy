import { HttpInterceptorFn, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap, catchError, throwError } from 'rxjs';
import { LoggerService } from '../services/logger.service';

export const loggingInterceptor: HttpInterceptorFn = (req, next) => {
  const logger = inject(LoggerService);
  const startTime = Date.now();

  // Do not log client log ingestion calls to avoid recursive logging loops
  if (req.url.includes('/logs/client')) {
    return next(req);
  }

  // Generate or propagate X-Request-ID
  let requestId = req.headers.get('X-Request-ID');
  if (!requestId) {
    requestId = 'req_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
  }

  logger.setRequestId(requestId);

  const clonedReq = req.clone({
    headers: req.headers.set('X-Request-ID', requestId)
  });

  return next(clonedReq).pipe(
    tap(event => {
      if (event instanceof HttpResponse) {
        const duration = Date.now() - startTime;
        const respReqId = event.headers.get('X-Request-ID') || requestId;
        if (respReqId) {
          logger.setRequestId(respReqId);
        }

        logger.addBreadcrumb(`API_${req.method}_${event.status}`, 'HTTP', {
          url: req.url,
          durationMs: duration,
          requestId: respReqId
        });
      }
    }),
    catchError((error: HttpErrorResponse) => {
      const duration = Date.now() - startTime;
      const respReqId = error.headers?.get('X-Request-ID') || requestId;

      logger.addBreadcrumb(`API_${req.method}_FAIL_${error.status}`, 'HTTP_ERROR', {
        url: req.url,
        status: error.status,
        durationMs: duration,
        requestId: respReqId
      });

      logger.reportError(
        `API Request Failed: ${req.method} ${req.url} (${error.status})`,
        error,
        {
          url: req.url,
          method: req.method,
          status: error.status,
          statusText: error.statusText,
          durationMs: duration,
          requestId: respReqId,
          apiError: error.error?.message || error.error?.error || error.message
        },
        'API'
      );

      return throwError(() => error);
    })
  );
};
