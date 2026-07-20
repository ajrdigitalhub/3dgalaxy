import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, retry, tap, shareReplay } from 'rxjs/operators';
import { environment } from '../../environments/environment';

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

  clearCache() {
    this.cache.clear();
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Unknown error!';
    if (error.error instanceof ErrorEvent) {
      // Client-side errors
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side errors
      errorMessage = error.error?.message || error.message || `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  get<T>(endpoint: string, params?: any, bypassCache = false): Observable<T> {
    const cacheableEndpoints = [
      '/api/settings',
      '/api/categories',
      '/api/brands',
      '/api/home',
      '/api/homepage',
      '/api/public/instagram-feed',
      '/api/service-config'
    ];

    const isCacheable = !bypassCache && cacheableEndpoints.some(e => endpoint.startsWith(e));
    const cacheKey = `${endpoint}?${params ? JSON.stringify(params) : ''}`;

    if (isCacheable && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) as Observable<T>;
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
      catchError(error => this.handleError(error)),
      shareReplay(1)
    );

    if (isCacheable) {
      this.cache.set(cacheKey, request$);
    }

    return request$;
  }

  post<T>(endpoint: string, body: any): Observable<T> {
    this.clearCache();
    const headers = this.getHeaders();
    return this.http.post<T>(`${this.baseUrl}${endpoint}`, body, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  put<T>(endpoint: string, body: any): Observable<T> {
    this.clearCache();
    const headers = this.getHeaders();
    return this.http.put<T>(`${this.baseUrl}${endpoint}`, body, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  delete<T>(endpoint: string): Observable<T> {
    this.clearCache();
    const headers = this.getHeaders();
    return this.http.delete<T>(`${this.baseUrl}${endpoint}`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  patch<T>(endpoint: string, body: any): Observable<T> {
    this.clearCache();
    const headers = this.getHeaders();
    return this.http.patch<T>(`${this.baseUrl}${endpoint}`, body, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  private getHeaders() {
    let headers: any = {};
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return headers;
  }
}
