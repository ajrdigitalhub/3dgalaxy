import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, retry, tap } from 'rxjs/operators';
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

  get<T>(endpoint: string, params?: any): Observable<T> {
    const headers = this.getHeaders();
    return this.http.get<T>(`${this.baseUrl}${endpoint}`, { params, headers }).pipe(
      retry({
        count: 3,
        delay: (error, retryCount) => timer(1000 * retryCount)
      }),
      catchError(this.handleError),
      tap(res => console.log('GET success'))
    );
  }

  post<T>(endpoint: string, body: any): Observable<T> {
    const headers = this.getHeaders();
    return this.http.post<T>(`${this.baseUrl}${endpoint}`, body, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  put<T>(endpoint: string, body: any): Observable<T> {
    const headers = this.getHeaders();
    return this.http.put<T>(`${this.baseUrl}${endpoint}`, body, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  delete<T>(endpoint: string): Observable<T> {
    const headers = this.getHeaders();
    return this.http.delete<T>(`${this.baseUrl}${endpoint}`, { headers }).pipe(
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
