import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      logger?: ReturnType<typeof logger.child>;
    }
  }
}

export function requestCorrelationMiddleware(req: Request, res: Response, next: NextFunction) {
  // Use incoming X-Request-ID header if available, otherwise generate unique correlation ID
  const incomingId = req.headers['x-request-id'] || req.headers['x-correlation-id'];
  let requestId: string;

  if (incomingId && typeof incomingId === 'string' && incomingId.trim().length > 0) {
    requestId = incomingId.trim();
  } else {
    const dateStr = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 8);
    const randStr = Math.random().toString(36).substring(2, 8);
    requestId = `req_${dateStr}_${randStr}`;
  }

  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  // Attach pre-configured child logger to request object
  req.logger = logger.child({
    requestId,
    route: req.originalUrl || req.url,
    method: req.method
  });

  next();
}
