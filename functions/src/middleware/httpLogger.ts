import { Request, Response, NextFunction } from 'express';
import { logger, maskSensitiveData, resolveModule, LogEntry } from '../utils/logger';

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
    const requestId = req.requestId || (res.getHeader('X-Request-ID') as string) || (req.headers['x-request-id'] as string);
    const userId = (req as any).user?.id || (req as any).customer?.id;

    const safeBody = req.body ? maskSensitiveData(req.body) : undefined;
    const safeQuery = req.query ? maskSensitiveData(req.query) : undefined;

    const resolvedModule = resolveModule(undefined, route);
    const orderId = (req.params as any)?.orderId || (req.body as any)?.orderId || (req.query as any)?.orderId;
    const paymentId = (req.params as any)?.paymentId || (req.body as any)?.paymentId || (req.query as any)?.paymentId;
    const campaignId = (req.body as any)?.campaignId || (req.query as any)?.campaignId || (req.query as any)?.utm_campaign;

    const entryExtra: Partial<LogEntry> = {
      requestId,
      userId,
      route,
      method,
      statusCode,
      durationMs,
      module: resolvedModule,
      orderId,
      paymentId,
      campaignId,
      source: 'API'
    };

    const meta = {
      ...(safeQuery && Object.keys(safeQuery).length > 0 ? { query: safeQuery } : {}),
      ...(safeBody && Object.keys(safeBody).length > 0 ? { body: safeBody } : {})
    };

    if (statusCode >= 500) {
      logger.error(`HTTP ${method} ${route} ${statusCode} failed in ${durationMs}ms`, undefined, meta, {
        ...entryExtra,
        errorCode: 'HTTP_SERVER_ERROR',
        errorName: 'HttpServerError'
      });
    } else if (durationMs > SLOW_API_THRESHOLD_MS) {
      logger.warn(`Slow API Warning: HTTP ${method} ${route} took ${durationMs}ms (threshold: ${SLOW_API_THRESHOLD_MS}ms)`, meta, {
        ...entryExtra,
        errorCode: 'SLOW_API_RESPONSE'
      });
    } else {
      logger.info(`HTTP ${method} ${route} ${statusCode} (${durationMs}ms)`, meta, entryExtra);
    }
  });

  next();
}
