import { Request, Response, NextFunction } from 'express';
import { logger, maskSensitiveData } from '../utils/logger';

const SLOW_API_THRESHOLD_MS = parseInt(process.env.SLOW_API_THRESHOLD_MS || '1500', 10);

export function httpLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip logging health checks or static asset polling to reduce noise
  if (req.originalUrl === '/api/health' || req.originalUrl.includes('/swagger') || req.originalUrl.includes('/favicon.ico')) {
    return next();
  }

  const startTime = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    const statusCode = res.statusCode;
    const method = req.method;
    const route = req.baseUrl ? `${req.baseUrl}${req.path}` : (req.originalUrl || req.url);
    const requestId = req.requestId || (res.getHeader('X-Request-ID') as string);
    const userId = (req as any).user?.id || (req as any).customer?.id;

    const safeBody = req.body ? maskSensitiveData(req.body) : undefined;
    const safeQuery = req.query ? maskSensitiveData(req.query) : undefined;

    const logContext = {
      requestId,
      userId,
      route,
      method,
      statusCode,
      durationMs,
      metadata: {
        ...(safeQuery && Object.keys(safeQuery).length > 0 ? { query: safeQuery } : {}),
        ...(safeBody && Object.keys(safeBody).length > 0 ? { body: safeBody } : {})
      }
    };

    if (statusCode >= 500) {
      logger.error(`HTTP ${method} ${route} ${statusCode} failed in ${durationMs}ms`, undefined, logContext, {
        errorCode: 'HTTP_SERVER_ERROR',
        module: 'HTTP'
      });
    } else if (durationMs > SLOW_API_THRESHOLD_MS) {
      logger.warn(`Slow API Warning: HTTP ${method} ${route} took ${durationMs}ms (threshold: ${SLOW_API_THRESHOLD_MS}ms)`, logContext, {
        errorCode: 'SLOW_API_RESPONSE',
        module: 'HTTP'
      });
    } else {
      logger.info(`HTTP ${method} ${route} ${statusCode} (${durationMs}ms)`, logContext, {
        module: 'HTTP'
      });
    }
  });

  next();
}
