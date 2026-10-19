import { ENV } from '../../config/env';
import { TaskHubEnvelope } from './taskhub.types';

/**
 * Creates standard success response envelope for TaskHub integration API
 */
export function createSuccessEnvelope<T>(
  data: T,
  resource: string,
  requestId: string,
  pagination?: {
    page?: number | null;
    limit?: number | null;
    total?: number | null;
    hasMore?: boolean;
    nextCursor?: string | null;
  }
): TaskHubEnvelope<T> {
  const isArray = Array.isArray(data);
  return {
    success: true,
    data,
    meta: {
      applicationId: ENV.TASKHUB_APPLICATION_ID || '3dgalaxy',
      environment: ENV.TASKHUB_ENVIRONMENT || 'production',
      resource,
      timestamp: new Date().toISOString(),
      requestId,
      page: pagination?.page !== undefined ? pagination.page : (isArray ? 1 : null),
      limit: pagination?.limit !== undefined ? pagination.limit : (isArray ? (data as any[]).length : null),
      total: pagination?.total !== undefined ? pagination.total : (isArray ? (data as any[]).length : null),
      hasMore: pagination?.hasMore !== undefined ? pagination.hasMore : false,
      nextCursor: pagination?.nextCursor !== undefined ? pagination.nextCursor : null,
    },
    error: null,
  };
}

/**
 * Creates standard error response envelope for TaskHub integration API
 */
export function createErrorEnvelope(
  code: string,
  message: string,
  resource: string,
  requestId: string,
  details: any = null
): TaskHubEnvelope<null> {
  return {
    success: false,
    data: null,
    meta: {
      applicationId: ENV.TASKHUB_APPLICATION_ID || '3dgalaxy',
      environment: ENV.TASKHUB_ENVIRONMENT || 'production',
      resource,
      timestamp: new Date().toISOString(),
      requestId,
      page: null,
      limit: null,
      total: null,
      hasMore: false,
      nextCursor: null,
    },
    error: {
      code,
      message,
      details: details !== undefined ? details : null,
    },
  };
}
