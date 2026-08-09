import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface Breadcrumb {
  timestamp: string;
  category: string;
  action: string;
  metadata?: any;
}

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const SENSITIVE_KEYS = [
  'password', 'token', 'accesstoken', 'refreshtoken', 'authorization',
  'cookie', 'otp', 'cvv', 'cardnumber', 'secret', 'apikey', 'firebasetoken'
];

function sanitizeObject(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') {
    if (data.length > 80 && (data.startsWith('Bearer ') || data.includes('.'))) return '[REDACTED_TOKEN]';
    return data;
  }
  if (Array.isArray(data)) return data.map(sanitizeObject);
  if (typeof data === 'object') {
    const clean: any = {};
    for (const k of Object.keys(data)) {
      if (SENSITIVE_KEYS.some(s => k.toLowerCase().includes(s))) {
        clean[k] = '[REDACTED]';
      } else {
        clean[k] = sanitizeObject(data[k]);
      }
    }
    return clean;
  }
  return data;
}

@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private http = inject(HttpClient);
  private breadcrumbs: Breadcrumb[] = [];
  private maxBreadcrumbs = 20;
  private currentRequestId: string | null = null;

  constructor() {
    this.addBreadcrumb('APP_INIT', 'SYSTEM', { isProduction: environment.production });
  }

  public setRequestId(reqId: string) {
    this.currentRequestId = reqId;
  }

  public getRequestId(): string | null {
    return this.currentRequestId;
  }

  /**
   * Add in-memory breadcrumb to track user path leading to an error
   */
  public addBreadcrumb(action: string, category: string = 'USER_FLOW', metadata: any = {}) {
    const entry: Breadcrumb = {
      timestamp: new Date().toISOString(),
      category: category.toUpperCase(),
      action: action.toUpperCase(),
      metadata: sanitizeObject(metadata)
    };

    this.breadcrumbs.push(entry);
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }
  }

  public getBreadcrumbs(): Breadcrumb[] {
    return [...this.breadcrumbs];
  }

  public debug(message: string, metadata: any = {}) {
    if (!environment.production) {
      console.log(`🔍 [DEBUG] ${message}`, sanitizeObject(metadata));
    }
  }

  public info(message: string, metadata: any = {}) {
    if (!environment.production) {
      console.log(`ℹ️ [INFO] ${message}`, sanitizeObject(metadata));
    }
  }

  public warn(message: string, metadata: any = {}) {
    console.warn(`⚠️ [WARN] ${message}`, sanitizeObject(metadata));
  }

  public error(message: string, error?: any, metadata: any = {}) {
    console.error(`❌ [ERROR] ${message}`, error || '', sanitizeObject(metadata));
    this.reportError(message, error, metadata);
  }

  public event(eventName: string, metadata: any = {}) {
    this.addBreadcrumb(eventName, 'EVENT', metadata);
    this.info(`[EVENT] ${eventName}`, metadata);
  }

  /**
   * Transmit client-side error to backend asynchronously
   */
  public reportError(message: string, error?: any, metadata: any = {}, feature: string = 'FRONTEND') {
    try {
      const errStack = error instanceof Error ? error.stack : (typeof error === 'string' ? error : JSON.stringify(error || {}));

      const payload = {
        level: 'ERROR',
        message: message || 'Frontend Client Error',
        requestId: this.currentRequestId || 'client_' + Date.now(),
        route: window.location.pathname,
        feature,
        action: metadata?.action || 'client-error',
        statusCode: metadata?.statusCode || 500,
        metadata: sanitizeObject(metadata),
        breadcrumbs: this.getBreadcrumbs(),
        stack: errStack
      };

      const apiUrl = `${environment.apiUrl}/logs/client`;

      // Use non-blocking fetch to send log payload
      if (typeof fetch !== 'undefined') {
        fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true
        }).catch(() => {});
      }
    } catch {
      // Fail silently to avoid looping on logging failures
    }
  }
}
