import { HttpEvent, HttpInterceptorFn } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize, shareReplay } from 'rxjs/operators';

/**
 * In-flight requests registry.
 * Maps request signature to its shared active Observable.
 */
const inFlightRequests = new Map<string, Observable<HttpEvent<unknown>>>();

/**
 * Global HTTP Interceptor for in-flight GET request deduplication.
 * Prevents duplicate identical concurrent HTTP GET calls across the application.
 */
export const deduplicationInterceptor: HttpInterceptorFn = (req, next) => {
  // Only deduplicate safe idempotent GET requests
  if (req.method !== 'GET') {
    return next(req);
  }

  // Generate a distinct request key including query params and relevant auth header
  const authHeader = req.headers.get('Authorization') || '';
  const requestKey = `GET::${req.urlWithParams}::${authHeader}`;

  // If identical request is already in-flight, return the shared observable
  const inFlight = inFlightRequests.get(requestKey);
  if (inFlight) {
    return inFlight;
  }

  // Create shared in-flight observable and cache it while active
  const shared$ = next(req).pipe(
    finalize(() => {
      inFlightRequests.delete(requestKey);
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  inFlightRequests.set(requestKey, shared$);
  return shared$;
};
