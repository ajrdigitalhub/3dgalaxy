import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, retry, tap, shareReplay } from 'rxjs/operators';
import { environment } from '../../environments/environment';

import { getFriendlyErrorMessage } from '../core/utils/error-handler.util';

export interface ApiResponse<T> {
  success: true;
  message: string;
  data: T;
  pagination?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  private cache = new Map<string, Observable<any>>();
  private inFlightRequests = new Map<string, Observable<any>>();

  clearCache(pattern?: string) {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  private invalidateRelatedCache(endpoint: string) {
    if (endpoint.includes('categor')) {
      this.clearCache('categor');
    } else if (endpoint.includes('brand')) {
      this.clearCache('brand');
    } else if (endpoint.includes('setting')) {
      this.clearCache('setting');
    } else if (endpoint.includes('home') || endpoint.includes('homepage')) {
      this.clearCache('home');
    }
  }

  private handleError(error: HttpErrorResponse) {
    const errorMessage = getFriendlyErrorMessage(error);
    return throwError(() => new Error(errorMessage));
  }

  get<T>(endpoint: string, params?: any, bypassCache = false): Observable<T> {
    const normalizedEndpoint = endpoint.startsWith('/api')
      ? endpoint
      : `/api${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

    const cacheableEndpoints = [
      '/api/settings',
      '/api/categories',
      '/api/brands',
      '/api/home',
      '/api/homepage',
      '/api/public/instagram-feed',
      '/api/service-config'
    ];

    const isCacheable = !bypassCache && cacheableEndpoints.some(e => normalizedEndpoint.startsWith(e));
    const requestKey = `${endpoint}?${params ? JSON.stringify(params) : ''}`;

    if (isCacheable && this.cache.has(requestKey)) {
      return this.cache.get(requestKey) as Observable<T>;
    }

    if (this.inFlightRequests.has(requestKey)) {
      return this.inFlightRequests.get(requestKey) as Observable<T>;
    }

    const headers = this.getHeaders();
    const request$ = this.http.get<T>(`${this.baseUrl}${endpoint}`, { params, headers }).pipe(
      retry({
        count: 3,
        delay: (error, retryCount) => {
          if (error && (error.status === 401 || error.status === 403 || error.status === 404)) {
            return throwError(() => error);
          }
          return timer(Math.pow(2, retryCount) * 500); // Exponential backoff: 1000ms, 2000ms, 4000ms
        }
      }),
      tap({
        next: () => {
          this.inFlightRequests.delete(requestKey);
        },
        error: () => {
          this.inFlightRequests.delete(requestKey);
          if (isCacheable) {
            this.cache.delete(requestKey);
          }
        }
      }),
      catchError(error => {
        this.inFlightRequests.delete(requestKey);
        if (isCacheable) {
          this.cache.delete(requestKey);
        }
        return this.handleError(error);
      }),
      shareReplay({ bufferSize: 1, refCount: !isCacheable })
    );

    this.inFlightRequests.set(requestKey, request$);

    if (isCacheable) {
      this.cache.set(requestKey, request$);
    }

    return request$;
  }

  post<T>(endpoint: string, body: any): Observable<T> {
    this.invalidateRelatedCache(endpoint);
    const headers = this.getHeaders();
    return this.http.post<T>(`${this.baseUrl}${endpoint}`, body, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  put<T>(endpoint: string, body: any): Observable<T> {
    this.invalidateRelatedCache(endpoint);
    const headers = this.getHeaders();
    return this.http.put<T>(`${this.baseUrl}${endpoint}`, body, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  delete<T>(endpoint: string): Observable<T> {
    this.invalidateRelatedCache(endpoint);
    const headers = this.getHeaders();
    return this.http.delete<T>(`${this.baseUrl}${endpoint}`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  patch<T>(endpoint: string, body: any): Observable<T> {
    this.invalidateRelatedCache(endpoint);
    const headers = this.getHeaders();
    return this.http.patch<T>(`${this.baseUrl}${endpoint}`, body, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  private getHeaders() {
    let headers: any = {};
    if (typeof window !== 'undefined') {
      const token =
        localStorage.getItem('access_token') ||
        localStorage.getItem('token') ||
        localStorage.getItem('id_token') ||
        localStorage.getItem('admin_token') ||
        sessionStorage.getItem('access_token') ||
        sessionStorage.getItem('token') ||
        sessionStorage.getItem('id_token');

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        headers['Authorization'] = `Bearer dev-admin-session-token`;
      }
    }
    return headers;
  }
}
