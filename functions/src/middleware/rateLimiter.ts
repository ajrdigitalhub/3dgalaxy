import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface RateLimitStore {
  [ip: string]: {
    count: number;
    resetTime: number;
  };
}

/**
 * Creates an in-memory IP rate limiter middleware
 */
export const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  message: string;
  keyPrefix?: string;
}) => {
  const store: RateLimitStore = {};

  // Periodically clean up expired IP entries every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const ip in store) {
      if (store[ip].resetTime < now) {
        delete store[ip];
      }
    }
  }, 5 * 60 * 1000);

  return (req: Request, res: Response, next: NextFunction) => {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    const key = `${options.keyPrefix || 'rl'}:${ip}`;
    const now = Date.now();

    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 1,
        resetTime: now + options.windowMs,
      };
      return next();
    }

    store[key].count += 1;

    if (store[key].count > options.max) {
      logger.warn(
        `Rate limit exceeded: ${options.keyPrefix || 'API'} for IP ${ip}`,
        { ip, url: req.originalUrl, count: store[key].count },
        {
          requestId: (req as any).requestId,
          module: 'SECURITY',
          errorCode: 'RATE_LIMIT_EXCEEDED',
        }
      );

      res.setHeader(
        'Retry-After',
        Math.ceil((store[key].resetTime - now) / 1000)
      );

      return res.status(429).json({
        success: false,
        error: options.message,
        message: options.message,
        requestId: (req as any).requestId,
      });
    }

    next();
  };
};

// Rate limiter presets
export const authLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: 'Too many authentication attempts. Please try again after 1 minute.',
  keyPrefix: 'auth',
});

export const passwordResetLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3,
  message: 'Too many password reset requests. Please try again in 15 minutes.',
  keyPrefix: 'pwd_reset',
});

export const checkoutLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'Too many checkout requests. Please wait a moment before trying again.',
  keyPrefix: 'checkout',
});

export const uploadLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  message: 'File upload rate limit exceeded. Please wait before uploading more files.',
  keyPrefix: 'upload',
});

export const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  message: 'Too many requests. Please slow down.',
  keyPrefix: 'general_api',
});
