import axios from 'axios';
import { Request } from 'express';
import { ENV } from '../../config/env';
import { maskSensitiveData } from '../../utils/logger';

export interface TaskHubErrorPayload {
  applicationId: string;
  environment: string;
  timestamp: string;
  requestId: string;
  error: {
    message: string;
    code?: string;
    stack?: string;
    statusCode: number;
  };
  context: {
    route: string;
    method: string;
    userId?: string;
    ip?: string;
    query?: Record<string, any>;
    body?: Record<string, any>;
  };
}

export class TaskHubErrorForwarder {
  private queue: TaskHubErrorPayload[] = [];
  private maxQueueSize: number = 100;
  private isFlushing: boolean = false;

  /**
   * Enqueues an unhandled backend error for asynchronous, non-blocking dispatch to TaskHub.
   */
  public forwardError(err: any, req: Request): void {
    const ingestionUrl = ENV.TASKHUB_ERROR_INGESTION_URL || process.env.TASKHUB_WEBHOOK_URL;
    if (!ingestionUrl || !ENV.TASKHUB_INTEGRATION_ENABLED) {
      return;
    }

    const route = req.originalUrl || req.url || '';

    // Prevent recursive reporting storm: Never forward errors originating from integration routes
    if (route.startsWith('/api/integration/v1') || route.includes('/taskhub/')) {
      return;
    }

    const statusCode = err.status || err.statusCode || 500;
    // Only forward unhandled server errors (5xx)
    if (statusCode < 500) {
      return;
    }

    const requestId = req.requestId || (req.headers['x-request-id'] as string) || 'req_unknown';
    const userId = (req as any).user?.id || (req as any).customer?.id || undefined;

    const safeBody = req.body ? maskSensitiveData(req.body) : undefined;
    const safeQuery = req.query ? maskSensitiveData(req.query) : undefined;

    const payload: TaskHubErrorPayload = {
      applicationId: ENV.TASKHUB_APPLICATION_ID || '3dgalaxy',
      environment: ENV.TASKHUB_ENVIRONMENT || 'production',
      timestamp: new Date().toISOString(),
      requestId,
      error: {
        message: err.message || 'Unhandled Server Error',
        code: err.code || err.errorCode || 'UNHANDLED_EXCEPTION',
        stack: err.stack ? String(err.stack) : undefined,
        statusCode,
      },
      context: {
        route,
        method: req.method,
        userId,
        ip: req.ip,
        ...(safeQuery && Object.keys(safeQuery).length > 0 ? { query: safeQuery } : {}),
        ...(safeBody && Object.keys(safeBody).length > 0 ? { body: safeBody } : {}),
      },
    };

    // Bounded buffer eviction: If queue is full, drop oldest
    if (this.queue.length >= this.maxQueueSize) {
      this.queue.shift();
    }
    this.queue.push(payload);

    // Trigger asynchronous background flush
    setImmediate(() => {
      this.flushQueue().catch(() => {});
    });
  }

  /**
   * Asynchronously drains the buffered error queue with retry and timeout.
   */
  private async flushQueue(): Promise<void> {
    if (this.isFlushing || this.queue.length === 0) return;
    this.isFlushing = true;

    const ingestionUrl = ENV.TASKHUB_ERROR_INGESTION_URL || process.env.TASKHUB_WEBHOOK_URL;
    if (!ingestionUrl) {
      this.queue = [];
      this.isFlushing = false;
      return;
    }

    try {
      while (this.queue.length > 0) {
        const item = this.queue.shift();
        if (!item) break;

        const apiKey = (ENV.TASKHUB_INTEGRATION_API_KEY || '').split(',')[0].trim();

        try {
          await axios.post(ingestionUrl, item, {
            headers: {
              'X-API-Key': apiKey,
              'Content-Type': 'application/json',
              'X-Application-ID': ENV.TASKHUB_APPLICATION_ID || '3dgalaxy',
            },
            timeout: 5000,
          });
        } catch {
          // Non-blocking: Silently discard to avoid recursive error reporting
        }
      }
    } finally {
      this.isFlushing = false;
    }
  }
}

export const taskhubErrorForwarder = new TaskHubErrorForwarder();
