import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function globalErrorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const statusCode = err.status || err.statusCode || 500;
  const requestId = req.requestId || (res.getHeader('X-Request-ID') as string) || 'N/A';
  const route = req.originalUrl || req.url;
  const method = req.method;
  const userId = (req as any).user?.id || (req as any).customer?.id;

  const errorMessage = err.message || 'Internal Server Error';
  const errorCode = err.code || err.errorCode || 'UNHANDLED_SERVER_ERROR';

  // Log detailed error stack and context internally
  logger.error(`Unhandled Exception on ${method} ${route}: ${errorMessage}`, err, {
    requestId,
    userId,
    route,
    method,
    statusCode,
    errorCode,
    module: err.module || 'SERVER'
  }, {
    requestId,
    userId,
    route,
    method,
    statusCode,
    errorCode
  });

  // Return clean, safe customer-facing error response
  return res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'development'
      ? (err.message || 'Something went wrong. Please try again.')
      : 'Something went wrong. Please try again.',
    requestId: requestId,
    ...(process.env.NODE_ENV === 'development' ? { errorDetails: err.stack } : {})
  });
}
