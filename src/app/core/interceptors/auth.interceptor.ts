import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, throwError } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const http = inject(HttpClient);

  // Skip adding Bearer token or refreshing for auth endpoints themselves
  if (req.url.includes('/auth/login') || req.url.includes('/auth/refresh-token') || req.url.includes('/auth/register') || req.url.includes('/auth/refresh')) {
    return next(req);
  }

  return next(req).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        if (typeof window !== 'undefined') {
          const refreshToken = localStorage.getItem('refresh_token');
          if (refreshToken) {
            if (!isRefreshing) {
              isRefreshing = true;
              refreshTokenSubject.next(null);

              return http.post<{ success: boolean; data?: { accessToken: string; refreshToken?: string }; accessToken?: string; refreshToken?: string }>(
                `${environment.apiUrl}/auth/refresh-token`,
                { token: refreshToken }
              ).pipe(
                switchMap((res) => {
                  isRefreshing = false;
                  
                  // Handle different possible response structures
                  const newAccess = res?.accessToken || res?.data?.accessToken;
                  const newRefresh = res?.refreshToken || res?.data?.refreshToken;

                  if (newAccess) {
                    localStorage.setItem('access_token', newAccess);
                    if (newRefresh) {
                      localStorage.setItem('refresh_token', newRefresh);
                    }
                    refreshTokenSubject.next(newAccess);
                    
                    // Clone the failed request with the newly acquired access token
                    const retryReq = req.clone({
                      headers: req.headers.set('Authorization', `Bearer ${newAccess}`)
                    });
                    return next(retryReq);
                  } else {
                    handleLogout();
                    return throwError(() => error);
                  }
                }),
                catchError((refreshError) => {
                  isRefreshing = false;
                  handleLogout();
                  return throwError(() => refreshError);
                })
              );
            } else {
              // Wait for the active renewal request to finish
              return refreshTokenSubject.pipe(
                filter(token => token !== null),
                take(1),
                switchMap((token) => {
                  const retryReq = req.clone({
                    headers: req.headers.set('Authorization', `Bearer ${token}`)
                  });
                  return next(retryReq);
                })
              );
            }
          } else {
            handleLogout();
          }
        }
      }
      return throwError(() => error);
    })
  );
};

function handleLogout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    // Break out of stale session context
    window.location.reload();
  }
}
